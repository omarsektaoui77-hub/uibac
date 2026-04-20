import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
// import { withSentryConfig } from "@sentry/nextjs";
 
const withNextIntl = createNextIntlPlugin();
 
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
};
 
// Sentry temporarily disabled for Next.js 14 compatibility
// export default withSentryConfig(
//   withNextIntl(nextConfig),
//   {
//     silent: true,
//   }
// );

export default withNextIntl(nextConfig);