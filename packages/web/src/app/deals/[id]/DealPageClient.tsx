'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DealDetailContent from '@/components/DealDetailContent'
import {
  TranslationProvider,
  TranslationControl,
  TranslatableText,
  TranslatableDescription
} from '@/components/TranslatableContent'
import { ProductBadges } from '@/components/ProductBadges'
import { DetailContent } from '@/lib/detail-page-fetcher'
import { ImageGallery, FloatingActionButton } from '@/components/EnhancedDealLayout'

interface DealPageClientProps {
  deal: any
  dealId: string
}

export default function DealPageClient({ deal, dealId }: DealPageClientProps) {
  const [detailContent, setDetailContent] = useState<DetailContent | null>(null)

  const formatDate = (value: Date | string) => {
    const dateObj = typeof value === 'string' ? new Date(value) : value
    if (Number.isNaN(dateObj.getTime())) {
      return '待定'
    }
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj)
  }

  const getDaysRemaining = (expiresAt: Date | string) => {
    const now = new Date()
    const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    const diffTime = expirationDate.getTime() - now.getTime()
    if (Number.isNaN(diffTime)) return 0
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(diffDays, 0)
  }

  const calculatedDays = typeof deal.daysRemaining === 'number'
    ? Math.max(deal.daysRemaining, 0)
    : getDaysRemaining(deal.expiresAt)
  const isExpired = typeof deal.isExpired === 'boolean'
    ? deal.isExpired
    : calculatedDays <= 0
  const daysRemaining = isExpired ? 0 : calculatedDays

  const purchaseUrl = deal.trackingUrl || deal.affiliateUrl || deal.dealUrl || deal.originalUrl || ''
  const hasPurchaseLink = typeof purchaseUrl === 'string' && purchaseUrl.startsWith('http')

  const hasTranslation = useMemo(() => {
    const normalized = (value: string | undefined) => value?.trim().replace(/\s+/g, ' ') ?? ''
    const translatedTitle = normalized(deal.translatedTitle)
    const translatedDesc = normalized(deal.translatedDescription)
    const originalTitle = normalized(deal.originalTitle)
    const originalDesc = normalized(deal.originalDescription)
    return (
      (translatedTitle && translatedTitle !== originalTitle) ||
      (translatedDesc && translatedDesc !== originalDesc)
    )
  }, [deal.originalDescription, deal.originalTitle, deal.translatedDescription, deal.translatedTitle])

  const merchantName = deal.merchantName || deal.source || '未知商家'
  const categoryTags: string[] = useMemo(() => {
    const tags = new Set<string>()
    if (deal.category) tags.add(deal.category)
    if (Array.isArray(deal.categories)) {
      deal.categories.filter(Boolean).forEach((cat: string) => tags.add(cat))
    }
    return Array.from(tags)
  }, [deal.category, deal.categories])

  const metaItems = [
    { icon: '🏪', label: '商家', value: merchantName },
    { icon: '🌐', label: '来源', value: deal.source || 'Sparhamster.at' },
    { icon: '📅', label: '发布时间', value: formatDate(deal.publishedAt) },
    { icon: '⏰', label: '结束时间', value: isExpired ? '已结束' : formatDate(deal.expiresAt) },
    { icon: '🕓', label: '剩余时间', value: isExpired ? '0 天' : `${daysRemaining} 天` },
    {
      icon: '🌍',
      label: '翻译',
      value: hasTranslation
        ? `${(deal.translationProvider || 'deepl').toUpperCase()} 自动翻译`
        : '暂未检测到中文翻译'
    }
  ]

  return (
    <TranslationProvider>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 transition hover:text-primary-700"
            >
              <span className="text-base">←</span>
              <span>返回优惠列表</span>
            </Link>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
              <TranslationControl />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  来源 {deal.source || 'Sparhamster.at'}
                </span>
                <span className="hidden sm:block">•</span>
                <span>发布于 {formatDate(deal.publishedAt)}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          {isExpired && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-semibold">该优惠可能已经过期</div>
                  <div className="text-sm text-amber-700/80">
                    请在跳转到商家网站后再次确认价格与库存信息，避免下单时出现价格变动。
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasTranslation && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">🌐</span>
                <div>
                  <div className="font-semibold">暂未检测到中文翻译</div>
                  <div className="text-sm text-blue-700/80">
                    我们已显示德语原文。请确认 DeepL 或其他翻译服务的 API 配置是否正确。
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="relative">
                  <ImageGallery
                    mainImage={deal.imageUrl}
                    images={detailContent?.images || []}
                    altText={deal.translatedTitle || deal.originalTitle}
                  />
                  {deal.discountPercentage && (
                    <div className="absolute left-4 top-4 rounded-full bg-red-500 px-4 py-1 text-sm font-semibold text-white shadow">
                      立减 {deal.discountPercentage}%
                    </div>
                  )}
                </div>
                {categoryTags.length > 0 && (
                  <div className="border-t border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:text-sm">
                      {categoryTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-3 py-1"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {detailContent?.images && detailContent.images.length > 1 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">更多实拍图</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {detailContent.images.slice(0, 6).map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                      >
                        <Image
                          src={image}
                          alt={`产品图片 ${index + 1}`}
                          fill
                          className="object-cover transition duration-200 hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <span className="text-xl">🛍️</span>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">推荐商家</div>
                    <div className="text-lg font-semibold text-slate-900">{merchantName}</div>
                  </div>
                </div>
                {detailContent?.retailer.logo && (
                  <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
                    <Image
                      src={detailContent.retailer.logo}
                      alt={detailContent.retailer.name}
                      width={32}
                      height={32}
                      className="rounded-md bg-white object-contain"
                    />
                    <span>{detailContent.retailer.url}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <TranslatableText
                  originalText={deal.originalTitle}
                  translatedText={deal.translatedTitle}
                  as="h1"
                  className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl"
                />
                <div className="mt-4 text-sm text-slate-500">
                  来自 {deal.source || 'Sparhamster.at'} · 更新于 {formatDate(deal.publishedAt)}
                </div>
                <div className="mt-5">
                  <TranslatableDescription
                    originalText={deal.originalDescription || deal.content}
                    translatedText={deal.translatedDescription || deal.content}
                    maxLines={6}
                    className="prose prose-sm max-w-none text-slate-700"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <ProductBadges
                  deal={{
                    discountPercentage: deal.discountPercentage,
                    category: deal.category,
                    source: deal.source,
                    price: deal.price,
                    originalPrice: deal.originalPrice,
                    currency: deal.currency || 'EUR',
                    isTranslated: deal.isTranslated,
                    translationProvider: deal.translationProvider,
                    dealUrl: purchaseUrl
                  }}
                  detailContent={detailContent || undefined}
                />

                <div className="mt-5 space-y-3">
                  <a
                    href={hasPurchaseLink ? purchaseUrl : undefined}
                    target={hasPurchaseLink ? '_blank' : undefined}
                    rel={hasPurchaseLink ? 'noopener noreferrer' : undefined}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold text-white transition ${
                      hasPurchaseLink
                        ? 'bg-primary-600 hover:bg-primary-700'
                        : 'cursor-not-allowed bg-slate-400'
                    }`}
                  >
                    <span>🛒</span>
                    <span>{hasPurchaseLink ? '立即前往商家购买' : '暂无可用购买链接'}</span>
                  </a>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-600">
                      <span>💖</span>
                      <span>收藏</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-600">
                      <span>📤</span>
                      <span>分享给朋友</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center text-lg font-semibold text-slate-900">
                  <span className="mr-2 text-xl">ℹ️</span>
                  关键信息
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {metaItems.map((item) => (
                    <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <div className="text-lg">{item.icon}</div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {item.label}
                        </div>
                        <div className="mt-1 text-sm text-slate-700">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12">
            <DealDetailContent
              deal={deal}
              dealId={dealId}
              initialContent={detailContent?.fullDescription || deal.content || deal.translatedDescription}
              onContentLoaded={setDetailContent}
            />
          </section>
        </main>

        <FloatingActionButton
          icon="🛒"
          label="立即购买"
          onClick={() => {
            if (hasPurchaseLink) {
              window.open(purchaseUrl, '_blank', 'noopener,noreferrer')
            }
          }}
          variant={hasPurchaseLink ? 'primary' : 'secondary'}
        />

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-600 text-white shadow-lg transition hover:bg-slate-700"
        >
          ↑
        </button>
      </div>
    </TranslationProvider>
  )
}
