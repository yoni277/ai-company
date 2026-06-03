'use client';

import { useState } from 'react';
import type { DailyBrief } from '@ai-company/shared-types';
import { ProductionMetricsPanel } from './ProductionMetrics';
import { DailyBriefButton } from './DailyBriefButton';
import type { Phase2Snapshot } from '@ai-company/shared-types';

export function ProductionMetricsClient({
  snapshot,
  initialBrief,
}: {
  snapshot: Phase2Snapshot;
  initialBrief: DailyBrief;
}) {
  const [brief, setBrief] = useState(initialBrief);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DailyBriefButton onBrief={setBrief} />
      </div>
      <ProductionMetricsPanel snapshot={snapshot} dailyBrief={brief} />
    </div>
  );
}
