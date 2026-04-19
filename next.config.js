/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Disable PWA in development (fixes build errors)
})

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
})
