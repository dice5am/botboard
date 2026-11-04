import './globals.css';
import type { Metadata, Viewport } from 'next';
export const metadata: Metadata = { title: 'botboard', description: 'Grok Bot usage' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#05070a' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
