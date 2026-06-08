'use client';

/**
 * D061 / D065 · P056-v2 — Global Operate ⇄ Build chrome (Wave 2, step 1).
 *
 * The Executive OS shell: a fixed top bar with the zone switcher + language +
 * Logout, and a zone-aware sidebar. Replaces the legacy dark top-nav as the
 * app's global frame (app/layout.tsx). RTL mirrors entirely via CSS logical
 * properties — the sidebar sits on the inline-start in both LTR and RTL; `dir`
 * is driven by the ThemeProvider on <html>.
 *
 * Build conditions honored: reuse v1 tokens (primary #004AC6), a11y
 * (nav landmarks, aria-current, 2px focus ring, color+icon+text), Summary-First,
 * `prefetch={false}` nav (P053). Screens not yet built render as disabled "Soon"
 * items so the IA is visible with NO dead links. Build sidebar shows ONLY Build
 * items (IA nit from Step-6).
 *
 * The content canvas is transparent: migrated v2 screens bring their own
 * `.ds-surface` light surface; un-migrated legacy screens keep their styling.
 */

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../theme-provider';
import {
  DashboardIcon,
  BusinessIcon,
  GavelIcon,
  DocumentIcon,
  ShieldCheckIcon,
  ChartIcon,
  LayersIcon,
  BadgeIcon,
  LogoutIcon,
  PlusIcon,
} from '../ds/icons';

type Zone = 'operate' | 'build';

interface NavItem {
  href: string;
  label: string;
  labelHe: string;
  Icon: ComponentType<{ className?: string }>;
  ready: boolean;
}

const NAV: Record<Zone, NavItem[]> = {
  operate: [
    { href: '/', label: 'Dashboard', labelHe: 'לוח בקרה', Icon: DashboardIcon, ready: true },
    { href: '/businesses', label: 'Businesses', labelHe: 'עסקים', Icon: BusinessIcon, ready: true },
    { href: '/inbox', label: 'Decisions', labelHe: 'החלטות', Icon: GavelIcon, ready: true },
    { href: '/briefings', label: 'Briefings', labelHe: 'תדריכים', Icon: DocumentIcon, ready: false },
    { href: '/evidence', label: 'Evidence', labelHe: 'ראיות', Icon: ShieldCheckIcon, ready: false },
    { href: '/results', label: 'Results', labelHe: 'תוצאות', Icon: ChartIcon, ready: false },
  ],
  build: [
    { href: '/build/backlog', label: 'Platform Backlog', labelHe: 'מצבור פלטפורמה', Icon: LayersIcon, ready: false },
    { href: '/build/charters', label: 'Role Charters', labelHe: 'מגילות תפקיד', Icon: BadgeIcon, ready: false },
  ],
};

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OperatingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale } = useTheme();
  const he = locale === 'he';
  const [zone, setZone] = useState<Zone>(pathname.startsWith('/build') ? 'build' : 'operate');

  const items = NAV[zone];

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top bar */}
      <header className="ds-surface fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-md sm:px-lg">
        <div className="flex items-center gap-lg">
          <span className="font-title-lg text-title-lg font-bold text-primary">AI-Company</span>
          {/* Zone switcher (segmented control) */}
          <div
            role="tablist"
            aria-label={he ? 'מצב' : 'Zone'}
            className="hidden items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1 sm:flex"
          >
            {(['operate', 'build'] as Zone[]).map((z) => (
              <button
                key={z}
                role="tab"
                type="button"
                aria-selected={zone === z}
                onClick={() => setZone(z)}
                className={`min-h-9 rounded px-md py-xs font-label-md text-label-md transition ${
                  zone === z
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {z === 'operate' ? (he ? 'תפעול' : 'Operate') : he ? 'בנייה' : 'Build'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={() => setLocale(he ? 'en' : 'he')}
            className="min-h-11 rounded px-sm font-label-md text-label-md text-on-surface-variant hover:text-primary"
          >
            {he ? 'English' : 'עברית'}
          </button>
          <span className="h-6 w-px bg-outline-variant" aria-hidden />
          <a
            href="/api/logout"
            className="inline-flex min-h-11 items-center gap-xs rounded px-sm font-label-md text-label-md text-on-surface-variant hover:text-primary"
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{he ? 'התנתקות' : 'Logout'}</span>
          </a>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className="ds-surface fixed bottom-0 start-0 top-16 z-40 hidden w-[260px] flex-col border-e border-outline-variant bg-surface-container-low px-sm py-lg md:flex"
        aria-label={he ? 'ניווט ראשי' : 'Primary navigation'}
      >
        <div className="mb-lg flex items-center gap-sm px-sm">
          <span className="grid h-9 w-9 place-items-center rounded bg-primary text-on-primary">
            <DashboardIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Executive OS</h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {zone === 'operate' ? (he ? 'מצב תפעול' : 'Operate Mode') : he ? 'מצב בנייה' : 'Build Mode'}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = item.ready && isActive(pathname, item.href);
            const label = he ? item.labelHe : item.label;
            const content = (
              <>
                <item.Icon className="h-5 w-5 shrink-0" />
                <span className="font-body-md text-body-md">{label}</span>
                {!item.ready ? (
                  <span className="ms-auto rounded-sm bg-surface-container px-xs py-[1px] font-label-sm text-label-sm text-outline">
                    {he ? 'בקרוב' : 'Soon'}
                  </span>
                ) : null}
              </>
            );
            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  title={he ? 'בקרוב' : 'Coming soon'}
                  className="flex cursor-not-allowed items-center gap-sm rounded-lg px-sm py-sm text-on-surface-variant opacity-50"
                >
                  {content}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href as never}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-sm rounded-lg px-sm py-sm transition ${
                  active
                    ? 'bg-primary-container/15 font-medium text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-sm border-t border-outline-variant pt-md">
          <Link
            href={'/inbox' as never}
            prefetch={false}
            className="inline-flex min-h-11 w-full items-center justify-center gap-xs rounded bg-primary px-md py-sm font-label-md text-label-md text-on-primary transition hover:opacity-90"
          >
            <PlusIcon className="h-4 w-4" />
            {he ? 'החלטה חדשה' : 'New Decision'}
          </Link>
        </div>
      </aside>

      {/* Content canvas — transparent; v2 screens bring their own .ds-surface */}
      <main className="min-h-screen pt-16 md:ms-[260px]">{children}</main>

      {/* Mobile bottom nav (Operate essentials) */}
      <nav
        className="ds-surface fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-outline-variant bg-surface md:hidden"
        aria-label={he ? 'ניווט נייד' : 'Mobile navigation'}
      >
        {NAV.operate.slice(0, 3).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href as never}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-[2px] px-md ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <item.Icon className="h-5 w-5" />
              <span className="font-label-sm text-label-sm">{he ? item.labelHe : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
