import { db } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { runContentGenerationJob } from '@/lib/jobs/runner';
import { sanitizeHtml } from '@/lib/utils/content';
import { isTopicSimilar, getTopicImage } from '@/lib/services/image';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const pages = process.env.DATABASE_URL ? await db.orm.public.Page.all() : [];

  const totalViews = pages.reduce((sum: number, page: any) => sum + page.views, 0);
  const totalRevenue = pages.reduce((sum: number, page: any) => sum + page.revenue, 0);
  const totalTrends = pages.filter((p: any) => p.type === 'trend').length;
  const totalNiches = pages.filter((p: any) => p.type === 'niche').length;

  let config = null;
  if (process.env.DATABASE_URL) {
    config = await db.orm.public.Config.where({ key: 'GENERATION_INTERVAL_MINUTES' }).first();
    if (!config) {
      config = await db.orm.public.Config.create({
        key: 'GENERATION_INTERVAL_MINUTES',
        value: '60'
      });
    }
  }

  async function updateInterval(formData: FormData) {
    'use server';
    const interval = formData.get('interval') as string;
    if (interval && !isNaN(Number(interval))) {
      await db.orm.public.Config.where({ key: 'GENERATION_INTERVAL_MINUTES' }).update({ value: interval });
      revalidatePath('/admin');
    }
  }

  async function triggerManualGeneration() {
    'use server';
    await runContentGenerationJob();
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function cleanAllArticles() {
    'use server';
    if (!process.env.DATABASE_URL) return;
    const allPages = await db.orm.public.Page.all();

    const updatePromises = [];
    for (const p of allPages) {
      const cleaned = sanitizeHtml(p.content, p.title, p.type);
      if (cleaned !== p.content) {
        updatePromises.push(db.orm.public.Page.where({ id: p.id }).update({ content: cleaned }));
      }
    }
    await Promise.all(updatePromises);

    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function deduplicateArticles() {
    'use server';
    if (!process.env.DATABASE_URL) return;
    const allPages = await db.orm.public.Page.all();

    const keptPages: any[] = [];
    const idsToDelete: string[] = [];

    for (const page of allPages) {
      const duplicateIndex = keptPages.findIndex(k => isTopicSimilar(page.title, k.title));
      if (duplicateIndex !== -1) {
        const existing = keptPages[duplicateIndex];
        // Keep the one with more views or older creation
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
  }

  async function makeImagesUnique() {
    'use server';
    if (!process.env.DATABASE_URL) return;
    const allPages = await db.orm.public.Page.all();

    const seenImages = new Set<string>();
    for (const page of allPages) {
      const imgMatch = page.content.match(/<img[^>]+src="([^">]+)"/);
      const currentImg = imgMatch ? imgMatch[1] : null;

      if (!currentImg || seenImages.has(currentImg)) {
        // This image was already used on another page or missing; assign a fresh unique one!
        const freshImage = await getTopicImage(page.title, page.type, seenImages);
        seenImages.add(freshImage);

        let newContent = page.content;
        if (currentImg) {
          newContent = newContent.replace(currentImg, freshImage);
        } else {
          newContent = `<img src="${freshImage}" alt="${page.title}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />\n` + newContent;
        }
        await db.orm.public.Page.where({ id: page.id }).update({ content: newContent });
      } else {
        seenImages.add(currentImg);
      }
    }
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function deleteAllArticles() {
    'use server';
    if (!process.env.DATABASE_URL) return;
    const allPages = await db.orm.public.Page.all();
    for (const p of allPages) {
      await db.orm.public.Page.where({ id: p.id }).delete();
    }
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function deleteArticle(formData: FormData) {
    'use server';
    if (!process.env.DATABASE_URL) return;
    const id = formData.get('id') as string;
    if (id) {
      await db.orm.public.Page.where({ id }).delete();
      revalidatePath('/admin');
      revalidatePath('/');
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-12">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Admin Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Views</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalViews.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Est. Revenue</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Trend Pages</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalTrends}</p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Niche Pages</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalNiches}</p>
        </div>
      </div>

      {/* Configuration Section */}
      <section className="mb-12 p-6 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Settings</h2>
        <form action={updateInterval} className="flex flex-col sm:flex-row items-end gap-4 max-w-md">
          <div className="flex-1 w-full">
            <label htmlFor="interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Generation Interval (Minutes)
            </label>
            <input
              type="number"
              name="interval"
              id="interval"
              defaultValue={config?.value || '60'}
              min="5"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-4 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors"
          >
            Save
          </button>
        </form>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          This controls how often the background job runs to discover new trends/niches and generate content.
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Content Management</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trigger instant content generation or sanitize all existing articles (fixes literal \n escapes and broken images).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <form action={cleanAllArticles}>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>🧹</span> Sanitize All Articles
              </button>
            </form>
            <form action={deduplicateArticles}>
              <button
                type="submit"
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>🔍</span> Deduplicate Articles
              </button>
            </form>
            <form action={makeImagesUnique}>
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>🖼️</span> Fix Duplicate Images
              </button>
            </form>
            <form action={triggerManualGeneration}>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>⚡</span> Run Generation Now
              </button>
            </form>
            <form action={deleteAllArticles}>
              <button
                type="submit"
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>🗑️</span> Delete All
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Recent Pages Table */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">All Pages Overview</h2>
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {pages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50).map((page: any) => (
                <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{page.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${page.type === 'trend' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}`}>
                      {page.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{page.views}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${page.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(page.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <form action={deleteArticle}>
                      <input type="hidden" name="id" value={page.id} />
                      <button type="submit" className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
