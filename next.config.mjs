import createNextIntlPlugin from "next-intl/plugin";
import withPWA from 'next-pwa';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

export default withPWAConfig(withNextIntl(nextConfig));
