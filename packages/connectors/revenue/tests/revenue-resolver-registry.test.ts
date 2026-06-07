import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerRevenueConnectorResolver,
  getRevenueConnectorResolver,
  type RevenueConnectorResolver,
} from '../src/revenue-resolver-registry.js';

// A — the generic package must not bake in any business revenue factory. A
// fresh import has no factory for the FoodTruck live-events source; the instance
// layer registers it at composition time.
test('A: no business revenue resolver is baked into the generic package', () => {
  assert.equal(getRevenueConnectorResolver('foodtruck-supabase-events'), undefined);
});

// B — registration round-trips by revenue source.
test('B: a registered factory is retrievable by revenue source', () => {
  const factory: RevenueConnectorResolver = () => {
    throw new Error('not invoked in this test');
  };
  registerRevenueConnectorResolver('test-source', factory);
  assert.equal(getRevenueConnectorResolver('test-source'), factory);
});

// C — an unknown revenue source resolves to undefined (no fallback factory).
test('C: an unregistered revenue source resolves to undefined', () => {
  assert.equal(getRevenueConnectorResolver('never-registered'), undefined);
});

// OPTIONAL D — DROPPED → Cowork lane.
// The generic mock-revenue fallback lives in revenue/src/index.ts
// (createRevenueConnectorForProject), whose module imports
// @ai-company/project-registry, which imports @ai-company/database at module
// load. Per the work order's self-containment rule, exercising that fallback is
// not a dependency-free unit test and belongs to Cowork's runtime lane.
