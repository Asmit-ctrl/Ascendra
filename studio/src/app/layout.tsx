import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/client-providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mwalimu AI - CBC Learning Assistant',
  description: 'Your personal AI tutor for Kenya\'s CBC curriculum. Learn Math, Science, English, and more with Socratic guidance.',
  keywords: ['CBC', 'Kenya', 'education', 'AI tutor', 'learning', 'Mwalimu', 'homework help'],
  authors: [{ name: 'Mwalimu AI Team' }],
  creator: 'Mwalimu AI',
  publisher: 'Mwalimu AI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mwalimu AI',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://mwalimu.ai',
    title: 'Mwalimu AI - CBC Learning Assistant',
    description: 'Your personal AI tutor for Kenya\'s CBC curriculum',
    siteName: 'Mwalimu AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mwalimu AI - CBC Learning Assistant',
    description: 'Your personal AI tutor for Kenya\'s CBC curriculum',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
