import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  description: "Your definitive daily digest of emerging trends, insightful analysis, and expert guides across Britain.",
  other: {
    'google-adsense-account': 'ca-pub-5126251201737249',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawClientId = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-5126251201737249').trim();
  const adsenseClientId = rawClientId.startsWith('ca-pub-')
    ? rawClientId
    : rawClientId.startsWith('pub-')
      ? `ca-${rawClientId}`
      : `ca-pub-${rawClientId}`;

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta name="google-adsense-account" content={adsenseClientId} />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
        />
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
