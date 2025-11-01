import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Moreyu Deals | 墨鱼折扣 - 奥地利优惠信息聚合',
  description: '奥地利优惠信息聚合平台，自动收集并翻译奥地利商家优惠信息。Automatically collect and translate Austrian deals and discounts.',
  keywords: '奥地利折扣, 奥地利优惠, Austrian deals, Gutscheine, Rabatte, 翻译, 优惠券',
  openGraph: {
    title: 'Moreyu Deals | 墨鱼折扣 - 奥地利优惠信息聚合',
    description: '奥地利优惠信息聚合平台，自动收集并翻译奥地利商家优惠信息',
    type: 'website',
    locale: 'de_AT',
    alternateLocale: ['zh_CN', 'en_US'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="author" content="Moreyu Deals" />
        <meta name="generator" content="Next.js" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}