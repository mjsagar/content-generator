'use client';

import { useEffect } from 'react';

interface AdBannerProps {
  position: 'top' | 'bottom';
}

export default function AdBanner({ position }: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-expect-error Google AdSense injects adsbygoogle into the window object
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-inner overflow-hidden min-h-[120px]">
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%' }}
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot={position === 'top' ? "XXXXXXXXXX" : "YYYYYYYYYY"}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <span className="text-gray-400 text-sm absolute">Advertisement</span>
    </div>
  );
}
