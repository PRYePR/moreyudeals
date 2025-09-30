export default function TranslationDisclaimer() {
  return (
    <div className="translation-disclaimer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">
              机器翻译免责声明
            </h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>
                本网站内容由人工智能自动从德语翻译为中文，仅供参考。
                翻译结果可能存在不准确或偏差，请以商家官方德语信息为准。
              </p>
              <p>
                优惠详情、价格、有效期等重要信息请直接访问商家官网核实。
                我们不对翻译内容的准确性承担任何责任。
              </p>
            </div>
            <div className="mt-2 flex items-center space-x-4 text-xs text-yellow-600">
              <span className="flex items-center">
                <span className="mr-1">🤖</span>
                AI翻译技术提供支持
              </span>
              <span className="flex items-center">
                <span className="mr-1">🇩🇪</span>
                原文来源：德国商家官方
              </span>
              <span className="flex items-center">
                <span className="mr-1">⚠️</span>
                使用前请核实
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}