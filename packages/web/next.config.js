/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    SITE_NAME: 'Moreyudeals',
    SITE_DESCRIPTION: '奥地利折扣优惠信息聚合平台',
  },
  experimental: {
    scrollRestoration: true,
  },
}

module.exports = nextConfig