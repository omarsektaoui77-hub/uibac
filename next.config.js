/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Temporarily disabled for Next.js 16 compatibility
})

const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
