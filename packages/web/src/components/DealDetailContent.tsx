'use client'

import { useState, useEffect } from 'react'
import { DetailContent } from '@/lib/detail-page-fetcher'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('components:deal-detail-content')

interface DealDetailContentProps {
  deal: any  // 完整的 Deal 对象
  dealId: string
  initialContent?: string
  onContentLoaded?: (content: DetailContent) => void
}

export default function DealDetailContent({ deal, dealId, initialContent, onContentLoaded }: DealDetailContentProps) {
  const [detailContent, setDetailContent] = useState<DetailContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const fetchDetailContent = async () => {
    if (detailContent || loading) return

    setLoading(true)
    setError(null)

    try {
      // 使用 POST 方法，发送完整的 deal 对象
      const response = await fetch(`/api/deals/${dealId}/detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deal)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setDetailContent(data.content)
        setExpanded(true)
        onContentLoaded?.(data.content)
      } else {
        throw new Error(data.message || 'Failed to generate detail content')
      }
    } catch (err) {
      logger.error('Error generating detail content', err as Error)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!expanded) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">详细产品信息</h2>
          <button
            onClick={fetchDetailContent}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            {loading ? '正在加载...' : '查看详细信息'}
          </button>
        </div>

        {initialContent && (
          <div className="text-gray-700 text-sm">
            <p className="line-clamp-3">{initialContent}</p>
            <p className="text-gray-500 mt-2">点击上方按钮获取完整的产品详细信息</p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">
              ❌ 获取详细信息失败: {error}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">详细产品信息</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">
            ❌ 无法获取详细信息: {error}
          </p>
          <button
            onClick={() => {
              setError(null)
              setExpanded(false)
            }}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!detailContent) {
    return null
  }

  // 优先使用 rawHtml（WordPress content.rendered），如果为空则回退到 fullDescription
  const contentToRender = detailContent.rawHtml || detailContent.fullDescription

  return (
    <div className="space-y-6">
      {/* Full Description - 优先渲染 rawHtml */}
      {contentToRender && (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">产品详细描述</h2>
          <div
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: contentToRender }}
          />
        </div>
      )}

      {/* Product Features */}
      {detailContent.features.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">产品特性</h2>
          <ul className="space-y-2">
            {detailContent.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Specifications */}
      {Object.keys(detailContent.specifications).length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">产品规格</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(detailContent.specifications).map(([key, value]) => (
              <div key={key} className="border-b border-gray-200 pb-2">
                <div className="font-medium text-gray-900">{key}</div>
                <div className="text-gray-600 text-sm">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Images */}
      {detailContent.images.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">更多图片</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {detailContent.images.slice(0, 6).map((image, index) => (
              <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={image}
                  alt={`产品图片 ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retailer Information */}
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">商家信息</h2>
        <div className="flex items-center space-x-4">
          {detailContent.retailer.logo && (
            <img
              src={detailContent.retailer.logo}
              alt={detailContent.retailer.name}
              className="w-12 h-12 object-contain"
            />
          )}
          <div>
            <div className="font-medium text-gray-900">{detailContent.retailer.name}</div>
            <div className="text-sm text-gray-600">
              库存状态: {detailContent.pricing.availability}
            </div>
            {detailContent.pricing.shippingInfo && (
              <div className="text-sm text-gray-600">
                配送: {detailContent.pricing.shippingInfo}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapse Button */}
      <div className="text-center">
        <button
          onClick={() => setExpanded(false)}
          className="text-gray-500 hover:text-gray-700 text-sm underline"
        >
          收起详细信息
        </button>
      </div>
    </div>
  )
}