import { db } from '@/prisma/db';
import type { Models } from '@/prisma/contract.d';
import Link from 'next/link';
import { getCleanSnippet } from '@/lib/utils/content';
import CardImage from '@/components/CardImage';
import { getTopicFallbackImage } from '@/lib/services/image';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let pages: Models.public_Page[] = [];

  if (process.env.DATABASE_URL) {
    pages = await db.orm.public.Page
      .orderBy((m) => m.createdAt.desc())
      .limit(20)
      .all();
  }

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-12">
      <header className="mb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-gray-100 font-serif">
          The Information Hub
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Your definitive daily digest of emerging trends, insightful analysis, and expert guides across Britain.
        </p>
      </header>

      <section>
        <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Latest Articles
          </h2>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            Top {pages.length}
          </span>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Insights are currently being curated. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {pages.map((page: Models.public_Page) => {
              const fallbackUrl = getTopicFallbackImage(page.title, page.type);
              const imgMatch = page.content.match(/<img[^>]+src="([^">]+)"/);
              let imageUrl = imgMatch ? imgMatch[1] : fallbackUrl;
              if (!imageUrl || imageUrl.includes('source.unsplash.com')) {
                imageUrl = fallbackUrl;
              }

              return (
                <Link key={page.id} href={`/${page.slug}`} className="group">
                  <article className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <CardImage
                        src={imageUrl}
                        alt={page.title}
                        fallbackSrc={fallbackUrl}
                      />
                    </div>
                    <div className="p-6 flex flex-col h-full flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${
                          page.type === 'trend'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}>
                          {page.type}
                        </span>
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {page.views}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 font-serif">
                        {page.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4 flex-grow leading-relaxed">
                        {getCleanSnippet(page.content, 180)}
                      </p>
                      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 font-medium flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Read article <span aria-hidden="true">&rarr;</span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
