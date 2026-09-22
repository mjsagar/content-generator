'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import CardImage from '@/components/CardImage';
import { getCleanSnippet } from '@/lib/utils/content';
import { CATEGORIES, getCategoryMeta, CategoryMeta } from '@/lib/services/category';

export interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  type: string;
  category?: string | null;
  views: number;
  imageUrl: string;
  fallbackUrl: string;
}

interface CategoryFilterLayoutProps {
  articles: ArticleItem[];
  initialCategory?: string;
}

export default function CategoryFilterLayout({
  articles,
  initialCategory = 'all'
}: CategoryFilterLayoutProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute live counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length };
    for (const cat of CATEGORIES) {
      counts[cat.id] = 0;
    }

    for (const article of articles) {
      const meta = getCategoryMeta(article.category);
      counts[meta.id] = (counts[meta.id] || 0) + 1;
    }
    return counts;
  }, [articles]);

  // Filter articles based on active selection
  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'all') return articles;
    return articles.filter(article => {
      const meta = getCategoryMeta(article.category);
      return meta.id === selectedCategory || meta.name.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [articles, selectedCategory]);

  const activeMeta = selectedCategory !== 'all' ? CATEGORIES.find(c => c.id === selectedCategory) : null;

  return (
    <div className="w-full">
      {/* Mobile Category Menu & Horizontal Quick Pills (< md screens) */}
      <div className="block md:hidden mb-8">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Browse By Category
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <span>☰ View All</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">
              {CATEGORIES.length}
            </span>
          </button>
        </div>

        {/* Scrollable Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar -mx-4 px-4">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                : 'bg-white dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <span>✨ All</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedCategory === 'all'
                ? 'bg-white/20 dark:bg-black/20 text-current'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {categoryCounts.all || 0}
            </span>
          </button>

          {CATEGORIES.map(cat => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                    : 'bg-white dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isSelected
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Responsive Grid Layout (Desktop Left Sidebar + Articles) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* DESKTOP LEFT SIDEBAR (hidden on mobile, sticky on desktop) */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-6">
          <div className="bg-white dark:bg-gray-900/90 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧭</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Categories
                </h3>
              </div>
              <span className="text-xs font-medium text-gray-400">
                {articles.length} total
              </span>
            </div>

            {/* Category Navigation List */}
            <nav className="space-y-1.5" aria-label="Article categories">
              {/* All Articles */}
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>✨</span>
                  <span>All Articles</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 dark:bg-black/20 text-current'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {categoryCounts.all || 0}
                </span>
              </button>

              {/* Categorized items */}
              {CATEGORIES.map(cat => {
                const count = categoryCounts[cat.id] || 0;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ml-2 ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MAIN ARTICLES COLUMN */}
        <section className="md:col-span-8 lg:col-span-9">
          {/* Active Filter Header Bar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-serif">
                {activeMeta ? (
                  <span className="inline-flex items-center gap-2">
                    <span>{activeMeta.icon}</span>
                    <span>{activeMeta.name}</span>
                  </span>
                ) : (
                  'Latest Articles'
                )}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
              </span>
            </div>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Clear filter</span>
                <span>✕</span>
              </button>
            )}
          </div>

          {/* Empty State */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-4xl mb-3 block">🔍</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                No articles in this category yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                Our editorial engine discovers and categorizes fresh stories daily. Select another category or view all articles.
              </p>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                View All Articles
              </button>
            </div>
          ) : (
            /* Articles Grid */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filteredArticles.map(page => {
                const catMeta = getCategoryMeta(page.category);

                return (
                  <Link key={page.id} href={`/${page.slug}`} className="group block h-full">
                    <article className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800 overflow-hidden group-hover:-translate-y-0.5">
                      {/* Thumbnail Image */}
                      <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <CardImage
                          src={page.imageUrl}
                          alt={page.title}
                          fallbackSrc={page.fallbackUrl}
                        />
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex flex-col h-full flex-1">
                        {/* Category Badge */}
                        <div className="flex items-center mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.border}`}>
                            <span>{catMeta.icon}</span>
                            <span>{catMeta.name}</span>
                          </span>
                        </div>

                        {/* Article Title */}
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 font-serif leading-snug">
                          {page.title}
                        </h3>

                        {/* Snippet */}
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm line-clamp-3 mb-4 flex-grow leading-relaxed">
                          {getCleanSnippet(page.content, 140)}
                        </p>

                        {/* Read Article Footer */}
                        <div className="mt-auto pt-3.5 border-t border-gray-100 dark:border-gray-800/80 text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center justify-between group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <span>Read article</span>
                          <span aria-hidden="true" className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Mobile Slide-Out Category Menu / Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧭</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Filter by Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>✨</span>
                  <span>All Articles</span>
                </div>
                <span className="text-xs opacity-80">{categoryCounts.all || 0}</span>
              </button>

              {CATEGORIES.map(cat => {
                const count = categoryCounts[cat.id] || 0;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <div className="font-semibold">{cat.name}</div>
                        <div className="text-[11px] opacity-70 line-clamp-1">{cat.description}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 ml-2">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
