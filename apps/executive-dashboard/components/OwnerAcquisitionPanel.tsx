import type { FoodTruckBusinessMetrics } from '@ai-company/shared-types';
import { Badge, Card, Stat } from './Card';

export function OwnerAcquisitionPanel({ metrics }: { metrics: FoodTruckBusinessMetrics }) {
  const { registry, acquisition, live } = metrics;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Phase 3A · Owner acquisition (FoodTruck-IL)</span>
        <Badge
          className={
            live ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'
          }
        >
          FoodTruck {live ? 'live' : 'mock'}
        </Badge>
      </div>

      <Card
        title="Truck registry"
        subtitle="Registered owners in FoodTruck-IL production database"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Total trucks" value={registry.totalRegisteredTrucks} />
          <Stat label="Approved" value={registry.approvedTrucks} />
          <Stat label="Pending" value={registry.pendingTrucks} />
          <Stat label="Active (7d)" value={registry.activeTrucks} />
          <Stat label="Activation rate" value={`${acquisition.activationRate}%`} />
        </div>
        {registry.rejectedTrucks > 0 ? (
          <p className="text-xs text-slate-500 mt-4">
            {registry.rejectedTrucks} rejected registration(s) on file.
          </p>
        ) : null}
      </Card>

      <Card title="Onboarding (30 days)" subtitle="Registrations and approvals — read-only">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="New registrations" value={acquisition.registrationsLast30Days} />
          <Stat label="Approvals" value={acquisition.approvalsLast30Days} />
        </div>
      </Card>
    </div>
  );
}
