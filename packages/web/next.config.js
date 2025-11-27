/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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
    // 强制 Vercel 识别配置变更
    BUILD_ID: Date.now().toString(),
  },
  experimental: {
    scrollRestoration: true,
  },
  // 确保生产环境也使用 unoptimized
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
}

module.exports = nextConfig