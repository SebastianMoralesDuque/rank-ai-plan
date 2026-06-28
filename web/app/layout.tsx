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
          src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://analytics.sebastianmorales.sbs/script.js"} 
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "4a8011f2-e19c-47fc-89ff-0734cff95989"}
        />
      </body>
    </html>
  );
}
