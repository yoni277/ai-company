'use client';

/**
 * D061 / P056 — Design System foundation (Wave 1A)
 *
 * ThemeProvider holds the two cross-cutting axes the Executive OS UI switches on:
 *
 *  - `mode`  — "operate" (view/interact) vs "build" (configure/edit). DESIGN.md
 *              calls for subtle chrome changes between the two; components read
 *              `mode` to toggle that chrome (e.g. the Build Utility Panel).
 *  - `locale`/`dir` — "en" (ltr) vs "he" (rtl). Direction is applied to the
 *              document element so CSS logical properties resolve correctly; no
 *              duplicate stylesheets (DESIGN.md §Layout · RTL Support).
 *
 * The provider syncs `<html lang dir>` and `data-mode` on mount and on change,
 * and persists the choice to localStorage. The server renders a stable default
 * (en / ltr / operate) to avoid hydration mismatch; the effect reconciles to the
 * persisted value after mount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Mode = 'operate' | 'build';
export type Locale = 'en' | 'he';
export type Direction = 'ltr' | 'rtl';

export interface ThemeState {
  mode: Mode;
  locale: Locale;
  dir: Direction;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  setLocale: (locale: Locale) => void;
}

const STORAGE_KEY = 'doos-ui-theme';
const DIR_BY_LOCALE: Record<Locale, Direction> = { en: 'ltr', he: 'rtl' };

const ThemeContext = createContext<ThemeState | null>(null);

interface PersistedTheme {
  mode: Mode;
  locale: Locale;
}

function readPersisted(): PersistedTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedTheme>;
    const mode: Mode = parsed.mode === 'build' ? 'build' : 'operate';
    const locale: Locale = parsed.locale === 'he' ? 'he' : 'en';
    return { mode, locale };
  } catch {
    return null;
  }
}

export function ThemeProvider({
  children,
  defaultMode = 'operate',
  defaultLocale = 'en',
}: {
  children: ReactNode;
  defaultMode?: Mode;
  defaultLocale?: Locale;
}) {
  const [mode, setModeState] = useState<Mode>(defaultMode);
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Reconcile to the persisted choice after mount (server rendered the default).
  useEffect(() => {
    const persisted = readPersisted();
    if (!persisted) return;
    setModeState(persisted.mode);
    setLocaleState(persisted.locale);
  }, []);

  // Mirror state onto the document and persist it.
  useEffect(() => {
    const dir = DIR_BY_LOCALE[locale];
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
    root.dataset.mode = mode;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, locale }));
    } catch {
      /* storage unavailable (private mode / quota) — non-fatal */
    }
  }, [mode, locale]);

  const setMode = useCallback((next: Mode) => setModeState(next), []);
  const toggleMode = useCallback(
    () => setModeState((m) => (m === 'operate' ? 'build' : 'operate')),
    [],
  );
  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const value = useMemo<ThemeState>(
    () => ({ mode, locale, dir: DIR_BY_LOCALE[locale], setMode, toggleMode, setLocale }),
    [mode, locale, setMode, toggleMode, setLocale],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
