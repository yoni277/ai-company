import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16 moved typedRoutes out of `experimental`.
  typedRoutes: true,
  // Pin the workspace root so Next stops guessing at ~/package-lock.json.
  turbopack: {
    root: repoRoot,
    // Instance files live outside apps/executive-dashboard. Turbopack requires
    // repo-relative paths here (absolute paths break with "server relative imports").
    resolveAlias: {
      '@active-instance/instance-seed': '../../instances/yoni-company/instance-seed.ts',
      '@active-instance/instance-connectors':
        '../../instances/yoni-company/instance-connectors.ts',
      '@active-instance/project-registry-seed':
        '../../instances/yoni-company/project-registry-seed.ts',
      '@active-instance/project-executive-metadata':
        '../../instances/yoni-company/project-executive-metadata.ts',
      '@active-instance/governance-policy':
        '../../instances/yoni-company/governance-policy.ts',
      '@active-instance/research-capability':
        '../../instances/yoni-company/research-capability.ts',
    },
  },
  transpilePackages: [
    '@ai-company/shared-types',
    '@ai-company/database',
    '@ai-company/connector-framework',
    '@ai-company/ai-chief-of-staff',
    '@ai-company/ai-cto',
    '@ai-company/ai-vp-marketing',
    '@ai-company/ai-cfo',
    '@ai-company/ai-coo',
    '@ai-company/ai-vp-sales',
    '@ai-company/ai-executive-team',
    '@ai-company/connector-foodtruck-il',
    '@ai-company/connector-lab-os',
    '@ai-company/connector-inventory-engine',
    '@ai-company/connector-whatsapp-engine',
    '@ai-company/connector-github',
    '@ai-company/connector-supabase',
    '@ai-company/connector-foodtruck-business',
    '@ai-company/business-funnel-engine',
    '@ai-company/decision-support-engine',
    '@ai-company/portfolio-intelligence-engine',
    '@ai-company/connector-portfolio-intelligence',
    '@ai-company/project-registry',
    '@ai-company/revenue-intelligence-engine',
    '@ai-company/financial-intelligence-engine',
    '@ai-company/connector-revenue',
    '@ai-company/health-score',
    '@ai-company/doos-core',
  ],
};

export default nextConfig;
