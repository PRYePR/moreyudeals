import DealsListClient from '@/components/deals/DealsListClient'
import SiteHeader from '@/components/layout/SiteHeader'
import RightSidebar from '@/components/layout/RightSidebar'
import CategoryTabs from '@/components/filters/CategoryTabsCollapsible'
import FilterSidebar from '@/components/filters/FilterSidebar'
import MobileFilterButton from '@/components/filters/MobileFilterButton'
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
    console.log('[HomePage] Fetching categories and merchants from API...')
    const [categoriesResponse, merchantsResponse] = await Promise.all([
      apiClient.getCategories().catch(err => {
        console.error('[HomePage] Failed to fetch categories:', err)
        throw err
      }),
      apiClient.getMerchants().catch(err => {
        console.error('[HomePage] Failed to fetch merchants:', err)
        throw err
      })
    ])
    console.log('[HomePage] Successfully fetched data')

    // 定义标准分类（与前端UI保持一致）
    const standardCategories = [
      { id: 'gaming', name: 'Gaming', translatedName: '游戏娱乐', icon: 'gamepad' },
      { id: 'electronics', name: 'Electronics', translatedName: '电子产品', icon: 'laptop' },
      { id: 'fashion', name: 'Fashion', translatedName: '时尚服饰', icon: 'shirt' },
      { id: 'home-kitchen', name: 'Home & Kitchen', translatedName: '家居厨房', icon: 'home' },
      { id: 'sports-outdoor', name: 'Sports & Outdoor', translatedName: '运动户外', icon: 'bike' },
      { id: 'beauty-health', name: 'Beauty & Health', translatedName: '美妆护肤', icon: 'heart' },
      { id: 'automotive', name: 'Automotive', translatedName: '汽车用品', icon: 'car' },
      { id: 'food-drinks', name: 'Food & Drinks', translatedName: '食品饮料', icon: 'utensils' },
      { id: 'toys-kids', name: 'Toys & Kids', translatedName: '玩具儿童', icon: 'baby' },
      { id: 'books-media', name: 'Books & Media', translatedName: '图书影音', icon: 'book' },
      { id: 'pets', name: 'Pets', translatedName: '宠物用品', icon: 'paw' },
      { id: 'office', name: 'Office', translatedName: '办公用品', icon: 'briefcase' },
      { id: 'garden', name: 'Garden', translatedName: '园艺花园', icon: 'leaf' },
      { id: 'general', name: 'General', translatedName: '综合', icon: 'tag' },
    ]

    // 映射后端分类名到标准分类ID
    const categoryNameToId: Record<string, string> = {
      'gaming': 'gaming',
      'electronics': 'electronics',
      'fashion': 'fashion',
      'home & kitchen': 'home-kitchen',
      'sports & outdoor': 'sports-outdoor',
      'beauty & health': 'beauty-health',
      'automotive': 'automotive',
      'food & drinks': 'food-drinks',
      'toys & kids': 'toys-kids',
      'books & media': 'books-media',
      'pets': 'pets',
      'office': 'office',
      'garden': 'garden',
      'general': 'general',
    }

    // 合并后端数据和标准分类
    const categories = standardCategories.map(stdCat => {
      const backendCat = categoriesResponse.categories.find(
        c => categoryNameToId[c.name.toLowerCase()] === stdCat.id
      )
      return {
        ...stdCat,
        count: backendCat?.count || 0
      }
    }).filter(cat => cat.count > 0) // 只显示有数据的分类

    // 转换商家数据格式
    const merchants = merchantsResponse.merchants.map(m => ({
      name: m.merchant,
      count: m.deal_count
    }))

    // 暂时返回空的交叉筛选数据（后续可以从后端获取）
    return {
      categories,
      merchants,
      categoryByMerchant: {},
      merchantByCategory: {}
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
  const currentSortBy = typeof params.sortBy === 'string' ? params.sortBy : null
  const currentSortOrder = typeof params.sortOrder === 'string' ? params.sortOrder : null

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
        {/* 左侧：优惠列表 */}
        <div className="flex-1 min-w-0">
          <DealsListClient
            initialDeals={deals}
            totalCount={totalCount}
            initialPage={1}
            pageSize={PAGE_SIZE}
            categories={categories}
          />
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
        {/* Page Header - 类似 preisjaeger 的大标题 */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {pageTitle}
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            {totalCount} 个优惠 · 奥地利优惠信息聚合 · {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
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

          {/* 右侧：优惠列表 */}
          <div className="flex-1 min-w-0">
            <DealsListClient
              initialDeals={deals}
              totalCount={totalCount}
              initialPage={1}
              pageSize={PAGE_SIZE}
              categories={categories}
            />
          </div>
        </div>

        {/* 移动端筛选按钮 */}
        <MobileFilterButton
          merchants={merchants}
          currentMerchant={currentMerchant}
        />
      </section>
    )
  }

  return (
    <TranslationWrapper>
      <div className="min-h-screen bg-neutral-bg">
        {/* Header */}
        <SiteHeader merchants={merchants} categories={categories} />

        {/* Main Content - 根据模式渲染不同布局 */}
        {hasFilters ? renderFilteredLayout() : renderDiscoveryLayout()}

        {/* Stats Section - 简化版 */}
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                {totalCount}+
              </div>
              <div className="text-sm md:text-base text-gray-600">实时优惠</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                50+
              </div>
              <div className="text-sm md:text-base text-gray-600">合作商家</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                每日
              </div>
              <div className="text-sm md:text-base text-gray-600">自动更新</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                中文
              </div>
              <div className="text-sm md:text-base text-gray-600">AI翻译</div>
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
