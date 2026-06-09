'use client';

/** L31 — business selector. Switches the (executive_id, project_slug) scope by
 * navigating with ?project_slug=. Keeps the workspace strictly per-business. */

import { useRouter } from 'next/navigation';

export function BusinessSelector({
  businesses,
  current,
  basePath,
}: {
  businesses: Array<{ slug: string; name: string }>;
  current: string;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-sm">
      <span className="font-label-sm text-label-sm uppercase text-outline">Business</span>
      <select
        value={current}
        onChange={(e) => router.push(`${basePath}?project_slug=${encodeURIComponent(e.target.value)}` as never)}
        className="h-10 rounded border border-outline-variant bg-surface-container-lowest px-md font-body-md text-body-md text-on-surface"
      >
        {businesses.map((b) => (
          <option key={b.slug} value={b.slug}>{b.name}</option>
        ))}
      </select>
    </label>
  );
}
