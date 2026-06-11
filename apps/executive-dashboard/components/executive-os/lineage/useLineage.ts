'use client';

/**
 * D086 Phase 1 — lazy lineage fetch. Calls GET /api/lineage ON DEMAND (when an
 * expander opens or the Inspector mounts a selection), never on initial page
 * render — initial payloads stay unchanged (P051–P055 lazy-mount class).
 */
import { useEffect, useState } from 'react';
import type { CommunicationTimeline } from '../../../lib/executive-os/communication-timeline-core';
import type {
  LineageActionTargets,
} from '../../../lib/executive-os/communication-timeline';

export interface LineagePayload {
  timeline: CommunicationTimeline;
  actions: LineageActionTargets;
}

export interface LineageState {
  data: LineagePayload | null;
  loading: boolean;
  error: boolean;
}

export function useLineage(type: string | null, id: string | null): LineageState {
  const [state, setState] = useState<LineageState>({ data: null, loading: false, error: false });

  useEffect(() => {
    if (!type || !id) {
      setState({ data: null, loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: false });
    fetch(`/api/lineage?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as LineagePayload;
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  return state;
}
