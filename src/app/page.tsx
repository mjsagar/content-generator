import { db } from '@/prisma/db';
import type { Models } from '@/prisma/contract.d';
import { getTopicFallbackImage } from '@/lib/services/image';
import { inferArticleCategory } from '@/lib/services/category';
import CategoryFilterLayout, { ArticleItem } from '@/components/CategoryFilterLayout';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams?: Promise<{ category?: string }>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialCategory = resolvedSearchParams.category || 'all';

  let pages: Models.public_Page[] = [];

  if (process.env.DATABASE_URL) {
    pages = await db.orm.public.Page
      .orderBy((m) => m.createdAt.desc())
      .limit(60)
      .all();

    // Auto-backfill categories on existing articles if missing
    const backfillPromises = [];
    for (const p of pages) {
      if (!p.category) {
        const assigned = inferArticleCategory(p.title, p.content);
        p.category = assigned;
        backfillPromises.push(
          db.orm.public.Page.where({ id: p.id }).update({ category: assigned }).catch(() => {})
        );
      }
    }
    if (backfillPromises.length > 0) {
      await Promise.all(backfillPromises);
    }
  }

  const articles: ArticleItem[] = pages.map((page: Models.public_Page) => {
    const fallbackUrl = getTopicFallbackImage(page.title, page.type);
    const imgMatch = page.content.match(/<img[^>]+src="([^">]+)"/);
    let imageUrl = imgMatch ? imgMatch[1] : fallbackUrl;
    if (!imageUrl || imageUrl.includes('source.unsplash.com')) {
      imageUrl = fallbackUrl;
    }

    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      type: page.type,
      category: page.category || inferArticleCategory(page.title, page.content),
      views: page.views || 0,
      imageUrl,
      fallbackUrl
    };
  });

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-12">
      {/* Brand Header */}
      <header className="mb-12 md:mb-16 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-gray-100 font-serif">
          The Information Hub
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Your definitive daily digest of emerging trends, insightful analysis, and expert guides across Britain.
        </p>
      </header>

      {/* Main Content with Desktop Left Sidebar and Mobile Category Menu */}
      <CategoryFilterLayout articles={articles} initialCategory={initialCategory} />
    </main>
  );
}
