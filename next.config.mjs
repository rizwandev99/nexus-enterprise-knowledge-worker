/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'pg', '@opentelemetry/sdk-node'],
};

export default nextConfig;

