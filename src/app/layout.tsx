import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Information Hub",
  description: "Discover the latest trends and bespoke guides generated autonomously.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  const adsenseClientId = rawClientId
    ? rawClientId.startsWith('ca-pub-')
      ? rawClientId
      : rawClientId.startsWith('pub-')
        ? `ca-${rawClientId}`
        : `ca-pub-${rawClientId}`
    : '';
  const isAdsenseConfigured = adsenseClientId.length > 10 && !adsenseClientId.includes('XXXX');

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {isAdsenseConfigured && (
          <Script
            id="adsense-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 selection:bg-blue-100 dark:selection:bg-blue-900"
      >
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
