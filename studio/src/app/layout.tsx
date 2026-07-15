import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/accessibility.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AccessibilityPanel } from "@/components/accessibility/AccessibilityPanel";
import { ConflictResolver } from '@/components/offline/ConflictResolver';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Syncsenta - AI-Powered Learning for Kenyan Students',
  description: 'Personalized CBC-aligned education with AI tutoring. Transform your learning experience with adaptive lessons, instant feedback, and comprehensive curriculum coverage.',
  keywords: ['CBC education', 'Kenya education', 'AI tutoring', 'personalized learning', 'online education', 'Kenyan curriculum'],
  authors: [{ name: 'Syncsenta Team' }],
  openGraph: {
    title: 'Syncsenta - AI-Powered Learning',
    description: 'Personalized CBC-aligned education with AI tutoring',
    url: 'https://syncsenta.com',
    siteName: 'Syncsenta',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Syncsenta - AI-Powered Learning Platform',
      },
    ],
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Syncsenta - AI-Powered Learning',
    description: 'Personalized CBC-aligned education with AI tutoring',
    images: ['/og-image.jpg'],
    creator: '@syncsenta',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <AccessibilityPanel />
          <ConflictResolver />
        </ThemeProvider>
      </body>
    </html>
  );
}

// Made with Bob
