'use server';

import { db } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { runContentGenerationJob } from '@/lib/jobs/runner';
import { sanitizeHtml } from '@/lib/utils/content';
import { isTopicSimilar, getTopicImage } from '@/lib/services/image';
import {
  listAvailableGroqModels,
  getSelectedGroqModels,
  setSelectedGroqModels,
  GroqModelInfo
} from '@/lib/services/groq';
import type { Models } from '@/prisma/contract.d';

export interface ActionResult {
  success: boolean;
  message: string;
  details?: string;
}

export async function fetchGroqModelsAction(): Promise<{
  success: boolean;
  models: GroqModelInfo[];
  selectedModels: string[];
  rotationIndex: number;
  message?: string;
}> {
  try {
    const models = await listAvailableGroqModels();
    const selectedModels = await getSelectedGroqModels();
    const rotationConfig = await db.orm.public.Config.where({ key: 'GROQ_MODEL_ROTATION_INDEX' }).first();
    const rotationIndex = parseInt(rotationConfig?.value || '0', 10) || 0;

    return {
      success: true,
      models,
      selectedModels,
      rotationIndex
    };
  } catch (error: any) {
    return {
      success: false,
      models: [],
      selectedModels: [],
      rotationIndex: 0,
      message: error?.message || 'Failed to fetch Groq models'
    };
  }
}

