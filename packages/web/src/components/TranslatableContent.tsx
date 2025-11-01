'use client'

import { useState, createContext, useContext } from 'react'

// 创建翻译上下文
interface TranslationContextType {
  showOriginal: boolean
  toggleTranslation: () => void
}

const TranslationContext = createContext<TranslationContextType>({
  showOriginal: false,
  toggleTranslation: () => {}
})

export const useTranslation = () => useContext(TranslationContext)

// 翻译提供器组件
interface TranslationProviderProps {
  children: React.ReactNode
  defaultShowOriginal?: boolean
}

export function TranslationProvider({
  children,
  defaultShowOriginal = false
}: TranslationProviderProps) {
  const [showOriginal, setShowOriginal] = useState(defaultShowOriginal)

  const toggleTranslation = () => setShowOriginal(!showOriginal)

  return (
    <TranslationContext.Provider value={{ showOriginal, toggleTranslation }}>
      {children}
    </TranslationContext.Provider>
  )
}

// 翻译控制按钮组件
interface TranslationControlProps {
  className?: string
}

export function TranslationControl({ className = '' }: TranslationControlProps) {
  const { showOriginal, toggleTranslation } = useTranslation()

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => !showOriginal || toggleTranslation()}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
            !showOriginal
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🇨🇳 中文
        </button>
        <button
          onClick={() => showOriginal || toggleTranslation()}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
            showOriginal
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🇩🇪 德语
        </button>
      </div>

      <div className="text-xs text-gray-500">
        {showOriginal ? '显示德语原文' : '显示中文翻译'}
      </div>
    </div>
  )
}

// 可翻译文本组件
interface TranslatableTextProps {
  originalText: string
  translatedText: string
  className?: string
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function TranslatableText({
  originalText,
  translatedText,
  className = '',
  as: Component = 'div'
}: TranslatableTextProps) {
  const { showOriginal } = useTranslation()

  if (!originalText && !translatedText) {
    return null
  }

  const text = showOriginal ? originalText : translatedText
  const fallbackText = showOriginal ? translatedText : originalText

  return (
    <Component className={className}>
      {text || fallbackText}
    </Component>
  )
}

// 可翻译描述组件（支持详细展开）
interface TranslatableDescriptionProps {
  originalText: string
  translatedText: string
  maxLines?: number
  className?: string
}

export function TranslatableDescription({
  originalText,
  translatedText,
  maxLines = 3,
  className = ''
}: TranslatableDescriptionProps) {
  const { showOriginal } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const text = showOriginal ? originalText : translatedText
  const fallbackText = showOriginal ? translatedText : originalText
  const displayText = text || fallbackText

  if (!displayText) {
    return null
  }

  const shouldShowExpand = displayText.length > 200

  return (
    <div className={className}>
      <div className={`text-gray-700 leading-relaxed ${
        !expanded && shouldShowExpand ? `line-clamp-${maxLines}` : ''
      }`}>
        {displayText}
      </div>

      {shouldShowExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {expanded ? '收起' : '展开更多'}
        </button>
      )}

      {/* 翻译质量提示 */}
      {text && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span>
            {showOriginal ? '德语原文' : 'DeepL 自动翻译'}
          </span>
        </div>
      )}
    </div>
  )
}

// 可翻译 HTML 内容组件
interface TranslatableHtmlContentProps {
  originalHtml: string
  translatedHtml: string
  className?: string
}

export function TranslatableHtmlContent({
  originalHtml,
  translatedHtml,
  className = ''
}: TranslatableHtmlContentProps) {
  const { showOriginal } = useTranslation()

  const html = showOriginal ? originalHtml : translatedHtml
  const fallbackHtml = showOriginal ? translatedHtml : originalHtml
  const displayHtml = html || fallbackHtml

  if (!displayHtml) {
    return null
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  )
}