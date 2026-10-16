import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'WONS LINEN | Women & Men', description: 'WONS LINEN storefront design preview.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
