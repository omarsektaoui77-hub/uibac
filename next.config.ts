import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
 
const withNextIntl = createNextIntlPlugin();
 
const nextConfig: NextConfig = {
  reactStrictMode: true,
 
  turbopack: {
    root: process.cwd(),
  },
 
  serverExternalPackages: ["pdf-parse"],
};
 
export default withSentryConfig(
  withNextIntl(nextConfig),
  {
    silent: true,
  }
);