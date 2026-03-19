import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlobeSim — AI Cinematic Universe Generator',
  description: 'Generate fully coherent, cinematic, personalized movies with AI. Powered by 12 specialized macro-agents.',
  keywords: ['AI', 'movie generator', 'cinematic', 'GlobeSim', 'LangGraph'],
  openGraph: {
    title: 'GlobeSim — AI Cinematic Universe Generator',
    description: 'Type any movie idea and watch AI generate a complete cinematic experience.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