export async function updateSelectedGroqModelsAction(models: string[]): Promise<ActionResult> {
  if (!Array.isArray(models) || models.length === 0) {
    return {
      success: false,
      message: 'Please select at least one Groq LLM for article generation.'
    };
  }

  try {
    await setSelectedGroqModels(models);
    revalidatePath('/admin');
    return {
      success: true,
      message: `Active LLM rotation updated successfully! (${models.length} model${models.length === 1 ? '' : 's'} in sequence)`,
      details: models.join(' ➔ ')
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update LLM selection: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function updateIntervalAction(intervalStr: string): Promise<ActionResult> {
  const interval = parseInt(intervalStr, 10);
  if (isNaN(interval) || interval < 5) {
    return {
      success: false,
      message: 'Interval must be a valid number of at least 5 minutes.'
    };
  }

  try {
    const existing = await db.orm.public.Config.where({ key: 'GENERATION_INTERVAL_MINUTES' }).first();
    if (existing) {
      await db.orm.public.Config.where({ key: 'GENERATION_INTERVAL_MINUTES' }).update({ value: interval.toString() });
    } else {
      await db.orm.public.Config.create({ key: 'GENERATION_INTERVAL_MINUTES', value: interval.toString() });
    }

    revalidatePath('/admin');
    return {
      success: true,
      message: `Generation interval updated to ${interval} minutes.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update interval: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function triggerManualGenerationAction(): Promise<ActionResult> {
  try {
    const result = await runContentGenerationJob();

    revalidatePath('/admin');
    revalidatePath('/');

    if (result.error) {
      return {
        success: false,
        message: `Generation job encountered an error: ${result.error}`
      };
    }

    if (result.generated.length === 0) {
      const skipReasons = result.skipped.map(s => `"${s.title}" (${s.reason})`).join(', ');
      return {
        success: true,
        message: 'Generation completed: No new articles were created.',
        details: skipReasons ? `Skipped topics: ${skipReasons}` : 'All candidate topics already exist or are duplicate.'
      };
    }

    const createdList = result.generated.map(g => `"${g.title}" [${g.type}]${g.modelUsed ? ` via ${g.modelUsed}` : ''}`).join(', ');
    return {
      success: true,
      message: `Successfully generated ${result.generated.length} new article(s)!`,
      details: createdList
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to trigger content generation: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function cleanAllArticlesAction(): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const allPages = await db.orm.public.Page.all();
    let updatedCount = 0;

    for (const p of allPages) {
      const cleaned = sanitizeHtml(p.content, p.title, p.type);
      if (cleaned !== p.content) {
        await db.orm.public.Page.where({ id: p.id }).update({ content: cleaned });
        updatedCount++;
      }
    }

    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      message: updatedCount > 0
        ? `Cleaned and sanitized ${updatedCount} of ${allPages.length} articles.`
        : `All ${allPages.length} articles are already clean and properly formatted.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to sanitize articles: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function deduplicateArticlesAction(): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const allPages = await db.orm.public.Page.all();
    const keptPages: Models.public_Page[] = [];
    const idsToDelete: string[] = [];

    for (const page of allPages) {
      const duplicateIndex = keptPages.findIndex(k => isTopicSimilar(page.title, k.title));
      if (duplicateIndex !== -1) {
        const existing = keptPages[duplicateIndex];
        if (page.views > existing.views) {
          idsToDelete.push(existing.id);
          keptPages[duplicateIndex] = page;
        } else {
          idsToDelete.push(page.id);
        }
      } else {
        keptPages.push(page);
      }
    }

    if (idsToDelete.length > 0) {
      await db.orm.public.Page.where(p => p.id.in(idsToDelete)).delete();
    }

    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      message: idsToDelete.length > 0
        ? `Removed ${idsToDelete.length} duplicate article(s). Total unique articles: ${keptPages.length}.`
        : `No duplicates found across all ${allPages.length} articles.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to deduplicate articles: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function makeImagesUniqueAction(): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const allPages = await db.orm.public.Page.all();
    const seenImages = new Set<string>();
    let updatedCount = 0;

    for (const page of allPages) {
      const imgMatch = page.content.match(/<img[^>]+src="([^">]+)"/);
      const currentImg = imgMatch ? imgMatch[1] : null;

      if (!currentImg || seenImages.has(currentImg)) {
        const freshImage = await getTopicImage(page.title, page.type, seenImages);
        seenImages.add(freshImage);

        let newContent = page.content;
        if (currentImg) {
          newContent = newContent.replace(currentImg, freshImage);
        } else {
          newContent = `<img src="${freshImage}" alt="${page.title}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />\n` + newContent;
        }
        await db.orm.public.Page.where({ id: page.id }).update({ content: newContent });
        updatedCount++;
      } else {
        seenImages.add(currentImg);
      }
    }

    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      message: updatedCount > 0
        ? `Replaced duplicate images on ${updatedCount} article(s). Every article now has a unique image.`
        : `All ${allPages.length} articles already have unique images!`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to fix duplicate images: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function reResolveAllImagesAction(): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const allPages = await db.orm.public.Page.all();
    const seenImages = new Set<string>();

    for (const page of allPages) {
      const freshImage = await getTopicImage(page.title, page.type, seenImages);
      seenImages.add(freshImage);

      const imgMatch = page.content.match(/<img[^>]+src="([^">]+)"/);
      let newContent = page.content;
      if (imgMatch) {
        newContent = newContent.replace(imgMatch[1], freshImage);
      } else {
        newContent = `<img src="${freshImage}" alt="${page.title}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />\n` + newContent;
      }
      await db.orm.public.Page.where({ id: page.id }).update({ content: newContent });
    }

    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      message: `Successfully re-resolved high-relevance, free-to-use images for all ${allPages.length} articles.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to re-resolve images: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function refreshArticleImageAction(id: string): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const page = await db.orm.public.Page.where({ id }).first();
    if (!page) {
      return { success: false, message: 'Article not found.' };
    }

    const freshImage = await getTopicImage(page.title, page.type);
    const imgMatch = page.content.match(/<img[^>]+src="([^">]+)"/);
    let newContent = page.content;
    if (imgMatch) {
      newContent = newContent.replace(imgMatch[1], freshImage);
    } else {
      newContent = `<img src="${freshImage}" alt="${page.title}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />\n` + newContent;
    }
    await db.orm.public.Page.where({ id: page.id }).update({ content: newContent });

    revalidatePath('/admin');
    revalidatePath(`/${page.slug}`);
    revalidatePath('/');

    return {
      success: true,
      message: `Updated image for "${page.title}" to a verified relevant, free-to-use photo.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update image: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const page = await db.orm.public.Page.where({ id }).first();
    if (!page) {
      return { success: false, message: 'Article not found.' };
    }

    await db.orm.public.Page.where({ id }).delete();

    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      message: `Deleted article "${page.title}".`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to delete article: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function deleteAllArticlesAction(): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const allPages = await db.orm.public.Page.all();
    const count = allPages.length;

    for (const p of allPages) {
      await db.orm.public.Page.where({ id: p.id }).delete();
    }

    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      message: `Permanently deleted all ${count} articles from the database.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to delete all articles: ${error?.message || 'Unknown error'}`
    };
  }
}

export async function categorizeAllArticlesAction(): Promise<ActionResult> {
  if (!process.env.DATABASE_URL) {
    return { success: false, message: 'Database connection is not configured.' };
  }

  try {
    const { inferArticleCategory } = await import('@/lib/services/category');
    const allPages = await db.orm.public.Page.all();
    let updatedCount = 0;

    for (const page of allPages) {
      const category = inferArticleCategory(page.title, page.content);
      if (page.category !== category) {
        await db.orm.public.Page.where({ id: page.id }).update({ category });
        updatedCount++;
      }
    }

    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      message: `Categorized all ${allPages.length} articles! (${updatedCount} updated).`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to categorize articles: ${error?.message || 'Unknown error'}`
    };
  }
}

