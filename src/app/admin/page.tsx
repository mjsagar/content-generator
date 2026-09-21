import { db } from '@/prisma/db';
import { revalidatePath } from 'next/cache';

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
