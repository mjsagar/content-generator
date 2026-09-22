import { db } from '@/prisma/db';
import { getLatestTrends } from '@/lib/services/trends';
import { brainstormNiches, generateContent } from '@/lib/services/groq';
import { isTopicSimilar } from '@/lib/services/image';

/**
  * Checks whether a topic is similar or duplicate to any existing page.
  */
function isTopicDuplicate(topic: string, existingTitles: string[]): boolean {
  for (const existingTitle of existingTitles) {
    if (isTopicSimilar(topic, existingTitle)) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts all image URLs currently embedded in pages to prevent image reuse.
 */
function extractUsedImageUrls(pages: { content: string }[]): Set<string> {
  const used = new Set<string>();
  for (const page of pages) {
    if (!page.content) continue;
    const matches = page.content.matchAll(/<img[^>]+src="([^">]+)"/g);
    for (const match of matches) {
      if (match[1]) used.add(match[1]);
    }
  }
  return used;
}

export interface GenerationJobResult {
  generated: { title: string; slug: string; type: 'trend' | 'niche'; category?: string }[];
  skipped: { title: string; reason: string }[];
  error?: string;
}

export async function runContentGenerationJob(): Promise<GenerationJobResult> {
  console.log('--- Starting Content Generation Job ---');

  const result: GenerationJobResult = {
    generated: [],
    skipped: []
  };

  try {
    // Load all existing pages for duplicate and image reuse checking
    const existingPages = await db.orm.public.Page.all();
    const existingTitles = existingPages.map(p => p.title);
    const usedImages = extractUsedImageUrls(existingPages);

    console.log('Fetching latest UK trends...');
    const trends = await getLatestTrends();

    let selectedTrend: string | null = null;
    for (const trend of trends) {
      // Check exact title match
      if (existingTitles.includes(trend)) {
        result.skipped.push({ title: trend, reason: 'Exact title already exists' });
        continue;
      }

      // Check topical/fuzzy duplicate
      if (isTopicDuplicate(trend, existingTitles)) {
        console.log(`Skipping duplicate topic: "${trend}" (similar article already exists)`);
        result.skipped.push({ title: trend, reason: 'Topical duplicate of existing article' });
        continue;
      }

      selectedTrend = trend;
      break;
    }

    if (selectedTrend) {
      console.log(`Generating content for new trend: "${selectedTrend}"`);
      const generatedTrend = await generateContent(selectedTrend, 'trend', usedImages);

      // Final slug + similarity check before insertion
      const existingSlug = await db.orm.public.Page.where({ slug: generatedTrend.slug }).first();
      const isDuplicate = isTopicDuplicate(generatedTrend.title, existingTitles);

      if (!existingSlug && !isDuplicate) {
        await db.orm.public.Page.create({
          title: generatedTrend.title,
          slug: generatedTrend.slug,
          content: generatedTrend.content,
          type: 'trend',
          category: generatedTrend.category
        });
        console.log(`Saved new trend page: /${generatedTrend.slug} [${generatedTrend.category}]`);
        existingTitles.push(generatedTrend.title);
        result.generated.push({ title: generatedTrend.title, slug: generatedTrend.slug, type: 'trend', category: generatedTrend.category });
      } else {
        console.log(`Duplicate detected for trend: "${generatedTrend.title}", skipping insertion.`);
        result.skipped.push({ title: generatedTrend.title, reason: 'Generated slug or topic duplicate' });
      }
    } else {
      console.log('No new trends found to generate.');
    }

    console.log('Brainstorming niches...');
    const niches = await brainstormNiches(existingTitles);

    let selectedNiche: string | null = null;
    for (const niche of niches) {
      // Check exact title match
      if (existingTitles.includes(niche)) {
        result.skipped.push({ title: niche, reason: 'Exact title already exists' });
        continue;
      }

      // Check topical/fuzzy duplicate
      if (isTopicDuplicate(niche, existingTitles)) {
        console.log(`Skipping duplicate niche: "${niche}" (similar article already exists)`);
        result.skipped.push({ title: niche, reason: 'Topical duplicate of existing article' });
        continue;
      }

      selectedNiche = niche;
      break;
    }

    if (selectedNiche) {
      console.log(`Generating content for new niche: "${selectedNiche}"`);
      const generatedNiche = await generateContent(selectedNiche, 'niche', usedImages);

      // Final slug + similarity check before insertion
      const existingSlug = await db.orm.public.Page.where({ slug: generatedNiche.slug }).first();
      const isDuplicate = isTopicDuplicate(generatedNiche.title, existingTitles);

      if (!existingSlug && !isDuplicate) {
        await db.orm.public.Page.create({
          title: generatedNiche.title,
          slug: generatedNiche.slug,
          content: generatedNiche.content,
          type: 'niche',
          category: generatedNiche.category
        });
        console.log(`Saved new niche page: /${generatedNiche.slug} [${generatedNiche.category}]`);
        result.generated.push({ title: generatedNiche.title, slug: generatedNiche.slug, type: 'niche', category: generatedNiche.category });
      } else {
        console.log(`Duplicate detected for niche: "${generatedNiche.title}", skipping insertion.`);
        result.skipped.push({ title: generatedNiche.title, reason: 'Generated slug or topic duplicate' });
      }
    } else {
      console.log('No new niches found to generate.');
    }

    return result;
  } catch (error: any) {
    console.error('Error during content generation job:', error);
    result.error = error?.message || 'Unknown generation error';
    return result;
  } finally {
    console.log('--- Finished Content Generation Job ---');
  }
}
