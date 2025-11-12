import DealsListClient from '@/components/deals/DealsListClient'
import DealsWaterfallClient from '@/components/deals/DealsWaterfallClient'
import SiteHeader from '@/components/layout/SiteHeader'
import CategoryTabs from '@/components/filters/CategoryTabsCollapsible'
import FilterSidebar from '@/components/filters/FilterSidebar'
import TranslationWrapper from '@/components/layout/TranslationWrapper'
import PullToRefreshWrapper from '@/components/PullToRefreshWrapper'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'

const PAGE_SIZE = 20

/**
 * 获取优惠列表数据
 */
async function getDealsData(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      : 'http://localhost:3000'

    // 构建查询参数
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('limit', PAGE_SIZE.toString())

    // 添加筛选参数
    if (searchParams.merchant && typeof searchParams.merchant === 'string') {
      params.set('merchant', searchParams.merchant)
    }
    if (searchParams.category && typeof searchParams.category === 'string') {
      params.set('category', searchParams.category)
    }
    if (searchParams.search && typeof searchParams.search === 'string') {
      params.set('search', searchParams.search)
    }
    if (searchParams.sortBy && typeof searchParams.sortBy === 'string') {
      params.set('sortBy', searchParams.sortBy)
    }
    if (searchParams.sortOrder && typeof searchParams.sortOrder === 'string') {
      params.set('sortOrder', searchParams.sortOrder)
    }

    // 获取初始数据
    const response = await fetch(`${baseUrl}/api/deals/live?${params.toString()}`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch deals')
    }

    const data = await response.json()

    return {
      deals: data.deals || [],
      totalCount: data.pagination?.total || 0
    }
  } catch (error) {
    console.error('Error fetching deals:', error)
    return {
      deals: [],
      totalCount: 0
    }
  }
}

/**
 * 获取分类和商家数据
 */
