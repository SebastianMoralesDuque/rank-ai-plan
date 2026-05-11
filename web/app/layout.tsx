import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DevAI Rank - AI Plans Ranked for Developers',
  description: 'Compare and rank the best AI subscription plans (Cursor, Copilot, Claude, and more) by value.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-black text-white">
        {children}
        <Script 
          defer 
          src="http://analytics.sebastianmorales.sbs/js/script.js" 
          data-website-id="ai-rank"
        />
      </body>
    </html>
  );
}
