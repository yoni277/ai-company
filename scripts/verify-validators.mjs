#!/usr/bin/env node
// Self-contained smoke test for the 7 executive output validators.
// Inlines each validator's runtime logic (no @ai-company/shared-types needed at runtime —
// those are type-only imports). Exercises:
//   - valid minimal payload (empty arrays) → must pass
//   - missing optional array field           → must pass, defaults to []
//   - missing required scalar                → must throw
//   - non-array where array expected         → must throw
//
// Run: node scripts/verify-validators.mjs

const validators = {};

// ---------- VP Marketing ----------
validators.vpMarketing = (value) => {
  if (!value || typeof value !== 'object') throw new Error('VpMarketingOutput: not an object');
  const v = value;
  if (typeof v.headline !== 'string') throw new Error('VpMarketingOutput: missing or non-string field "headline"');
  if (typeof v.marketingHealth !== 'string') throw new Error('VpMarketingOutput: missing or non-string field "marketingHealth"');
  const arr = (name) => {
    const raw = v[name];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new Error(`VpMarketingOutput: "${name}" must be an array when present`);
    return raw;
  };
  return {
    headline: v.headline, marketingHealth: v.marketingHealth,
    perProjectMarketing: arr('perProjectMarketing'),
    campaignIdeas: arr('campaignIdeas'),
    growthRisks: arr('growthRisks'),
    marketingPriorities: arr('marketingPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
};

// ---------- CTO ----------
validators.cto = (value) => {
  if (!value || typeof value !== 'object') throw new Error('CtoOutput: not an object');
  const v = value;
  if (typeof v.headline !== 'string') throw new Error('CtoOutput: missing or non-string field "headline"');
  if (typeof v.platformHealth !== 'string') throw new Error('CtoOutput: missing or non-string field "platformHealth"');
  const arr = (name) => {
    const raw = v[name];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new Error(`CtoOutput: "${name}" must be an array when present`);
    return raw;
  };
  return {
    headline: v.headline, platformHealth: v.platformHealth,
    perProjectEngineering: arr('perProjectEngineering'),
    topTechnicalRisks: arr('topTechnicalRisks'),
    techDebtItems: arr('techDebtItems'),
    engineeringPriorities: arr('engineeringPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
};

// ---------- COO ----------
validators.coo = (value) => {
  if (!value || typeof value !== 'object') throw new Error('CooOutput: not an object');
  const v = value;
  if (typeof v.headline !== 'string') throw new Error('CooOutput: missing or non-string field "headline"');
  if (typeof v.operationsHealth !== 'string') throw new Error('CooOutput: missing or non-string field "operationsHealth"');
  const arr = (name) => {
    const raw = v[name];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new Error(`CooOutput: "${name}" must be an array when present`);
    return raw;
  };
  return {
    headline: v.headline, operationsHealth: v.operationsHealth,
    perProjectOperations: arr('perProjectOperations'),
    bottlenecks: arr('bottlenecks'),
    vendorHealth: arr('vendorHealth'),
    operationalPriorities: arr('operationalPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
};

// ---------- CFO ----------
validators.cfo = (value) => {
  if (!value || typeof value !== 'object') throw new Error('CfoOutput: not an object');
  const v = value;
  if (typeof v.headline !== 'string') throw new Error('CfoOutput: missing or non-string field "headline"');
  if (typeof v.financialHealth !== 'string') throw new Error('CfoOutput: missing or non-string field "financialHealth"');
  const arr = (name) => {
    const raw = v[name];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new Error(`CfoOutput: "${name}" must be an array when present`);
    return raw;
  };
  const result = {
    headline: v.headline, financialHealth: v.financialHealth,
    perProjectFinancials: arr('perProjectFinancials'),
    financialRisks: arr('financialRisks'),
    capitalAllocations: arr('capitalAllocations'),
    financialPriorities: arr('financialPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
  if (v.cashSnapshot && typeof v.cashSnapshot === 'object') result.cashSnapshot = v.cashSnapshot;
  return result;
};

// ---------- VP Sales ----------
validators.vpSales = (value) => {
  if (!value || typeof value !== 'object') throw new Error('VpSalesOutput: not an object');
  const v = value;
  if (typeof v.headline !== 'string') throw new Error('VpSalesOutput: missing or non-string field "headline"');
  if (typeof v.salesHealth !== 'string') throw new Error('VpSalesOutput: missing or non-string field "salesHealth"');
  const arr = (name) => {
    const raw = v[name];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new Error(`VpSalesOutput: "${name}" must be an array when present`);
    return raw;
  };
  const result = {
    headline: v.headline, salesHealth: v.salesHealth,
    perProjectSales: arr('perProjectSales'),
    deals: arr('deals'),
    salesRisks: arr('salesRisks'),
    salesPriorities: arr('salesPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
  if (v.forecastSummary && typeof v.forecastSummary === 'object') result.forecastSummary = v.forecastSummary;
  return result;
};

// ---------- Chief of Staff ----------
validators.chiefOfStaff = (value) => {
  if (!value || typeof value !== 'object') throw new Error('ChiefOfStaffOutput: not an object');
  const v = value;
  if (typeof v.headline !== 'string') throw new Error('ChiefOfStaffOutput: missing or non-string field "headline"');
  if (typeof v.companyHealth !== 'string') throw new Error('ChiefOfStaffOutput: missing or non-string field "companyHealth"');
  const arr = (name) => {
    const raw = v[name];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new Error(`ChiefOfStaffOutput: "${name}" must be an array when present`);
    return raw;
  };
  return {
    headline: v.headline, companyHealth: v.companyHealth,
    perProject: arr('perProject'),
    topRisks: arr('topRisks'),
    topOpportunities: arr('topOpportunities'),
    ceoPriorities: arr('ceoPriorities'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
};

// ---------- Executive Team ----------
validators.executiveTeam = (value) => {
  if (!value || typeof value !== 'object') throw new Error('BoardDigestOutput: not an object');
  const v = value;
  if (typeof v.headline !== 'string') throw new Error('BoardDigestOutput: missing or non-string field "headline"');
  if (typeof v.companyVerdict !== 'string') throw new Error('BoardDigestOutput: missing or non-string field "companyVerdict"');
  const arr = (name) => {
    const raw = v[name];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new Error(`BoardDigestOutput: "${name}" must be an array when present`);
    return raw;
  };
  return {
    headline: v.headline, companyVerdict: v.companyVerdict,
    executiveSnapshot: arr('executiveSnapshot'),
    convergentThemes: arr('convergentThemes'),
    tensions: arr('tensions'),
    strategicMoves: arr('strategicMoves'),
    ceoOpenQuestions: arr('ceoOpenQuestions'),
    generatedAt: typeof v.generatedAt === 'string' ? v.generatedAt : new Date().toISOString(),
  };
};

// ---------- Test fixtures ----------
const fixtures = [
  // VP Marketing — the one that was 500-ing
  { exec: 'vpMarketing', label: 'valid minimal (all empty arrays present)', input: { headline: 'h', marketingHealth: 'healthy', perProjectMarketing: [], campaignIdeas: [], growthRisks: [], marketingPriorities: [] }, expect: 'pass' },
  { exec: 'vpMarketing', label: 'growthRisks omitted (the bug)',            input: { headline: 'h', marketingHealth: 'healthy', perProjectMarketing: [], campaignIdeas: [], marketingPriorities: [] }, expect: 'pass-defaults-empty', defaultedField: 'growthRisks' },
  { exec: 'vpMarketing', label: 'missing headline',                          input: { marketingHealth: 'healthy' },                                                                                  expect: 'throw' },
  { exec: 'vpMarketing', label: 'non-array growthRisks',                     input: { headline: 'h', marketingHealth: 'healthy', growthRisks: 'oops' },                                              expect: 'throw' },

  // CTO
  { exec: 'cto',          label: 'valid minimal',                       input: { headline: 'h', platformHealth: 'healthy' }, expect: 'pass-defaults-empty', defaultedField: 'techDebtItems' },
  { exec: 'cto',          label: 'missing platformHealth',              input: { headline: 'h' },                            expect: 'throw' },

  // COO
  { exec: 'coo',          label: 'valid minimal',                       input: { headline: 'h', operationsHealth: 'healthy' }, expect: 'pass-defaults-empty', defaultedField: 'vendorHealth' },
  { exec: 'coo',          label: 'missing operationsHealth',            input: { headline: 'h' },                              expect: 'throw' },

  // CFO
  { exec: 'cfo',          label: 'valid minimal',                       input: { headline: 'h', financialHealth: 'healthy' }, expect: 'pass-defaults-empty', defaultedField: 'capitalAllocations' },
  { exec: 'cfo',          label: 'missing financialHealth',             input: { headline: 'h' },                             expect: 'throw' },
  { exec: 'cfo',          label: 'with cashSnapshot',                   input: { headline: 'h', financialHealth: 'healthy', cashSnapshot: { commentary: 'no data' } }, expect: 'pass' },

  // VP Sales
  { exec: 'vpSales',      label: 'valid minimal',                       input: { headline: 'h', salesHealth: 'healthy' },     expect: 'pass-defaults-empty', defaultedField: 'deals' },
  { exec: 'vpSales',      label: 'missing salesHealth',                 input: { headline: 'h' },                             expect: 'throw' },
  { exec: 'vpSales',      label: 'with forecastSummary',                input: { headline: 'h', salesHealth: 'healthy', forecastSummary: { commentary: 'pre-CRM' } }, expect: 'pass' },

  // Chief of Staff
  { exec: 'chiefOfStaff', label: 'valid minimal',                       input: { headline: 'h', companyHealth: 'healthy' },   expect: 'pass-defaults-empty', defaultedField: 'topOpportunities' },
  { exec: 'chiefOfStaff', label: 'missing companyHealth',               input: { headline: 'h' },                             expect: 'throw' },

  // Executive Team
  { exec: 'executiveTeam', label: 'valid minimal',                      input: { headline: 'h', companyVerdict: 'healthy' },  expect: 'pass-defaults-empty', defaultedField: 'tensions' },
  { exec: 'executiveTeam', label: 'missing companyVerdict',             input: { headline: 'h' },                             expect: 'throw' },
  { exec: 'executiveTeam', label: 'tensions as object (not array)',     input: { headline: 'h', companyVerdict: 'healthy', tensions: { wrong: true } }, expect: 'throw' },

  // Cross-cutting: not an object
  { exec: 'vpMarketing',   label: 'null input',                         input: null,                                          expect: 'throw' },
];

// ---------- Runner ----------
let pass = 0, fail = 0;
const failures = [];

for (const t of fixtures) {
  const v = validators[t.exec];
  let actual = null, threw = null;
  try {
    actual = v(t.input);
  } catch (err) {
    threw = err.message;
  }

  let ok = false;
  if (t.expect === 'pass') ok = !threw;
  else if (t.expect === 'throw') ok = !!threw;
  else if (t.expect === 'pass-defaults-empty') {
    ok = !threw && Array.isArray(actual?.[t.defaultedField]) && actual[t.defaultedField].length === 0;
  }

  if (ok) {
    pass++;
    process.stdout.write(`\x1b[32m✓\x1b[0m ${t.exec.padEnd(15)} ${t.label}\n`);
  } else {
    fail++;
    failures.push({ ...t, threw, actual });
    process.stdout.write(`\x1b[31m✗\x1b[0m ${t.exec.padEnd(15)} ${t.label} — expected=${t.expect} threw=${threw} got=${JSON.stringify(actual).slice(0, 80)}\n`);
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
