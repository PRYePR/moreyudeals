'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { DetailContent } from '@/lib/detail-page-fetcher'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('components:deal-detail-content')

interface DealDetailContentProps {
  deal: any
  dealId: string
  initialContent?: string
  onContentLoaded?: (content: DetailContent) => void
}

export default function DealDetailContent({
  deal,
  dealId,
  initialContent,
  onContentLoaded
}: DealDetailContentProps) {
  const [detailContent, setDetailContent] = useState<DetailContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetailContent = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/deals/${dealId}/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deal)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message || '无法生成详情内容')
      }

      setDetailContent(data.content)
      onContentLoaded?.(data.content)
    } catch (err) {
      logger.error('Failed to fetch deal detail content', err as Error)
      setError(err instanceof Error ? err.message : '发生未知错误')
    } finally {
      setLoading(false)
    }
  }, [deal, dealId, onContentLoaded])

  useEffect(() => {
    fetchDetailContent()
  }, [fetchDetailContent])

  const displayDescription = useMemo(() => {
    const html = detailContent?.fullDescription?.trim()
    if (html) {
      return html
    }
    return initialContent || deal.translatedDescription || deal.description || ''
  }, [deal.description, deal.translatedDescription, detailContent?.fullDescription, initialContent])

  const hasHtmlMarkup = useMemo(() => /<[a-z][\s\S]*>/i.test(displayDescription), [displayDescription])

  const featureList = useMemo(() => {
    if (!detailContent?.features?.length) return []
    if (detailContent.features.length === 1 && /查看原始页面/.test(detailContent.features[0])) {
      return []
    }
    return detailContent.features
  }, [detailContent?.features])

  const specificationEntries = useMemo(() => {
    if (!detailContent?.specifications) return []
    return Object.entries(detailContent.specifications).filter(([, value]) => Boolean(value))
  }, [detailContent?.specifications])

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 rounded-full bg-slate-200"></div>
          <div className="h-4 rounded-full bg-slate-200"></div>
          <div className="h-4 rounded-full bg-slate-200 w-5/6"></div>
          <div className="h-4 rounded-full bg-slate-200 w-2/3"></div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl">😢</span>
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">无法加载详细内容</h2>
              <p className="text-sm text-rose-600/80">{error}</p>
            </div>
            <button
              onClick={fetchDetailContent}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
            >
              <span>↻</span>
              <span>重新加载</span>
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">产品详细介绍</h2>
            <div className="mt-4 text-sm leading-relaxed text-slate-700">
              {hasHtmlMarkup ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: displayDescription }}
                />
              ) : (
                <p className="whitespace-pre-line">{displayDescription}</p>
              )}
            </div>
          </div>

          {detailContent?.additionalContent && (
            <div className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                补充信息
              </div>
              <p className="leading-relaxed whitespace-pre-line">
                {detailContent.additionalContent}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {featureList.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">产品亮点</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {featureList.map((feature, index) => (
                  <li key={`${feature}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 text-emerald-500">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {specificationEntries.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">规格参数</h3>
              <dl className="grid gap-3 text-sm text-slate-700">
                {specificationEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {key}
                    </dt>
                    <dd className="mt-1">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">商家信息</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-primary-600 shadow-sm">
                🛍️
              </div>
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-slate-900">
                  {detailContent?.retailer?.name || deal.merchantName || '未知商家'}
                </div>
                <div className="text-slate-500">
                  {detailContent?.retailer?.url || deal.dealUrl}
                </div>
              </div>
              {detailContent?.retailer?.logo && (
                <Image
                  src={detailContent.retailer.logo}
                  alt={detailContent.retailer.name}
                  width={40}
                  height={40}
                  className="ml-auto rounded-lg bg-white object-contain shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {detailContent?.images?.length ? (
        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">图像素材</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {detailContent.images.slice(0, 6).map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="relative aspect-video overflow-hidden rounded-xl border border-slate-100 bg-slate-100"
              >
                <Image
                  src={image}
                  alt={`Deal asset ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
