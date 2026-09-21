import { db } from '@/prisma/db';
import { getLatestTrends } from '@/lib/services/trends';
import { brainstormNiches, generateContent } from '@/lib/services/groq';

export async function runContentGenerationJob() {
  console.log('--- Starting Content Generation Job ---');

  try {
    console.log('Fetching latest trends...');
    const trends = await getLatestTrends();

    let selectedTrend: string | null = null;
    for (const trend of trends) {
      const existing = await db.orm.public.Page.where({ title: trend }).first();
      if (!existing) {
        selectedTrend = trend;
        break;
      }
    }

    if (selectedTrend) {
      console.log(`Generating content for new trend: "${selectedTrend}"`);
      const generatedTrend = await generateContent(selectedTrend, 'trend');

      const existingSlug = await db.orm.public.Page.where({ slug: generatedTrend.slug }).first();
      if (!existingSlug) {
        await db.orm.public.Page.create({
          title: generatedTrend.title,
          slug: generatedTrend.slug,
          content: generatedTrend.content,
          type: 'trend'
        });
        console.log(`Saved new trend page: /${generatedTrend.slug}`);
      } else {
        console.log(`Slug already exists for trend: ${generatedTrend.slug}, skipping insertion.`);
      }
    } else {
      console.log('No new trends found to generate.');
    }

    console.log('Brainstorming niches...');
    const niches = await brainstormNiches();

    let selectedNiche: string | null = null;
    for (const niche of niches) {
      const existing = await db.orm.public.Page.where({ title: niche }).first();
      if (!existing) {
        selectedNiche = niche;
        break;
      }
    }

    if (selectedNiche) {
      console.log(`Generating content for new niche: "${selectedNiche}"`);
      const generatedNiche = await generateContent(selectedNiche, 'niche');

      const existingSlug = await db.orm.public.Page.where({ slug: generatedNiche.slug }).first();
      if (!existingSlug) {
        await db.orm.public.Page.create({
          title: generatedNiche.title,
          slug: generatedNiche.slug,
          content: generatedNiche.content,
          type: 'niche'
        });
        console.log(`Saved new niche page: /${generatedNiche.slug}`);
      } else {
        console.log(`Slug already exists for niche: ${generatedNiche.slug}, skipping insertion.`);
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
