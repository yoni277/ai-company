import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RegisteredProject } from '@ai-company/shared-types';
import {
  registerProjectBundleResolver,
  getProjectBundleResolver,
  type ProjectBundleResolver,
} from '../src/bundle-resolver-registry.js';
import { buildBundleForProject } from '../src/bundle-resolver.js';

// A — the generic package must not bake in any business resolver. A fresh
// import has no resolver for the FoodTruck connector type; the instance layer
// registers it at composition time.
test('A: no business resolver is baked into the generic package', () => {
  assert.equal(getProjectBundleResolver('foodtruck-business'), undefined);
});

// B — registration round-trips by connector type.
test('B: a registered resolver is retrievable by connector type', () => {
  const resolver: ProjectBundleResolver = {
    buildBundle: async () => {
      throw new Error('not invoked in this test');
    },
    buildFunnelSnapshot: async () => {
      throw new Error('not invoked in this test');
    },
  };
  registerProjectBundleResolver('test-type', resolver);
  assert.equal(getProjectBundleResolver('test-type'), resolver);
});

// C — an unknown connector type resolves to undefined (no fallback resolver).
test('C: an unregistered connector type resolves to undefined', () => {
  assert.equal(getProjectBundleResolver('never-registered'), undefined);
});

// D — with no resolver registered, the generic build path returns the generic
// mock bundle (analyzeFunnel/mockFunnelBundle): live=false, no project-specific
// briefDetail, and it does not throw or produce FoodTruck-shaped data. This path
// is DB-free (bundle-resolver.ts imports only the funnel/decision engines).
test('D: unregistered connector type → generic mock bundle, not FoodTruck, no throw', async () => {
  const project: RegisteredProject = {
    definition: {
      id: 'p1',
      slug: 'demo',
      name: 'Demo',
      description: '',
      status: 'active',
      enabled: true,
      sortOrder: 0,
    },
    funnel: {
      projectId: 'p1',
      projectSlug: 'demo',
      projectName: 'Demo',
      stages: [
        { id: 'lead', label: 'Lead', order: 0 },
        { id: 'active', label: 'Active', order: 1 },
      ],
      mockStageCounts: { lead: 10, active: 4 },
    },
    connector: {
      projectId: 'p1',
      projectSlug: 'demo',
      connectorType: 'unregistered-generic',
      enabled: true,
      liveCapable: false,
      config: {},
    },
  };

  const bundle = await buildBundleForProject(project);
  assert.equal(bundle.projectId, 'demo');
  assert.equal(bundle.live, false); // generic mock bundle passes live=false
  assert.equal(bundle.briefDetail, undefined); // FoodTruck bundle sets briefDetail; generic never does
});
