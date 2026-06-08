'use client';

/**
 * D061 / P056 — Design System foundation (Wave 1A) · acceptance-gate proof.
 *
 * Renders the DESIGN.md token set (color / type / spacing / radius / elevation /
 * health triad) using only design-system utilities, and exposes the EN ⇄ HE
 * locale toggle so the same markup can be verified in LTR and RTL. Spacing on
 * the sample surfaces uses CSS logical properties (ps-/pe-, ms-/me-) so the
 * layout mirrors under `dir="rtl"` with no duplicate styles.
 *
 * This is a developer/verification surface, not a CEO screen — it exists to
 * satisfy the P1 gate ("tokens render in EN + HE (RTL); preview builds") without
 * flipping the still-dark un-migrated screens.
 */

import { useTheme } from '../../components/theme-provider';

const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  {
    title: 'Surface',
    tokens: [
      'background',
      'surface-container-lowest',
      'surface-container-low',
      'surface-container',
      'surface-container-high',
      'surface-container-highest',
      'surface-variant',
    ],
  },
  { title: 'Primary', tokens: ['primary', 'primary-container', 'on-primary-container', 'primary-fixed'] },
  { title: 'Secondary', tokens: ['secondary', 'secondary-container', 'on-secondary-container'] },
  { title: 'Tertiary', tokens: ['tertiary', 'tertiary-container', 'on-tertiary-container'] },
  { title: 'Error', tokens: ['error', 'error-container', 'on-error-container'] },
  { title: 'Outline / text', tokens: ['on-surface', 'on-surface-variant', 'outline', 'outline-variant'] },
];

const TYPE_SAMPLES: { cls: string; label: string }[] = [
  { cls: 'font-display text-display', label: 'Display · 40 / 600' },
  { cls: 'font-headline-lg text-headline-lg', label: 'Headline LG · 30 / 600' },
  { cls: 'font-headline-md text-headline-md', label: 'Headline MD · 24 / 600' },
  { cls: 'font-title-lg text-title-lg', label: 'Title LG · 20 / 500' },
  { cls: 'font-body-lg text-body-lg', label: 'Body LG · 16 / 400' },
  { cls: 'font-body-md text-body-md', label: 'Body MD · 14 / 400' },
  { cls: 'font-label-sm text-label-sm', label: 'Label SM · 12 / mono / +0.05em' },
];

const SPACING = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const RADII: { cls: string; label: string }[] = [
  { cls: 'rounded-sm', label: 'sm · buttons-tight' },
  { cls: 'rounded', label: 'DEFAULT · 4px · buttons' },
  { cls: 'rounded-lg', label: 'lg · 8px · cards' },
  { cls: 'rounded-xl', label: 'xl · 12px · modals' },
];

const HEALTH: { cls: string; label: string }[] = [
  { cls: 'bg-healthy', label: 'Healthy: System Core' },
  { cls: 'bg-attention', label: 'Needs Attention: Q4 Pipeline' },
  { cls: 'bg-action', label: 'Action Required: Auth latency' },
];

const COPY: Record<'en' | 'he', { heading: string; tagline: string; approve: string; sample: string }> = {
  en: {
    heading: 'Design System · Executive Intelligence v4.0',
    tagline: 'Authoritative, understated, built for high-stakes decisions.',
    approve: 'Approve Recommendation',
    sample:
      'Critical failure in the North Star deployment pipeline. I recommend immediate intervention to prevent Q4 slippage.',
  },
  he: {
    heading: 'מערכת עיצוב · בינה ניהולית גרסה 4.0',
    tagline: 'סמכותי, מאופק, בנוי להחלטות בסיכון גבוה.',
    approve: 'אישור ההמלצה',
    sample: 'כשל קריטי בצינור הפריסה של יעד-העל. אני ממליץ על התערבות מיידית כדי למנוע חריגה ברבעון הרביעי.',
  },
};

