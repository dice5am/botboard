import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
const sans = Geist({ subsets: ['latin'], variable: '--font-geist' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
export const metadata: Metadata = { title: 'botboard', description: 'Grok Bot usage' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#06090E' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className={`${sans.variable} ${mono.variable}`}><body>{children}</body></html>);
}
