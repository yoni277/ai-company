'use client';

/**
 * D061 / P056.3–4 — EN⇄HE + Operate⇄Build toggle for the Executive OS screens.
 * Reuses the P056.1 ThemeProvider so the choice persists (localStorage) and the
 * whole document direction flips via CSS logical properties. Aids CTO Chrome
 * validation directly on Home/Inbox (same affordance as the gallery).
 */

import { useTheme } from '../theme-provider';
import { ActionButton } from '../ds';

export function LocaleToggle() {
  const { locale, setLocale, mode, toggleMode } = useTheme();
  return (
    <div className="flex items-center gap-sm">
      <ActionButton variant="secondary" onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}>
        {locale === 'en' ? 'עברית (RTL)' : 'English (LTR)'}
      </ActionButton>
      <ActionButton variant="ghost" onClick={toggleMode}>
        {mode === 'operate' ? 'Build mode' : 'Operate mode'}
      </ActionButton>
    </div>
  );
}
