import { db } from '@/prisma/db';
import { notFound } from 'next/navigation';
import AdBanner from '@/components/AdBanner';
import { sanitizeHtml } from '@/lib/utils/content';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function DynamicPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const page = await db.orm.public.Page.where({ slug }).first();

  if (!page) {
    notFound();
  }

  // Clean HTML content (strips literal \n strings, fixes Unsplash URLs, ensures 16:9 images, etc.)
  const sanitizedContent = sanitizeHtml(page.content, page.title, page.type);

  // Analytics & auto-heal content in database if it contained literal \n or deprecated URLs
  if (sanitizedContent !== page.content) {
    await db.orm.public.Page
      .where({ id: page.id })
      .update({
        content: sanitizedContent,
        views: page.views + 1,
        revenue: page.revenue + 0.01
      })
      .catch((err) => console.error('Error updating page:', err));
  } else {
    await db.orm.public.Page
      .where({ id: page.id })
      .update({
        views: page.views + 1,
        revenue: page.revenue + 0.01
      });
  }

  // Auto-backfill category if missing
  const { getCategoryMeta, inferArticleCategory } = await import('@/lib/services/category');
  const categoryName = page.category || inferArticleCategory(page.title, page.content);
  if (!page.category) {
    db.orm.public.Page.where({ id: page.id }).update({ category: categoryName }).catch(() => {});
  }
  const catMeta = getCategoryMeta(categoryName);

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-12">
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          <a
            href={`/?category=${catMeta.id}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all hover:opacity-85 ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.border}`}
          >
            <span>{catMeta.icon}</span>
            <span>{catMeta.name}</span>
          </a>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 uppercase tracking-wider">
            {page.type === 'trend' ? 'Editorial Analysis' : 'Expert Guide'}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-tight font-serif">
          {page.title}
        </h1>
      </div>

      {/* Top Ad Banner */}
      <div className="my-10">
        <AdBanner position="top" topic={page.title} slug={page.slug} />
      </div>

      <article
        className="prose prose-lg prose-indigo dark:prose-invert max-w-none mx-auto
                   prose-headings:font-bold prose-headings:font-serif prose-h2:text-3xl prose-h3:text-2xl
                   prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500
                   prose-blockquote:border-l-indigo-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                   prose-img:rounded-2xl prose-img:shadow-lg prose-img:w-full prose-img:h-auto prose-img:object-contain
                   leading-relaxed text-gray-700 dark:text-gray-300"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

      {/* Bottom Ad Banner */}
      <div className="mt-16 mb-8 pt-8 border-t border-gray-200 dark:border-gray-800">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          Thank you for reading our guide on {page.title}.
        </p>
        <AdBanner position="bottom" topic={page.title} slug={page.slug} />
      </div>
    </main>
  );
}
