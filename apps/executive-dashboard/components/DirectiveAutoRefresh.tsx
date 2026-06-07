'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls `router.refresh()` on a fixed interval while any executive on this
 * directive is still pending a response. The server component re-renders
 * each tick and the parent page decides when to stop polling (by passing
 * `pending={false}`).
 *
 * Kept dumb on purpose — server is the source of truth, this component just
 * nudges Next.js to re-fetch the RSC payload.
 */
export function DirectiveAutoRefresh({
  pending,
  intervalMs = 5000,
}: {
  pending: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [pending, intervalMs, router]);
  return null;
}
