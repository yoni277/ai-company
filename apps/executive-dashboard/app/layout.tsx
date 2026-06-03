import './globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'AI-Company',
  description: 'Executive dashboard for the AI-Native company.',
};

const nav = [
  { href: '/', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/registry', label: 'Registry' },
  { href: '/reports', label: 'Reports' },
  { href: '/chief-of-staff', label: 'AI Chief of Staff' },
  { href: '/cto', label: 'AI CTO' },
  { href: '/coo', label: 'AI COO' },
  { href: '/cfo', label: 'AI CFO' },
  { href: '/vp-marketing', label: 'AI VP Marketing' },
  { href: '/vp-sales', label: 'AI VP Sales' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
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
      </body>
    </html>
  );
}
