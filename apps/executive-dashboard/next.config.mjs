import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16 moved typedRoutes out of `experimental`.
  typedRoutes: true,
  // Pin the workspace root so Next stops guessing at ~/package-lock.json.
  turbopack: {
    root: path.resolve(__dirname, '../..'),
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
    '@ai-company/connector-foodtruck-il',
    '@ai-company/connector-lab-os',
    '@ai-company/connector-inventory-engine',
    '@ai-company/connector-whatsapp-engine',
    '@ai-company/connector-github',
    '@ai-company/connector-supabase',
    '@ai-company/connector-foodtruck-business',
    '@ai-company/health-score',
  ],
};

export default nextConfig;