async function getCategoriesAndMerchants() {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      : 'http://localhost:3000'

    const [categoriesResponse, merchantsResponse, crossFilterResponse] = await Promise.all([
      fetch(`${baseUrl}/api/categories`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(err => {
          console.error('[DealsPage] Failed to fetch categories:', err)
          return { categories: [] }
        }),
      fetch(`${baseUrl}/api/merchants`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(err => {
          console.error('[DealsPage] Failed to fetch merchants:', err)
          return { merchants: [] }
        }),
      fetch(`${baseUrl}/api/cross-filter`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(err => {
          console.error('[DealsPage] Failed to fetch cross-filter data:', err)
          return { categoryByMerchant: {}, merchantByCategory: {} }
        })
    ])

    // 定义标准分类（11个核心分类，与 category-mapping.ts 保持一致）
    const standardCategories = [
      { id: 'electronics', name: 'Electronics', translatedName: '数码电子', icon: 'laptop' },
      { id: 'appliances', name: 'Appliances', translatedName: '家用电器', icon: 'home' },
      { id: 'fashion', name: 'Fashion', translatedName: '时尚服饰', icon: 'shirt' },
      { id: 'beauty', name: 'Beauty', translatedName: '美妆个护', icon: 'heart' },
      { id: 'food', name: 'Food', translatedName: '食品饮料', icon: 'utensils' },
      { id: 'sports', name: 'Sports', translatedName: '运动户外', icon: 'bike' },
      { id: 'family-kids', name: 'Family & Kids', translatedName: '母婴玩具', icon: 'baby' },
      { id: 'home', name: 'Home', translatedName: '家居生活', icon: 'home' },
      { id: 'auto', name: 'Auto', translatedName: '汽车用品', icon: 'car' },
      { id: 'entertainment', name: 'Entertainment', translatedName: '休闲娱乐', icon: 'gamepad' },
      { id: 'other', name: 'Other', translatedName: '其他', icon: 'tag' },
    ]

    // 映射后端分类名到标准分类ID（支持德语和英语）
    const categoryNameToId: Record<string, string> = {
      // 标准分类ID（直接映射）
      'electronics': 'electronics',
      'appliances': 'appliances',
      'fashion': 'fashion',
      'beauty': 'beauty',
      'food': 'food',
      'sports': 'sports',
      'family-kids': 'family-kids',
      'home': 'home',
      'auto': 'auto',
      'entertainment': 'entertainment',
      'other': 'other',

      // 德语名称映射
      'elektronik': 'electronics',
      'computer': 'electronics',
      'haushaltsgeräte': 'appliances',
      'mode': 'fashion',
      'fashion & beauty': 'fashion',
      'fashion &amp; beauty': 'fashion',
      'schönheit': 'beauty',
      'beauty & gesundheit': 'beauty',
      'erotik': 'beauty',
      'lebensmittel': 'food',
      'sport': 'sports',
      'freizeit': 'sports',
      'familie & kinder': 'family-kids',
      'spielzeug': 'family-kids',
      'haushalt': 'home',
      'wohnen': 'home',
      'kfz': 'auto',
      'auto & motorrad': 'auto',
      'werkzeug & baumarkt': 'auto',
      'werkzeug &amp; baumarkt': 'auto',
      'unterhaltung': 'entertainment',
      'gaming': 'entertainment',
      'reisen': 'other',
      'schnäppchen': 'other',
      'sonstiges': 'other',
      'andere': 'other',

      // 品牌/商家名称映射
      'amazon': 'other',
      'sparhamsterin': 'other',
      'marktguru': 'other',
      'mediamarkt': 'electronics',
      'billa': 'food',
      'interspar': 'food',
    }

    // 合并后端数据和标准分类（聚合所有匹配的分类）
    const categories = standardCategories.map(stdCat => {
      // 聚合所有映射到同一标准分类的后端分类计数
      const totalCount = categoriesResponse.categories
        .filter((c: any) => categoryNameToId[c.name.toLowerCase()] === stdCat.id)
        .reduce((sum: number, cat: any) => sum + (cat.count || 0), 0)

      return {
        ...stdCat,
        count: totalCount
      }
    })
      .filter(cat => cat.count > 0) // 显示所有有商品的分类
      .sort((a, b) => b.count - a.count) // 按商品数量降序排列

    // 转换商家数据格式（后端通过/api/merchants返回的是 {merchants: [...]}）
    const merchantsData = merchantsResponse.merchants || []
    const merchants = merchantsData.map((m: any) => ({
      name: m.merchant,
      count: typeof m.deal_count === 'string' ? parseInt(m.deal_count) : m.deal_count
    }))

    // 转换交叉筛选数据：德语分类名 -> 标准英语分类ID
    const rawCategoryByMerchant = crossFilterResponse.categoryByMerchant || {}
    const rawMerchantByCategory = crossFilterResponse.merchantByCategory || {}

    // 转换 categoryByMerchant: 聚合同一标准分类的数据
    const categoryByMerchant: Record<string, Record<string, number>> = {}
    Object.keys(rawCategoryByMerchant).forEach(merchantName => {
      categoryByMerchant[merchantName] = {}
      const merchantCategories = rawCategoryByMerchant[merchantName]

      Object.keys(merchantCategories).forEach(germanCategory => {
        const standardId = categoryNameToId[germanCategory.toLowerCase()]
        if (standardId) {
          const count = merchantCategories[germanCategory]
          categoryByMerchant[merchantName][standardId] =
            (categoryByMerchant[merchantName][standardId] || 0) + count
        }
      })
    })

    // 转换 merchantByCategory: 聚合同一标准分类的数据
    const merchantByCategory: Record<string, Record<string, number>> = {}
    Object.keys(rawMerchantByCategory).forEach(germanCategory => {
      const standardId = categoryNameToId[germanCategory.toLowerCase()]
      if (standardId) {
        if (!merchantByCategory[standardId]) {
          merchantByCategory[standardId] = {}
        }

        const categoryMerchants = rawMerchantByCategory[germanCategory]
        Object.keys(categoryMerchants).forEach(merchantName => {
          const count = categoryMerchants[merchantName]
          merchantByCategory[standardId][merchantName] =
            (merchantByCategory[standardId][merchantName] || 0) + count
        })
      }
    })

    return {
      categories,
      merchants,
      categoryByMerchant,
      merchantByCategory
    }
  } catch (error) {
    console.error('Error fetching categories and merchants:', error)
    return {
      categories: [],
      merchants: [],
      categoryByMerchant: {},
      merchantByCategory: {}
    }
  }
}

interface DealsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = await searchParams
  const { deals, totalCount } = await getDealsData(params)
  const { categories, merchants, categoryByMerchant, merchantByCategory } = await getCategoriesAndMerchants()

  // 获取当前筛选参数
  const currentCategory = typeof params.category === 'string' ? params.category : null
  const currentMerchant = typeof params.merchant === 'string' ? params.merchant : null
  const currentSearch = typeof params.search === 'string' ? params.search : null

  // 获取布局模式参数（默认瀑布流）
  const layout = typeof params.layout === 'string' ? params.layout : 'waterfall'

  // 获取当前分类信息
  const categoryInfo = categories.find(cat => cat.id === currentCategory?.toLowerCase())

  // 构建页面标题
  let pageTitle = '所有优惠'
  let pageDescription = '浏览奥地利最新优惠信息'

  if (categoryInfo?.translatedName && currentMerchant) {
    pageTitle = `${categoryInfo.translatedName} - ${currentMerchant}`
    pageDescription = `${categoryInfo.translatedName} 分类下 ${currentMerchant} 的优惠`
  } else if (categoryInfo?.translatedName) {
    pageTitle = categoryInfo.translatedName
    pageDescription = `${categoryInfo.translatedName} 分类的所有优惠`
  } else if (currentMerchant) {
    pageTitle = currentMerchant
    pageDescription = `${currentMerchant} 的所有优惠`
  } else if (currentSearch) {
    pageTitle = `搜索：${currentSearch}`
    pageDescription = `搜索 "${currentSearch}" 的相关优惠`
  }

  return (
    <TranslationWrapper>
      <PullToRefreshWrapper>
        <div className="min-h-screen bg-neutral-bg">
          {/* Header */}
          <SiteHeader merchants={merchants} categories={categories} />

          {/* Main Content */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {pageTitle}
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              {totalCount} 个优惠 · {pageDescription}
            </p>
          </div>

          {/* Category Tabs */}
          <div className="mb-8">
            <CategoryTabs
              categories={categories}
              currentCategory={currentCategory}
              currentMerchant={currentMerchant}
              categoryByMerchant={categoryByMerchant}
            />
          </div>

          {/* Main Layout: 左侧筛选 + 右侧列表 */}
          <div className="flex gap-6">
            {/* 左侧：筛选面板（桌面端显示） */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-20">
                <FilterSidebar
                  merchants={merchants}
                  currentMerchant={currentMerchant}
                  currentCategory={currentCategory}
                  merchantByCategory={merchantByCategory}
                />
              </div>
            </aside>

            {/* 右侧：优惠列表 - 根据 layout 参数切换 */}
            <div className="flex-1 min-w-0">
              {layout === 'list' ? (
                <DealsListClient
                  initialDeals={deals}
                  totalCount={totalCount}
                  initialPage={1}
                  pageSize={PAGE_SIZE}
                  categories={categories}
                />
              ) : (
                <DealsWaterfallClient
                  initialDeals={deals}
                  totalCount={totalCount}
                  initialPage={1}
                  pageSize={PAGE_SIZE}
                  categories={categories}
                />
              )}
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-brand-primary hover:text-brand-hover font-medium transition-colors"
            >
              ← 返回首页
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm">
              <p>&copy; 2025 Moreyudeals. 奥地利优惠信息聚合平台</p>
              <p className="mt-2">
                数据来源于公开渠道 | 由 AI 自动翻译 | 仅供参考
              </p>
            </div>
          </div>
        </footer>
        </div>
      </PullToRefreshWrapper>
    </TranslationWrapper>
  )
}
