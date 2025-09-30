/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  env: {
    SITE_NAME: 'Moreyudeals',
    SITE_DESCRIPTION: '奥地利折扣优惠信息聚合平台',
  },
}

module.exports = nextConfig