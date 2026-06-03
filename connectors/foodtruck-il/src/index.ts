import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  DataConnector,
  MetricInput,
  OpportunityCandidate,
  ProjectStatusSnapshot,
  RiskCandidate,
} from '@ai-company/shared-types';
import { mockSnapshot, mockMetrics, mockRisks, mockOpportunities } from './mock-data';

export interface FoodTruckIlConnectorConfig {
  /** Supabase URL of the Foodtruck project (NOT the ai_company host project, even when they're the same). */
  supabaseUrl: string;
  /** Service-role key. Required for unrestricted reads regardless of RLS. */
  serviceRoleKey: string;
}

/**
 * Real FoodTruck-IL connector. Queries the Foodtruck Supabase project's `public` schema
 * for trucks, ratings, favorites, and analytics events; derives platform-level metrics,
 * risks, and opportunities from them.
 *
 * If constructed without credentials (or used in tests), falls back to the mock dataset
 * so the dashboard still renders. The connector contract is satisfied either way.
 */
export class FoodTruckIlConnector implements DataConnector {
  readonly name = 'foodtruck-il';
  readonly projectSlug = 'foodtruck-il';
  readonly displayName = 'FoodTruck-IL';

  private readonly client: SupabaseClient | null;

  constructor(config?: FoodTruckIlConnectorConfig) {
    this.client =
      config && config.supabaseUrl && config.serviceRoleKey
        ? createClient(config.supabaseUrl, config.serviceRoleKey, {
            auth: { persistSession: false },
            db: { schema: 'public' },
          })
        : null;
  }

  private get live(): boolean {
    return this.client !== null;
  }

  async getStatus(): Promise<ProjectStatusSnapshot> {
    if (!this.live) return mockSnapshot();

    const counts = await this.fetchCounts();
    const pending = counts.pendingTrucks;
    const events = counts.events7d;

    const health: ProjectStatusSnapshot['health'] =
      pending >= 5 || events === 0 ? 'at_risk' : 'healthy';
    const headline =
      pending >= 5
        ? `${pending} trucks awaiting approval — review backlog growing.`
        : events === 0
          ? 'No analytics events in the last 7 days — engagement signal missing.'
          : `${counts.approvedTrucks} approved truck(s) live; ${events} event(s) in last 7 days.`;

    return {
      health,
      headline,
      detail: `${counts.totalTrucks} total · ${counts.totalUsers} users · ${counts.totalRatings} ratings`,
      asOf: new Date().toISOString(),
    };
  }

  async getMetrics(): Promise<MetricInput[]> {
    if (!this.live) return mockMetrics();

    const c = await this.fetchCounts();
    return [
      { name: 'total_trucks', value: c.totalTrucks, unit: 'count' },
      { name: 'approved_trucks', value: c.approvedTrucks, unit: 'count' },
      { name: 'pending_trucks', value: c.pendingTrucks, unit: 'count' },
      { name: 'verified_owner_trucks', value: c.verifiedOwnerTrucks, unit: 'count' },
      { name: 'total_users', value: c.totalUsers, unit: 'count' },
      { name: 'total_ratings', value: c.totalRatings, unit: 'count' },
      { name: 'total_favorites', value: c.totalFavorites, unit: 'count' },
      { name: 'events_last_7d', value: c.events7d, unit: 'count' },
      { name: 'active_users_last_7d', value: c.activeUsers7d, unit: 'count' },
    ];
  }

  async getRisks(): Promise<RiskCandidate[]> {
    if (!this.live) return mockRisks();

    const c = await this.fetchCounts();
    const risks: RiskCandidate[] = [];

    if (c.pendingTrucks >= 10) {
      risks.push({
        severity: 'high',
        description: `Truck-approval backlog: ${c.pendingTrucks} trucks pending review. Owner trust degrades when approvals stall.`,
      });
    } else if (c.pendingTrucks >= 3) {
      risks.push({
        severity: 'medium',
        description: `${c.pendingTrucks} trucks awaiting approval. Review queue should be drained weekly.`,
      });
    }

    if (c.totalTrucks > 0 && c.events7d === 0) {
      risks.push({
        severity: 'medium',
        description:
          'Zero analytics events recorded in the last 7 days. Either tracking is broken or engagement has collapsed.',
      });
    }

    if (c.totalRatings > 0 && c.ratingsWithoutOwnerReplyOlderThan7d > 0) {
      risks.push({
        severity: 'low',
        description: `${c.ratingsWithoutOwnerReplyOlderThan7d} customer review(s) over 7 days old with no owner reply.`,
      });
    }

    return risks;
  }

