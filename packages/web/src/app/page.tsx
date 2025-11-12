import DealsListClient from '@/components/deals/DealsListClient'
import DealsWaterfallClient from '@/components/deals/DealsWaterfallClient'
import SiteHeader from '@/components/layout/SiteHeader'
import RightSidebar from '@/components/layout/RightSidebar'
import CategoryTabs from '@/components/filters/CategoryTabsCollapsible'
import FilterSidebar from '@/components/filters/FilterSidebar'
import MobileFilterBar from '@/components/filters/MobileFilterBar'
import FilterActiveChips from '@/components/filters/FilterActiveChips'
import SearchTermBanner from '@/components/filters/SearchTermBanner'
import TranslationWrapper from '@/components/layout/TranslationWrapper'
import { apiClient } from '@/lib/api-client'

const PAGE_SIZE = 20

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

async function getCategoriesAndMerchants() {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      : 'http://localhost:3000'

    console.log('[HomePage] Fetching categories and merchants from Next.js API routes...')
    const [categoriesResponse, merchantsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/categories`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(err => {
          console.error('[HomePage] Failed to fetch categories:', err)
          return { categories: [] }
        }),
      fetch(`${baseUrl}/api/merchants`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(err => {
          console.error('[HomePage] Failed to fetch merchants:', err)
          return { merchants: [] }
        })
    ])
    console.log('[HomePage] Successfully fetched data')

    // 定义标准分类（11个核心分类，与后端 category-mapping.ts 保持一致）
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

    // 映射后端分类名到标准分类ID
    // API 现在直接返回标准分类ID，所以只需要简单映射
    const categoryNameToId: Record<string, string> = {
      // 标准分类ID（API直接返回）
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

      // 兼容旧的德语分类名（用于交叉筛选数据）
      'elektronik': 'electronics',
      'computer': 'electronics',
      'haushaltsgeräte': 'appliances',
      'haushalt': 'appliances',
      'mode': 'fashion',
      'beauty & gesundheit': 'beauty',
      'gesundheit': 'beauty',
      'lebensmittel': 'food',
      'sport': 'sports',
      'familie & kinder': 'family-kids',
      'spielzeug': 'family-kids',
      'wohnen': 'home',
      'auto & motorrad': 'auto',
      'freizeit': 'entertainment',
      'gaming': 'entertainment',
      'sonstiges': 'other',
      'schnäppchen': 'other',
    }

    // 合并后端数据和标准分类
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

    // 获取交叉筛选数据
    const crossFilterResponse = await fetch(`${baseUrl}/api/cross-filter`, { cache: 'no-store' })
      .then(res => res.json())
      .catch(err => {
        console.error('[HomePage] Failed to fetch cross-filter data:', err)
        return { categoryByMerchant: {}, merchantByCategory: {} }
      })

    // 转换交叉筛选数据：德语分类名 → 标准英语分类ID
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

// 获取搜索筛选数据（用于联动）
async function getSearchFilters(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      : 'http://localhost:3000'

    // 只在有搜索条件时才调用 API
    // 分类和商家的联动由 merchantByCategory 和 categoryByMerchant 处理
    if (!searchParams.search || typeof searchParams.search !== 'string') {
      return { availableCategories: [], allMerchants: [] }
    }

    // 传递搜索条件和当前选择的商家/分类
    // 用于实现双向联动：
    // - 如果选择了商家 → 返回该商家在搜索条件下有商品的分类
    // - 如果选择了分类 → 返回该分类在搜索条件下有商品的商家
    const params = new URLSearchParams()
    params.set('search', searchParams.search)
    if (searchParams.merchant && typeof searchParams.merchant === 'string') {
      params.set('merchant', searchParams.merchant)
    }
    if (searchParams.category && typeof searchParams.category === 'string') {
      params.set('category', searchParams.category)
    }

    const queryString = params.toString()

    const response = await fetch(`${baseUrl}/api/search-filters?${queryString}`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      return { availableCategories: [], allMerchants: [] }
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching search filters:', error)
    return { availableCategories: [], allMerchants: [] }
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const { deals, totalCount } = await getDealsData(params)
  const { categories, merchants, categoryByMerchant, merchantByCategory } = await getCategoriesAndMerchants()

  // 获取当前筛选参数
  const currentCategory = typeof params.category === 'string' ? params.category : null
  const currentMerchant = typeof params.merchant === 'string' ? params.merchant : null
  const currentSearch = typeof params.search === 'string' ? params.search : null

  // 获取搜索筛选数据（用于联动）
  const searchFilters = await getSearchFilters(params)
  const currentSortBy = typeof params.sortBy === 'string' ? params.sortBy : null
  const currentSortOrder = typeof params.sortOrder === 'string' ? params.sortOrder : null

  // 获取布局模式参数（默认瀑布流）
  const layout = typeof params.layout === 'string' ? params.layout : 'waterfall'

  // 判断是否处于筛选模式
  // 注意：只有非默认排序才算作筛选
  const hasNonDefaultSort = (currentSortBy && currentSortBy !== 'publishedAt') ||
                            (currentSortOrder && currentSortOrder !== 'desc')

  // 有任何筛选条件时，都应该显示筛选布局
  // 包括：分类、商家、搜索、非默认排序、最低折扣等
  const hasFilters = Boolean(
    (currentCategory && currentCategory !== 'all') ||
    currentMerchant ||
    currentSearch ||
    hasNonDefaultSort ||
    params.minDiscount
  )

  // 调试信息
  console.log('=== 筛选调试信息 ===')
  console.log('currentCategory:', currentCategory)
  console.log('currentMerchant:', currentMerchant)
  console.log('currentSearch:', currentSearch)
  console.log('hasNonDefaultSort:', hasNonDefaultSort)
  console.log('hasFilters:', hasFilters)
  console.log('categories count:', categories.length)

  // 获取当前分类信息
  const categoryInfo = categories.find(cat => cat.id === currentCategory?.toLowerCase())
  console.log('categoryInfo:', categoryInfo)

  // 渲染发现模式布局
  const renderDiscoveryLayout = () => (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Main Layout: 左侧列表 + 右侧边栏 */}
      <div className="flex gap-6">
        {/* 左侧：优惠列表 - 根据 layout 参数切换 */}
        <div className="flex-1 min-w-0">
          {layout === 'list' ? (
            <DealsListClient
              initialDeals={deals}
              totalCount={totalCount}
              initialPage={1}
              pageSize={PAGE_SIZE}
              categories={categories}
              merchants={merchants}
              merchantByCategory={merchantByCategory}
              categoryByMerchant={categoryByMerchant}
              filteredMerchants={searchFilters.allMerchants}
              availableCategories={searchFilters.availableCategories}
            />
          ) : (
            <DealsWaterfallClient
              initialDeals={deals}
              totalCount={totalCount}
              initialPage={1}
              pageSize={PAGE_SIZE}
              categories={categories}
              merchants={merchants}
              merchantByCategory={merchantByCategory}
              categoryByMerchant={categoryByMerchant}
              filteredMerchants={searchFilters.allMerchants}
              availableCategories={searchFilters.availableCategories}
            />
          )}
        </div>

        {/* 右侧：侧边栏（桌面端显示） */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <RightSidebar categories={categories} merchants={merchants} />
          </div>
        </div>
      </div>
    </section>
  )

  // 渲染筛选模式布局
  const renderFilteredLayout = () => {
    // 构建页面标题
    let pageTitle = '筛选结果'
    if (categoryInfo?.translatedName && currentMerchant) {
      pageTitle = `${categoryInfo.translatedName} - ${currentMerchant}`
    } else if (categoryInfo?.translatedName) {
      pageTitle = categoryInfo.translatedName
    } else if (currentMerchant) {
      pageTitle = currentMerchant
    } else if (currentSearch) {
      pageTitle = `搜索：${currentSearch}`
    }

    console.log('页面标题:', pageTitle)

    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Search Term Banner - 搜索条件显示（仅桌面端，移动端在 Header 下方） */}
      <div className="hidden lg:block">
        <SearchTermBanner searchTerm={currentSearch || ''} />
      </div>

      {/* Category Tabs - 桌面端分类标签 */}
      <div className="mb-8 hidden lg:block">
        <CategoryTabs
          categories={categories}
          currentCategory={currentCategory}
          currentMerchant={currentMerchant}
          categoryByMerchant={categoryByMerchant}
          availableCategories={searchFilters.availableCategories}
        />
      </div>

      {/* Active Filters - 筛选条件显示（仅桌面端，不包括搜索） */}
      <FilterActiveChips
        currentCategory={currentCategory}
        currentMerchant={currentMerchant}
        currentSearch={currentSearch}
        categories={categories}
      />

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
                filteredMerchants={searchFilters.allMerchants}
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
                merchants={merchants}
                merchantByCategory={merchantByCategory}
                categoryByMerchant={categoryByMerchant}
                filteredMerchants={searchFilters.allMerchants}
                availableCategories={searchFilters.availableCategories}
              />
            ) : (
              <DealsWaterfallClient
                initialDeals={deals}
                totalCount={totalCount}
                initialPage={1}
                pageSize={PAGE_SIZE}
                categories={categories}
                merchants={merchants}
                merchantByCategory={merchantByCategory}
                categoryByMerchant={categoryByMerchant}
                filteredMerchants={searchFilters.allMerchants}
                availableCategories={searchFilters.availableCategories}
              />
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <TranslationWrapper>
      <div className="min-h-screen bg-neutral-bg">
        {/* Header */}
        <SiteHeader merchants={merchants} categories={categories} />

        {/* Mobile Top Controls - 仅在筛选模式下显示（移动端） */}
        {hasFilters && (
          <div className="lg:hidden">
            <SearchTermBanner searchTerm={currentSearch || ''} />
            <MobileFilterBar
              categories={categories}
              merchants={merchants}
              currentCategory={currentCategory}
              currentMerchant={currentMerchant}
              currentSortBy={currentSortBy}
              currentSearch={currentSearch}
              merchantByCategory={merchantByCategory}
              categoryByMerchant={categoryByMerchant}
              filteredMerchants={searchFilters.allMerchants}
              availableCategories={searchFilters.availableCategories}
            />
          </div>
        )}

        {/* Main Content - 根据模式渲染不同布局 */}
        {hasFilters ? renderFilteredLayout() : renderDiscoveryLayout()}

        {/* Stats Section - 简化版 */}
      <section className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl md:text-2xl font-bold text-brand-primary mb-1">
                {totalCount}+
              </div>
              <div className="text-xs text-gray-600">实时优惠</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-brand-primary mb-1">
                50+
              </div>
              <div className="text-xs text-gray-600">合作商家</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-brand-primary mb-1">
                每日
              </div>
              <div className="text-xs text-gray-600">自动更新</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-brand-primary mb-1">
                中文
              </div>
              <div className="text-xs text-gray-600">AI翻译</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
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
    </TranslationWrapper>
  )
}
