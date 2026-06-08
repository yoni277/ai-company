import './globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '../components/theme-provider';

// Self-hosted webfonts via next/font — replaces the Stitch prototype's Tailwind
// Play CDN + Google Fonts <link> (D061 carry-forward #3). Exposed as CSS
// variables that globals.css feeds into --font-sans / --font-mono.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'AI-Company',
  description: 'Executive dashboard for the AI-Native company.',
};

// Route segment default for every page under this layout. The first hit to a
// cold route runs the heavy getPlatform() assembly + first Supabase round trip;
// at the platform default timeout that cold start returned 503 and the
// navigation aborted ("click does nothing, works on retry"). Give cold starts
// room to finish so they return 200 instead of timing out. Warm requests are
// unaffected. Deeper fix (lighter cold start / lazy executive init) tracked
// separately.
export const maxDuration = 60;

const nav = [
  // D061/P056 Executive OS UI (Wave 1B — CEO-review routes; non-destructive)
  { href: '/home', label: 'Home' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/ceo', label: 'Command Center' },
  { href: '/overview', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/registry', label: 'Registry' },
  { href: '/reports', label: 'Reports' },
  { href: '/chief-of-staff', label: 'AI Chief of Staff' },
  { href: '/cto', label: 'AI CTO' },
  { href: '/coo', label: 'AI COO' },
  { href: '/cfo', label: 'AI CFO' },
  { href: '/vp-marketing', label: 'AI VP Marketing' },
  { href: '/vp-sales', label: 'AI VP Sales' },
  { href: '/executive-team', label: 'Executive Team' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeProvider>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-8">
            <div className="font-semibold tracking-tight text-slate-100">
              AI-Company<span className="text-slate-500"> / Executive Dashboard</span>
            </div>
            <nav className="flex items-center gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href as never}
                  // prefetch disabled on the global nav: Next otherwise fires an
                  // RSC fetch for every visible link at once, and each route opens
                  // cross-region Supabase connections. That burst overwhelmed the
                  // backend and produced waves of 503s, which silently aborted the
                  // very navigation the user clicked. One fetch per click instead.
                  prefetch={false}
                  className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 rounded-md transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto text-xs text-slate-500">Phase 4 · Full executive team online</div>
          </header>
          <main className="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
