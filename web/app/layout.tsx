import type { Metadata } from 'next';
import { Outfit, Sora } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
});

const sora = Sora({ 
  subsets: ['latin'],
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'DevAI Rank - El Directorio Definitivo de IA para Programadores',
  description: 'Comparador de planes premium de IA (Cursor, Copilot, Claude) para desarrolladores.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${outfit.variable} ${sora.variable}`}>
      <body className={`${sora.className} antialiased bg-black text-white`}>{children}</body>
    </html>
  );
}
