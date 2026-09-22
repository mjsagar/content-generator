'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateIntervalAction,
  triggerManualGenerationAction,
  cleanAllArticlesAction,
  deduplicateArticlesAction,
  makeImagesUniqueAction,
  reResolveAllImagesAction,
  refreshArticleImageAction,
  deleteArticleAction,
  deleteAllArticlesAction,
  categorizeAllArticlesAction,
  ActionResult
} from './actions';
import { getCategoryMeta } from '@/lib/services/category';

interface PageItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  category?: string | null;
  views: number;
  revenue: number;
  createdAt: string | Date;
}

interface AdminDashboardClientProps {
  initialPages: PageItem[];
  initialConfigValue: string;
  stats: {
    totalViews: number;
    totalRevenue: number;
    totalTrends: number;
    totalNiches: number;
  };
}

export default function AdminDashboardClient({
  initialPages,
  initialConfigValue,
  stats
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Notification / Feedback state
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'loading';
    message: string;
    details?: string;
  } | null>(null);

  // Active operation identifier
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Settings state
  const [intervalValue, setIntervalValue] = useState(initialConfigValue);

  // Table filtering & search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'trend' | 'niche'>('all');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmAction: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    confirmAction: () => {}
  });

  const handleAction = (
    actionId: string,
    loadingMessage: string,
    actionFn: () => Promise<ActionResult>
  ) => {
    setActiveAction(actionId);
    setStatus({
      type: 'loading',
      message: loadingMessage
    });

    startTransition(async () => {
      try {
        const result = await actionFn();
        setActiveAction(null);
        if (result.success) {
          setStatus({
            type: 'success',
            message: result.message,
            details: result.details
          });
        } else {
          setStatus({
            type: 'error',
            message: result.message,
            details: result.details
          });
        }
        router.refresh();
      } catch (err: any) {
        setActiveAction(null);
        setStatus({
          type: 'error',
          message: err?.message || 'An unexpected error occurred.'
        });
      }
    });
  };

  const openDeleteAllConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Articles?',
      message: `Are you sure you want to permanently delete all ${initialPages.length} articles? This action is irreversible.`,
      confirmLabel: 'Delete Everything',
      confirmAction: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        handleAction(
          'delete-all',
          'Deleting all articles from the database...',
          () => deleteAllArticlesAction()
        );
      }
    });
  };

  const openDeleteArticleConfirm = (page: PageItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Article?',
      message: `Are you sure you want to delete "${page.title}"?`,
      confirmLabel: 'Delete Article',
      confirmAction: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        handleAction(
          `delete-${page.id}`,
          `Deleting article "${page.title}"...`,
          () => deleteArticleAction(page.id)
        );
      }
    });
  };

  // Filtered pages for table view
  const filteredPages = initialPages
    .filter(p => filterType === 'all' || p.type === filterType)
    .filter(p =>
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Admin Portal
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Engine
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automated UK editorial generation, image relevance scoring, and content sanitization.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 shadow-xs transition-all w-fit"
        >
          <span>View Publication</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Global Status Banner / Notification Alert */}
      {status && (
        <div
          role="alert"
          className={`mb-8 p-4 rounded-xl border shadow-sm transition-all duration-300 ${
            status.type === 'loading'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              : status.type === 'success'
              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {status.type === 'loading' ? (
                <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : status.type === 'success' ? (
                <span className="text-xl flex-shrink-0">✅</span>
              ) : (
                <span className="text-xl flex-shrink-0">⚠️</span>
              )}
              <div>
                <p className="font-semibold text-sm sm:text-base">{status.message}</p>
                {status.details && (
                  <p className="text-xs sm:text-sm mt-1 opacity-90 font-mono break-all">{status.details}</p>
                )}
              </div>
            </div>

            {status.type !== 'loading' && (
              <button
                onClick={() => setStatus(null)}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 border border-current/20 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="p-5 bg-white dark:bg-gray-800/80 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Views</span>
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">👁️</span>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">
            {stats.totalViews.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800/80 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Est. Revenue</span>
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">💷</span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800/80 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trend Articles</span>
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">📈</span>
          </div>
          <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            {stats.totalTrends}
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800/80 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Niche Guides</span>
            <span className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">🌿</span>
          </div>
          <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
            {stats.totalNiches}
          </p>
        </div>
      </div>

      {/* Control Actions Panel */}
      <section className="mb-12 p-6 sm:p-8 bg-white dark:bg-gray-800/90 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Automated Engine Controls</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Trigger actions on-demand. Buttons update with real-time progress indicators when executing.
        </p>

        {/* Action Button Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-8">
          {/* Run Generation Now */}
          <button
            type="button"
            disabled={activeAction !== null}
            onClick={() =>
              handleAction(
                'generate',
                'Discovering UK trends and generating fresh editorial analysis via Groq...',
                () => triggerManualGenerationAction()
              )
            }
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
              activeAction === 'generate'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent hover:shadow-md'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-base ${activeAction === 'generate' ? 'text-emerald-900 dark:text-emerald-200' : 'text-white'}`}>
                {activeAction === 'generate' ? 'Generating Content...' : '⚡ Run Generation Now'}
              </span>
              {activeAction === 'generate' && (
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className={`text-xs mt-2 ${activeAction === 'generate' ? 'text-emerald-700 dark:text-emerald-300' : 'text-emerald-100'}`}>
              Pulls live UK Google Trends, searches Wikimedia Commons, and generates an article.
            </p>
          </button>

          {/* Re-resolve All Images */}
          <button
            type="button"
            disabled={activeAction !== null}
            onClick={() =>
              handleAction(
                'reresolve-images',
                'Re-resolving high-relevance, free-to-use images for all articles...',
                () => reResolveAllImagesAction()
              )
            }
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
              activeAction === 'reresolve-images'
                ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-400 ring-2 ring-violet-500/20'
                : 'bg-violet-600 hover:bg-violet-700 text-white border-transparent hover:shadow-md'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-base ${activeAction === 'reresolve-images' ? 'text-violet-900 dark:text-violet-200' : 'text-white'}`}>
                {activeAction === 'reresolve-images' ? 'Re-resolving Images...' : '🎯 Re-resolve All Images'}
              </span>
              {activeAction === 'reresolve-images' && (
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className={`text-xs mt-2 ${activeAction === 'reresolve-images' ? 'text-violet-700 dark:text-violet-300' : 'text-violet-100'}`}>
              Enforces strict license checking & high-relevance scoring across all live articles.
            </p>
          </button>

          {/* Fix Duplicate Images */}
          <button
            type="button"
            disabled={activeAction !== null}
            onClick={() =>
              handleAction(
                'fix-images',
                'Finding and assigning fresh unique images to articles with duplicates...',
                () => makeImagesUniqueAction()
              )
            }
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
              activeAction === 'fix-images'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent hover:shadow-md'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-base ${activeAction === 'fix-images' ? 'text-indigo-900 dark:text-indigo-200' : 'text-white'}`}>
                {activeAction === 'fix-images' ? 'Resolving Unique Images...' : '🖼️ Fix Duplicate Images'}
              </span>
              {activeAction === 'fix-images' && (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className={`text-xs mt-2 ${activeAction === 'fix-images' ? 'text-indigo-700 dark:text-indigo-300' : 'text-indigo-100'}`}>
              Guarantees every page has a unique, non-overlapping header photograph.
            </p>
          </button>

          {/* Sanitize All Articles */}
          <button
            type="button"
            disabled={activeAction !== null}
            onClick={() =>
              handleAction(
                'sanitize',
                'Cleaning HTML, stripping escaped newlines, and validating images...',
                () => cleanAllArticlesAction()
              )
            }
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
              activeAction === 'sanitize'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent hover:shadow-md'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-base ${activeAction === 'sanitize' ? 'text-blue-900 dark:text-blue-200' : 'text-white'}`}>
                {activeAction === 'sanitize' ? 'Sanitizing Articles...' : '🧹 Sanitize All Articles'}
              </span>
              {activeAction === 'sanitize' && (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className={`text-xs mt-2 ${activeAction === 'sanitize' ? 'text-blue-700 dark:text-blue-300' : 'text-blue-100'}`}>
              Cleans literal \\n strings, normalizes header tags, and applies uncropped styles.
            </p>
          </button>

          {/* Deduplicate Articles */}
          <button
            type="button"
            disabled={activeAction !== null}
            onClick={() =>
              handleAction(
                'dedup',
                'Scanning for topical and fuzzy duplicate articles...',
                () => deduplicateArticlesAction()
              )
            }
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
              activeAction === 'dedup'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-amber-600 hover:bg-amber-700 text-white border-transparent hover:shadow-md'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-base ${activeAction === 'dedup' ? 'text-amber-900 dark:text-amber-200' : 'text-white'}`}>
                {activeAction === 'dedup' ? 'Deduplicating...' : '🔍 Deduplicate Articles'}
              </span>
              {activeAction === 'dedup' && (
                <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className={`text-xs mt-2 ${activeAction === 'dedup' ? 'text-amber-700 dark:text-amber-300' : 'text-amber-100'}`}>
              Identifies duplicate topics, preserving the version with the highest views.
            </p>
          </button>

          {/* Categorize All Articles */}
          <button
            type="button"
            disabled={activeAction !== null}
            onClick={() =>
              handleAction(
                'categorize',
                'Classifying all articles into editorial categories...',
                () => categorizeAllArticlesAction()
              )
            }
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
              activeAction === 'categorize'
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-400 ring-2 ring-teal-500/20'
                : 'bg-teal-600 hover:bg-teal-700 text-white border-transparent hover:shadow-md'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-base ${activeAction === 'categorize' ? 'text-teal-900 dark:text-teal-200' : 'text-white'}`}>
                {activeAction === 'categorize' ? 'Categorizing...' : '🏷️ Categorize Articles'}
              </span>
              {activeAction === 'categorize' && (
                <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className={`text-xs mt-2 ${activeAction === 'categorize' ? 'text-teal-700 dark:text-teal-300' : 'text-teal-100'}`}>
              Runs automated classification on all existing articles based on topic and content.
            </p>
          </button>

          {/* Delete All Articles */}
          <button
            type="button"
            disabled={activeAction !== null}
            onClick={openDeleteAllConfirm}
            className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
              activeAction === 'delete-all'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-400 ring-2 ring-red-500/20'
                : 'bg-red-600 hover:bg-red-700 text-white border-transparent hover:shadow-md'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-base ${activeAction === 'delete-all' ? 'text-red-900 dark:text-red-200' : 'text-white'}`}>
                {activeAction === 'delete-all' ? 'Deleting All...' : '🗑️ Delete All Articles'}
              </span>
              {activeAction === 'delete-all' && (
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className={`text-xs mt-2 ${activeAction === 'delete-all' ? 'text-red-700 dark:text-red-300' : 'text-red-100'}`}>
              Destructive action: Permanently wipes all database articles with confirmation.
            </p>
          </button>
        </div>

        {/* Generation Interval Setting */}
        <div className="pt-6 border-t border-gray-100 dark:border-gray-700/80">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleAction('interval', 'Saving background generation interval...', () =>
                updateIntervalAction(intervalValue)
              );
            }}
            className="flex flex-col sm:flex-row items-end gap-3 max-w-md"
          >
            <div className="flex-1 w-full">
              <label htmlFor="interval-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Generation Interval (Minutes)
              </label>
              <input
                type="number"
                id="interval-input"
                min="5"
                value={intervalValue}
                onChange={e => setIntervalValue(e.target.value)}
                disabled={activeAction !== null}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2 text-sm shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={activeAction !== null}
              className="w-full sm:w-auto px-5 py-2 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              {activeAction === 'interval' && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{activeAction === 'interval' ? 'Saving...' : 'Save'}</span>
            </button>
          </form>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Controls how frequently the background worker queries Google Trends and generates new articles.
          </p>
        </div>
      </section>

      {/* Articles Management Table */}
      <section className="bg-white dark:bg-gray-800/90 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80 overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 sm:p-6 border-b border-gray-200/80 dark:border-gray-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Published Articles</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredPages.length} of {initialPages.length} articles
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Pills */}
            <div className="inline-flex rounded-lg p-1 bg-gray-100 dark:bg-gray-700/60 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All ({initialPages.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('trend')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filterType === 'trend'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Trends ({stats.totalTrends})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('niche')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filterType === 'niche'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-xs font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Niches ({stats.totalNiches})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-9 pr-3.5 py-1.5 text-sm shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50/70 dark:bg-gray-900/40">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Views
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No articles match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredPages.map(page => {
                  const isFixingThis = activeAction === `fix-image-${page.id}`;
                  const isDeletingThis = activeAction === `delete-${page.id}`;

                  return (
                    <tr key={page.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 max-w-md"
                          >
                            {page.title}
                          </a>
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open live article in new tab"
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">/{page.slug}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            page.type === 'trend'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                          }`}
                        >
                          {page.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const catMeta = getCategoryMeta(page.category);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.border}`}>
                              <span>{catMeta.icon}</span>
                              <span>{catMeta.name}</span>
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-300">
                        {page.views.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(page.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={activeAction !== null}
                            onClick={() =>
                              handleAction(
                                `fix-image-${page.id}`,
                                `Re-evaluating high-relevance image for "${page.title}"...`,
                                () => refreshArticleImageAction(page.id)
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isFixingThis ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <span>🎯</span> Fix Image
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={activeAction !== null}
                            onClick={() => openDeleteArticleConfirm(page)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/80 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isDeletingThis ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <span>🗑️</span> Delete
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.confirmAction}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
