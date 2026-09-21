'use client';

import { useEffect, useState, useRef } from 'react';
import { getContextualProduct, type AffiliateProduct } from '@/lib/services/affiliate';

interface AdBannerProps {
  position?: 'top' | 'bottom';
  topic?: string;
  slug?: string;
}

export default function AdBanner({ position = 'top', topic = '', slug = '' }: AdBannerProps) {
  const [adLoaded, setAdLoaded] = useState<boolean>(false);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const insRef = useRef<HTMLModElement>(null);

  const rawClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  const adsenseClientId = rawClientId
    ? rawClientId.startsWith('ca-pub-')
      ? rawClientId
      : rawClientId.startsWith('pub-')
        ? `ca-${rawClientId}`
        : `ca-pub-${rawClientId}`
    : '';
  const isAdsenseConfigured = adsenseClientId.length > 10 && !adsenseClientId.includes('XXXX');
  const adSlot = position === 'top'
    ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP?.trim()
    : process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM?.trim();

  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'hubdeals-20';
  const product: AffiliateProduct = getContextualProduct(topic, position);

  useEffect(() => {
    if (!isAdsenseConfigured) {
      setUseFallback(true);
      return;
    }

    try {
      // @ts-expect-error Google AdSense injects adsbygoogle into the window object
      (window.adsbygoogle = window.adsbygoogle || []).push({});

      // Check if ad stays unfilled (e.g. adblock, localhost, or unapproved site)
      const timer = setTimeout(() => {
        if (insRef.current) {
          const status = insRef.current.getAttribute('data-ad-status');
          if (status === 'unfilled' || insRef.current.offsetHeight === 0) {
            setUseFallback(true);
          } else {
            setAdLoaded(true);
          }
        }
      }, 1500);

      return () => clearTimeout(timer);
    } catch (err) {
      console.warn('AdSense unavailable, using fallback:', err);
      setUseFallback(true);
    }
  }, [isAdsenseConfigured]);

  const handleAffiliateClick = () => {
    if (slug) {
      // Record click asynchronously to update revenue tracking in background
      fetch('/api/analytics/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      }).catch(() => {});
    }
  };

  const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(product.searchQuery)}&tag=${encodeURIComponent(affiliateTag)}`;

  // If AdSense is active and successfully loading, render the AdSense slot
  if (isAdsenseConfigured && !useFallback) {
    return (
      <div className="w-full my-6 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4 text-center overflow-hidden min-h-[120px] transition-all">
        <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium block mb-2">
          Advertisement
        </span>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '90px' }}
          data-ad-client={adsenseClientId}
          data-ad-slot={adSlot || undefined}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // High-converting Contextual Affiliate / Sponsored Recommendation Card
  return (
    <aside
      aria-label="Sponsored recommendation"
      className="my-8 relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              {product.badge}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Curated by editors
            </span>
          </div>

          <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug mb-2">
            {product.title}
          </h4>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
            {product.description}
          </p>
        </div>

        <div className="flex-shrink-0 flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2">
          <a
            href={amazonSearchUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={handleAffiliateClick}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 group transform active:scale-95"
          >
            <span>{product.ctaText}</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 self-start md:self-end">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified Referral Partner
          </span>
        </div>
      </div>
    </aside>
  );
}
