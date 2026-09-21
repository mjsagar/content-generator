import { db } from '@/prisma/db';
import { getLatestTrends } from '@/lib/services/trends';
import { brainstormNiches, generateContent } from '@/lib/services/groq';
import { extractCoreSubject } from '@/lib/services/image';

/**
 * Checks whether a topic is a duplicate of an existing page by comparing
 * the core subject extracted from titles. This catches near-duplicates like
 * "Inside Gracie Mansion: History..." vs "Inside Gracie Mansion: NYC's Historic..."
 */
async function isTopicDuplicate(topic: string, existingPages: { title: string; slug: string }[]): Promise<boolean> {
  const topicCore = extractCoreSubject(topic).toLowerCase();
  if (!topicCore || topicCore.length < 3) return false;

  for (const page of existingPages) {
    const existingCore = extractCoreSubject(page.title).toLowerCase();
    if (!existingCore) continue;

    // Exact core subject match
    if (topicCore === existingCore) return true;

    // One core subject contains the other (e.g. "Gracie Mansion" within "Gracie Mansion NYC")
    if (topicCore.includes(existingCore) || existingCore.includes(topicCore)) return true;
  }

  return false;
}

export async function runContentGenerationJob() {
  console.log('--- Starting Content Generation Job ---');

  try {
    // Load all existing pages once for duplicate checking
    const existingPages = await db.orm.public.Page.all();
    const existingTitlesAndSlugs = existingPages.map(p => ({ title: p.title, slug: p.slug }));

    console.log('Fetching latest UK trends...');
    const trends = await getLatestTrends();

    let selectedTrend: string | null = null;
    for (const trend of trends) {
      // Check exact title match
      const exactMatch = existingPages.find(p => p.title === trend);
      if (exactMatch) continue;

      // Check fuzzy/topical duplicate
      if (await isTopicDuplicate(trend, existingTitlesAndSlugs)) {
        console.log(`Skipping duplicate topic: "${trend}" (similar article already exists)`);
        continue;
      }

      selectedTrend = trend;
      break;
    }

    if (selectedTrend) {
      console.log(`Generating content for new trend: "${selectedTrend}"`);
      const generatedTrend = await generateContent(selectedTrend, 'trend');

      // Final slug + fuzzy check before insertion
      const existingSlug = await db.orm.public.Page.where({ slug: generatedTrend.slug }).first();
      const isDuplicate = await isTopicDuplicate(generatedTrend.title, existingTitlesAndSlugs);

      if (!existingSlug && !isDuplicate) {
        await db.orm.public.Page.create({
          title: generatedTrend.title,
          slug: generatedTrend.slug,
          content: generatedTrend.content,
          type: 'trend'
        });
        console.log(`Saved new trend page: /${generatedTrend.slug}`);
        // Update our local list so niche check also sees this new page
        existingTitlesAndSlugs.push({ title: generatedTrend.title, slug: generatedTrend.slug });
      } else {
        console.log(`Duplicate detected for trend: "${generatedTrend.title}", skipping insertion.`);
      }
    } else {
      console.log('No new trends found to generate.');
    }

    console.log('Brainstorming niches...');
    const niches = await brainstormNiches();

    let selectedNiche: string | null = null;
    for (const niche of niches) {
      // Check exact title match
      const exactMatch = existingPages.find(p => p.title === niche);
      if (exactMatch) continue;

      // Check fuzzy/topical duplicate
      if (await isTopicDuplicate(niche, existingTitlesAndSlugs)) {
        console.log(`Skipping duplicate niche: "${niche}" (similar article already exists)`);
        continue;
      }

      selectedNiche = niche;
      break;
    }

    if (selectedNiche) {
      console.log(`Generating content for new niche: "${selectedNiche}"`);
      const generatedNiche = await generateContent(selectedNiche, 'niche');

      // Final slug + fuzzy check before insertion
      const existingSlug = await db.orm.public.Page.where({ slug: generatedNiche.slug }).first();
      const isDuplicate = await isTopicDuplicate(generatedNiche.title, existingTitlesAndSlugs);

      if (!existingSlug && !isDuplicate) {
        await db.orm.public.Page.create({
          title: generatedNiche.title,
          slug: generatedNiche.slug,
          content: generatedNiche.content,
          type: 'niche'
        });
        console.log(`Saved new niche page: /${generatedNiche.slug}`);
      } else {
        console.log(`Duplicate detected for niche: "${generatedNiche.title}", skipping insertion.`);
      }
    } else {
      console.log('No new niches found to generate.');
    }

  } catch (error) {
    console.error('Error during content generation job:', error);
  } finally {
    console.log('--- Finished Content Generation Job ---');
  }
}
