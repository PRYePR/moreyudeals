import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Moreyu Deals | 墨鱼折扣 - 奥地利优惠信息聚合',
  description: '奥地利优惠信息聚合平台，自动收集并翻译奥地利商家优惠信息。Automatically collect and translate Austrian deals and discounts.',
  keywords: '奥地利折扣, 德国优惠, Austrian deals, Gutscheine, Rabatte, 翻译, 优惠券',
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
        <div className="flex flex-col min-h-screen">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-primary-600">
                    Moreyu Deals
                  </h1>
                  <span className="text-sm text-gray-500 hidden md:inline">
                    墨鱼折扣 - 奥地利优惠信息
                  </span>
                </div>
                <nav className="flex items-center space-x-6">
                  <a href="/" className="text-gray-700 hover:text-primary-600 transition-colors">
                    首页
                  </a>
                  <a href="/deals" className="text-gray-700 hover:text-primary-600 transition-colors">
                    所有优惠
                  </a>
                  <a href="/categories" className="text-gray-700 hover:text-primary-600 transition-colors">
                    分类
                  </a>
                </nav>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Moreyu Deals</h3>
                  <p className="text-gray-300 text-sm">
                    奥地利优惠信息聚合平台，为您提供最新的奥地利商家折扣信息。
                  </p>
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-4">快速链接</h4>
                  <div className="space-y-2">
                    <a href="/deals" className="block text-gray-300 hover:text-white text-sm transition-colors">
                      所有优惠
                    </a>
                    <a href="/categories" className="block text-gray-300 hover:text-white text-sm transition-colors">
                      优惠分类
                    </a>
                    <a href="/about" className="block text-gray-300 hover:text-white text-sm transition-colors">
                      关于我们
                    </a>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-4">免责声明</h4>
                  <p className="text-gray-300 text-xs">
                    本站内容由机器翻译生成，仅供参考。优惠信息的准确性请以商家官方为准。
                    翻译结果可能存在偏差，使用前请核实。
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-700 mt-8 pt-8 text-center">
                <p className="text-gray-400 text-sm">
                  © 2024 Moreyu Deals. 内容由机器翻译自奥地利商家官方信息。
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}