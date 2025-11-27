import { notFound } from 'next/navigation'
import DealPageClient from './DealPageClient'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('app:deal-page')

// 服务端获取单个deal的函数
async function getDeal(id: string) {
  try {
    // 服务端组件调用自己的 API 路由，使用相对路径或当前域名
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                    (process.env.NODE_ENV === 'production'
                      ? 'https://deals.moreyu.com'
                      : 'http://localhost:3000')

    const url = `${baseUrl}/api/deals/${encodeURIComponent(id)}`
    logger.debug('Fetching deal from API', { url, dealId: id })

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Moreyudeals-Server'
      }
    })

    if (response.status === 404) {
      logger.warn('Deal not found in API response', { dealId: id })
      return null
    }

    if (!response.ok) {
      logger.error('Response not OK', new Error(`Status ${response.status}`), {
        status: response.status,
        statusText: response.statusText
      })
      throw new Error(`Failed to fetch deals: ${response.status}`)
    }

    const deal = await response.json()
    logger.info('Fetched deal', { dealId: id, title: deal?.translatedTitle })

    return deal || null
  } catch (error) {
    logger.error('Error fetching deal', error as Error, { dealId: id })
    return null
  }
}

interface DealPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DealPage({ params }: DealPageProps) {
  const resolvedParams = await params

  // 如果是演示ID，直接返回演示页面
  if (resolvedParams.id === 'demo123') {
    const mockDeal = {
      id: "demo123",
      title: "Gardena EcoLine Unkrautstecher um 8,87 € statt 14,76 €",
      originalTitle: "Gardena EcoLine Unkrautstecher um 8,87 € statt 14,76 €",
      translatedTitle: "Gardena EcoLine 除草器 8.87欧元，原价14.76欧元",
      description: "高质量的园艺工具，环保材料制造",
      originalDescription: "Hochwertiges Gartenwerkzeug aus umweltfreundlichen Materialien",
      translatedDescription: "高质量的园艺工具，采用环保材料制造，让您轻松除草",
      price: "8.87",
      originalPrice: "14.76",
      currency: "EUR",
      discountPercentage: 40,
      imageUrl: "https://www.sparhamster.at/wp-content/uploads/2025/09/gardena-ecoline-unkrautstecher-um-906-e-statt-1480-e.jpg",
      dealUrl: "https://www.sparhamster.at/gardena-ecoline-unkrautstecher/",
      category: "Electronics",
      source: "Sparhamster.at",
      publishedAt: "2025-09-29T12:24:16.000Z",
      expiresAt: "2025-10-29T12:24:16.000Z",
      language: "de",
      translationProvider: "deepl",
      isTranslated: true,
      categories: ["Schnäppchen", "Werkzeug & Baumarkt", "Amazon"],
      content: `<div class="box-info">Jetzt um 8,87 € zu haben!</div>
<p>Den<strong> Gardena Ecoline Unkrautstecher </strong>(Zum einfachen Entfernen von Unkraut ohne Chemikalien, ergonomischer Griff, beschichtetes Metall, aus recycelten Materialien (17702-20)) gibt es bei Amazon zum Preis von <strong>9,06 €</strong>.</p>
<p>Der nächste Vergleichspreis liegt bei 14,80 €.</p>
<p>Die Kunden vergeben 4,7 von 5 Sterne aus 13793 Bewertungen.</p>
<p>Der Versand ist für Prime-Mitglieder bzw. ab 39 € Bestellwert gratis.</p>`,
      isExpired: false,
      daysRemaining: 30
    }

    return <DealPageClient deal={mockDeal} dealId={resolvedParams.id} />
  }

  const deal = await getDeal(resolvedParams.id)

  if (!deal) {
    notFound()
  }

  return <DealPageClient deal={deal} dealId={resolvedParams.id} />
}
