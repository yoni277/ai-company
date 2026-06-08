import './globals.css';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '../components/theme-provider';
import { OperatingShell } from '../components/executive-os/OperatingShell';

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

/**
 * D065 · P056-v2 — the global frame is now the Operate ⇄ Build chrome
 * (OperatingShell), replacing the legacy dark top-nav. The shell's sidebar is
 * the single source of navigation (zone-aware); per-executive legacy pages
 * (/ceo, /cto, …) remain reachable by direct URL during the Wave-2 migration
 * but are intentionally not in the v2 nav. ThemeProvider drives <html dir> for
 * the EN/HE mirror that the shell + screens consume via CSS logical properties.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeProvider>
          <OperatingShell>{children}</OperatingShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