export default function DesignPreviewPage() {
  const { locale, dir, setLocale, mode, toggleMode } = useTheme();
  const t = COPY[locale];

  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg" dir={dir}>
      <div className="mx-auto max-w-5xl">
        {/* Header + controls */}
        <header className="mb-xl flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-display text-display text-on-surface">{t.heading}</h1>
            <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">{t.tagline}</p>
            <p className="mt-xs font-label-sm text-label-sm uppercase text-outline">
              dir={dir} · locale={locale} · mode={mode}
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}
              className="rounded bg-primary px-md py-xs font-label-md text-label-md text-on-primary transition active:scale-95"
            >
              {locale === 'en' ? 'עברית (RTL)' : 'English (LTR)'}
            </button>
            <button
              type="button"
              onClick={toggleMode}
              className="rounded border border-outline-variant bg-surface-container-lowest px-md py-xs font-label-md text-label-md text-on-surface transition active:scale-95"
            >
              {mode === 'operate' ? 'Switch to Build' : 'Switch to Operate'}
            </button>
          </div>
        </header>

        {/* Colors */}
        <Section title="Color tokens">
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {COLOR_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-sm font-label-sm text-label-sm uppercase text-on-surface-variant">
                  {group.title}
                </h3>
                <div className="space-y-xs">
                  {group.tokens.map((token) => (
                    <div key={token} className="flex items-center gap-sm">
                      <span
                        className={`h-8 w-8 shrink-0 rounded border border-outline-variant bg-${token}`}
                      />
                      <code className="font-label-sm text-label-sm text-on-surface-variant">{token}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Type scale">
          <div className="space-y-md">
            {TYPE_SAMPLES.map((s) => (
              <div key={s.label} className="border-b border-outline-variant pb-sm">
                <span className={`${s.cls} text-on-surface`}>The quick brown fox · שועל חום זריז</span>
                <span className="ms-md font-label-sm text-label-sm text-outline">{s.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Health triad */}
        <Section title="Health indicators (icon · status · label)">
          <div className="flex flex-col gap-sm">
            {HEALTH.map((h) => (
              <div key={h.label} className="flex items-center gap-sm font-body-md text-body-md text-on-surface">
                <span className={`h-2 w-2 rounded-full ${h.cls}`} />
                <span>{h.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Spacing + radius */}
        <Section title="Spacing & radius">
          <div className="grid gap-lg sm:grid-cols-2">
            <div>
              <h3 className="mb-sm font-label-sm text-label-sm uppercase text-on-surface-variant">Spacing</h3>
              <div className="flex items-end gap-sm">
                {SPACING.map((s) => (
                  <div key={s} className="text-center">
                    <div className={`bg-primary-container p-${s}`}>
                      <div className="h-4 w-4 bg-on-primary-container/40" />
                    </div>
                    <code className="font-label-sm text-label-sm text-outline">{s}</code>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-sm font-label-sm text-label-sm uppercase text-on-surface-variant">Radius</h3>
              <div className="flex flex-wrap gap-md">
                {RADII.map((r) => (
                  <div key={r.label} className="text-center">
                    <div className={`h-12 w-12 border border-outline-variant bg-surface-container-high ${r.cls}`} />
                    <code className="font-label-sm text-label-sm text-outline">{r.label}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Elevation + a representative card (logical padding proves RTL mirror) */}
        <Section title="Surface & elevation">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg shadow-ambient">
            <span className="inline-block rounded-sm bg-primary-container px-sm py-[2px] font-label-sm text-label-sm text-on-primary-container">
              DATA: HAVE
            </span>
            <p className="mt-sm border-s-4 border-primary ps-md font-body-lg text-body-lg text-on-surface">
              {t.sample}
            </p>
            <div className="mt-md flex gap-sm">
              <button
                type="button"
                className="rounded bg-primary px-md py-sm font-label-md text-label-md text-on-primary transition hover:opacity-90 active:scale-95"
              >
                {t.approve}
              </button>
              <button
                type="button"
                className="rounded border border-outline-variant bg-surface-container-lowest px-md py-sm font-label-md text-label-md text-on-surface"
              >
                {locale === 'en' ? 'Request Clarification' : 'בקשת הבהרה'}
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-xl">
      <h2 className="mb-md font-headline-md text-headline-md text-on-surface">{title}</h2>
      {children}
    </section>
  );
}
