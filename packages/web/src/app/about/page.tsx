import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            关于 Moreyu Deals
          </h1>
          <p className="text-xl text-gray-600">
            奥地利优惠信息聚合平台，让您轻松获取最新折扣信息
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* What We Do */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              🎯 我们的使命
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Moreyu Deals 致力于为用户提供最新、最全面的奥地利商家优惠信息。
                我们通过自动化技术收集来自各大德国电商平台和优惠网站的折扣信息，
                并提供中文翻译，帮助中文用户更好地理解和利用这些优惠。
              </p>
              <p>
                我们的平台专注于：
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>实时收集奥地利主流电商平台的优惠信息</li>
                <li>提供准确的中文翻译服务</li>
                <li>按分类整理，方便用户查找</li>
                <li>及时更新，确保信息时效性</li>
              </ul>
            </div>
          </section>

          {/* How It Works */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              🔧 工作原理
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🕷️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">自动收集</h3>
                <p className="text-sm text-gray-600">
                  通过RSS订阅和网页抓取技术，实时收集奥地利各大优惠网站的最新信息
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌐</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">智能翻译</h3>
                <p className="text-sm text-gray-600">
                  使用DeepL等专业翻译服务，将德语内容准确翻译成中文
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">优化展示</h3>
                <p className="text-sm text-gray-600">
                  通过清晰的分类和现代化界面，为用户提供最佳的浏览体验
                </p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              ✨ 主要特性
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h4 className="font-medium text-gray-900">实时更新</h4>
                    <p className="text-sm text-gray-600">优惠信息每小时自动更新，确保时效性</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h4 className="font-medium text-gray-900">双语显示</h4>
                    <p className="text-sm text-gray-600">支持德语原文和中文翻译切换</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h4 className="font-medium text-gray-900">分类浏览</h4>
                    <p className="text-sm text-gray-600">按产品类别整理，快速找到感兴趣的优惠</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h4 className="font-medium text-gray-900">详细信息</h4>
                    <p className="text-sm text-gray-600">提供产品规格、特性等详细信息</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h4 className="font-medium text-gray-900">直达链接</h4>
                    <p className="text-sm text-gray-600">一键跳转到商家官方页面完成购买</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <div>
                    <h4 className="font-medium text-gray-900">移动友好</h4>
                    <p className="text-sm text-gray-600">响应式设计，完美适配各种设备</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              📊 数据来源
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                我们的优惠信息来源于奥地利和德语区知名的折扣和优惠网站，包括但不限于：
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Sparhamster.at</h4>
                  <p className="text-sm text-gray-600">奥地利优惠信息聚合平台</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">更多来源</h4>
                  <p className="text-sm text-gray-600">持续扩展中...</p>
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              ⚠️ 免责声明
            </h2>
            <div className="space-y-4 text-gray-700">
              <ul className="list-disc list-inside space-y-2">
                <li>本站所有内容均来源于公开的RSS订阅和网站信息</li>
                <li>中文翻译由机器翻译生成，仅供参考，可能存在偏差</li>
                <li>优惠信息的准确性、价格和可用性请以商家官方网站为准</li>
                <li>本站不参与任何交易，仅提供信息聚合服务</li>
                <li>使用本站信息进行购买决策时，请务必核实商家官方信息</li>
              </ul>
            </div>
          </section>

          {/* Technical Info */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              🛠️ 技术架构
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">前端技术</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Next.js 15 - React 全栈框架</li>
                  <li>• TypeScript - 类型安全</li>
                  <li>• Tailwind CSS - 现代化样式</li>
                  <li>• 响应式设计 - 移动优先</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">后端服务</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Node.js - 服务器运行环境</li>
                  <li>• RSS解析 - 自动内容收集</li>
                  <li>• DeepL API - 专业翻译服务</li>
                  <li>• 内容缓存 - 提高响应速度</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            ← 返回首页探索优惠
          </Link>
        </div>
      </div>
    </div>
  )
}