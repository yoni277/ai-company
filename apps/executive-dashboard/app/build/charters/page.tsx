/**
 * D061 / D065 · P056-v2 step 7 — Role Charters (/build/charters).
 *
 * The platform's executive role definitions. Per v2-DATA-MAPPING.md these are a
 * NEW-FIELD — mandates are not stored today — so the page renders the standard,
 * business-agnostic role definitions from a static source and tags every card
 * DATA: NEW FIELD honestly (no fabricated "stored" data).
 *
 * Build-zone screen — the sidebar defaults to Build mode on /build/*.
 */

import { DataTag } from '../../../components/ds';
import { ROLE_CHARTERS } from '../../../lib/build-zone-data';

export default function RoleChartersPage() {
  return (
    <div className="ds-surface min-h-screen px-md py-lg sm:px-lg">
      <div className="mx-auto max-w-5xl">
        <header className="mb-xl">
          <h1 className="font-display text-display text-on-surface">Role Charters</h1>
          <p className="mt-xs font-body-lg text-body-lg text-on-surface-variant">
            Standard mandates for each AI executive. Not stored yet — these are the platform&apos;s
            role definitions, tagged honestly.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
          {ROLE_CHARTERS.map((c) => (
            <article
              key={c.role}
              className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
            >
              <header className="flex items-start justify-between gap-sm">
                <h2 className="font-title-lg text-title-lg font-bold text-on-surface">{c.role}</h2>
                <DataTag kind="NEW FIELD" />
              </header>
              <p className="mt-sm font-body-md text-body-md italic text-on-surface-variant">
                &ldquo;{c.mandate}&rdquo;
              </p>

              <h3 className="mt-md font-label-sm text-label-sm uppercase text-outline">Core Responsibilities</h3>
              <ul className="mt-xs space-y-xs">
                {c.responsibilities.map((r) => (
                  <li key={r} className="flex items-start gap-sm font-body-md text-body-md text-on-surface">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>

              <h3 className="mt-md font-label-sm text-label-sm uppercase text-outline">Decision Authority</h3>
              <ul className="mt-xs space-y-xs">
                {c.authority.map((a) => (
                  <li key={a} className="flex items-start gap-sm font-body-md text-body-md text-on-surface">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-healthy" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mt-xl border-t border-outline-variant pt-lg text-center font-label-sm text-label-sm uppercase tracking-widest text-outline">
          <DataTag kind="NEW FIELD" /> <span className="ms-sm align-middle">Role charters are not stored today — render-only mandates</span>
        </p>
      </div>
    </div>
  );
}
