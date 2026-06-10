'use client';

/**
 * OF-007 Phase 3 — "Context provided to this executive" render. Reads the
 * persisted executive_context_packs and shows exactly what was injected: the
 * Layer-1 company context and Layer-2 operational context (each already carrying
 * the FACTS / ASSUMPTIONS split) + the evidence status. Lets the CEO diagnose a
 * bad executive call as wrong-context vs wrong-reasoning vs missing-evidence.
 * EN/HE; empty-state-valid (no packs → honest empty, never fabricated).
 */

import type { PersistedContextPack } from '../../../lib/executive-os/context-pack-deps';

const L = {
  title: { en: 'Context provided to this executive', he: 'הקשר שסופק למנהל זה' },
  empty: {
    en: 'No context packs yet — this executive entered cold (or the feature is off for this business).',
    he: 'אין עדיין חבילות הקשר — המנהל נכנס ללא הקשר (או שהתכונה כבויה).',
  },
  company: { en: 'Company context (identity)', he: 'הקשר חברה (זהות)' },
  operational: { en: 'Operational context (task)', he: 'הקשר תפעולי (משימה)' },
  evidenceOn: { en: 'business evidence: included', he: 'ראיות עסקיות: נכללות' },
  evidenceOff: { en: 'business evidence: none', he: 'ראיות עסקיות: אין' },
  via: { en: 'via', he: 'דרך' },
} as const;

const pre = 'mt-xs max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-outline-variant bg-surface-container-lowest p-sm font-mono text-label-sm text-on-surface';

export function ContextProvidedPanel({ packs, he }: { packs: PersistedContextPack[]; he: boolean }) {
  const t = (p: { en: string; he: string }) => (he ? p.he : p.en);

  return (
    <section className="mb-xl">
      <h2 className="mb-md font-headline-md text-headline-md text-on-surface">
        {t(L.title)}{' '}
        <span className="font-label-sm text-label-sm text-outline">{packs.length}</span>
      </h2>

      {packs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-lg font-body-md text-body-md text-on-surface-variant">
          {t(L.empty)}
        </p>
      ) : (
        <ul className="space-y-md">
          {packs.map((p, i) => {
            const evidenceOn = p.pack.facts.evidence.available;
            return (
              <li key={p.id} className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <span className="font-title-sm text-title-sm text-on-surface">
                    {p.purpose}
                    {p.sourceKind ? (
                      <span className="ms-xs font-label-sm text-label-sm text-on-surface-variant">
                        {t(L.via)} {p.sourceKind}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {p.assembledAt.slice(0, 16).replace('T', ' ')} ·{' '}
                    <span className={evidenceOn ? 'text-healthy' : 'text-on-surface-variant'}>
                      {evidenceOn ? t(L.evidenceOn) : t(L.evidenceOff)}
                    </span>
                  </span>
                </div>

                <details open={i === 0} className="mt-sm">
                  <summary className="cursor-pointer font-label-md text-label-md text-primary">
                    {t(L.company)} · {t(L.operational)}
                  </summary>
                  <p className="mt-sm font-label-sm text-label-sm uppercase text-on-surface-variant">{t(L.company)}</p>
                  <pre className={pre}>{p.pack.companyContext}</pre>
                  <p className="mt-sm font-label-sm text-label-sm uppercase text-on-surface-variant">{t(L.operational)}</p>
                  <pre className={pre}>{p.pack.operationalContext}</pre>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