  async getOpportunities(): Promise<OpportunityCandidate[]> {
    if (!this.live) return mockOpportunities();

    const c = await this.fetchCounts();
    const opps: OpportunityCandidate[] = [];

    const unverified = c.approvedTrucks - c.verifiedOwnerTrucks;
    if (unverified >= 3) {
      opps.push({
        priority: 'medium',
        description: `${unverified} approved trucks have unverified owners — run a verification campaign to lift trust badges.`,
      });
    }

    if (c.totalRatings > 0 && c.totalRatings < c.totalTrucks) {
      opps.push({
        priority: 'medium',
        description: `Only ${c.totalRatings} review(s) across ${c.totalTrucks} trucks — prompt favoriters to leave a rating after recent events.`,
      });
    }

    if (c.activeUsers7d > 0 && c.totalUsers > 0 && c.activeUsers7d / c.totalUsers > 0.5) {
      opps.push({
        priority: 'high',
        description: `${Math.round((c.activeUsers7d / c.totalUsers) * 100)}% of registered users were active this week — push notifications would land warm.`,
      });
    }

    return opps;
  }

  /** Single batched read so each connector run hits Supabase ~once. */
  private async fetchCounts(): Promise<Counts> {
    if (!this.client) throw new Error('FoodTruckIlConnector: client unavailable');
    const c = this.client;

    const head = { count: 'exact' as const, head: true };
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [
      total,
      approved,
      pending,
      verified,
      users,
      ratings,
      favorites,
      events,
      activeUsers,
      staleRatings,
    ] = await Promise.all([
      c.from('trucks').select('*', head),
      c.from('trucks').select('*', head).eq('status', 'approved'),
      c.from('trucks').select('*', head).eq('status', 'pending'),
      c.from('trucks').select('*', head).eq('verified_owner', true),
      c.from('user_profiles').select('*', head),
      c.from('ratings').select('*', head),
      c.from('favorites').select('*', head),
      c.from('truck_events').select('*', head).gte('created_at', sevenDaysAgo),
      // distinct active users in last 7d — small dataset; pull rows + dedupe client-side
      c
        .from('truck_events')
        .select('user_id')
        .gte('created_at', sevenDaysAgo)
        .not('user_id', 'is', null),
      c
        .from('ratings')
        .select('*', head)
        .is('owner_reply', null)
        .not('body', 'is', null)
        .lt('created_at', sevenDaysAgo),
    ]);

    const distinctActive = new Set(
      ((activeUsers.data ?? []) as Array<{ user_id: string | null }>)
        .map((r) => r.user_id)
        .filter((x): x is string => !!x),
    ).size;

    return {
      totalTrucks: total.count ?? 0,
      approvedTrucks: approved.count ?? 0,
      pendingTrucks: pending.count ?? 0,
      verifiedOwnerTrucks: verified.count ?? 0,
      totalUsers: users.count ?? 0,
      totalRatings: ratings.count ?? 0,
      totalFavorites: favorites.count ?? 0,
      events7d: events.count ?? 0,
      activeUsers7d: distinctActive,
      ratingsWithoutOwnerReplyOlderThan7d: staleRatings.count ?? 0,
    };
  }
}

interface Counts {
  totalTrucks: number;
  approvedTrucks: number;
  pendingTrucks: number;
  verifiedOwnerTrucks: number;
  totalUsers: number;
  totalRatings: number;
  totalFavorites: number;
  events7d: number;
  activeUsers7d: number;
  ratingsWithoutOwnerReplyOlderThan7d: number;
}
