'use client'

import { useState } from 'react'

interface TranslationToggleProps {
  translatedText: string
  originalText: string
  className?: string
  translatedLabel?: string
  originalLabel?: string
}

export default function TranslationToggle({
  translatedText,
  originalText,
  className = '',
  translatedLabel = '中文',
  originalLabel = '原文'
}: TranslationToggleProps) {
  const [showOriginal, setShowOriginal] = useState(false)

  if (!originalText || !translatedText) {
    return <span>{translatedText || originalText}</span>
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOriginal(false)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
              !showOriginal
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {translatedLabel}
          </button>
          <button
            onClick={() => setShowOriginal(true)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
              showOriginal
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {originalLabel}
          </button>
        </div>

        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <span>🔄</span>
          <span>点击切换</span>
        </div>
      </div>

      <div className="transition-all duration-300 ease-in-out">
        {showOriginal ? (
          <div className="text-gray-700 italic">
            {originalText}
          </div>
        ) : (
          <div className="text-gray-900">
            {translatedText}
          </div>
        )}
      </div>

      {/* 语言指示器 */}
      <div className="mt-2 text-xs text-gray-400">
        {showOriginal ? (
          <span>🇩🇪 德语原文</span>
        ) : (
          <span>🇨🇳 中文翻译</span>
        )}
      </div>
    </div>
  )
}