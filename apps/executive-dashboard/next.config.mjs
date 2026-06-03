/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@ai-company/shared-types',
    '@ai-company/database',
    '@ai-company/connector-framework',
    '@ai-company/ai-chief-of-staff',
    '@ai-company/connector-foodtruck-il',
    '@ai-company/connector-lab-os',
    '@ai-company/connector-inventory-engine',
    '@ai-company/connector-whatsapp-engine',
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
