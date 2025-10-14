/**
 * Integration tests for /api/deals/[id] endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { dealsRepository } from '@/lib/db/deals-repository'

// Mock the deals repository
jest.mock('@/lib/db/deals-repository', () => ({
  dealsRepository: {
    getDealById: jest.fn(),
    incrementViews: jest.fn(),
  },
}))

const mockedRepository = dealsRepository as jest.Mocked<typeof dealsRepository>

describe('/api/deals/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - Success Cases', () => {
    it('should return deal details for valid ID', async () => {
      const mockDeal = {
        id: 'test-deal-123',
        sourceSite: 'sparhamster',
        sourcePostId: '12345',
        feedId: null,
        guid: 'test-guid',
        slug: 'test-deal',
        contentHash: 'hash123',
        title: 'Test Deal Title',
        description: 'Test deal description',
        contentHtml: '<p>Test content</p>',
        contentBlocks: [
          { type: 'paragraph', content: 'Test content' },
        ],
        titleZh: null,
        titleEn: null,
        descriptionZh: null,
        descriptionEn: null,
        contentHtmlZh: null,
        contentHtmlEn: null,
        contentBlocksZh: null,
        contentBlocksEn: null,
        translationStatus: 'pending' as const,
        price: 99.99,
        originalPrice: 149.99,
        discount: 50,
        currency: 'EUR',
        priceText: '€99.99',
        imageUrl: 'https://example.com/image.jpg',
        images: ['https://example.com/image1.jpg'],
        merchant: 'Test Merchant',
        merchantLogo: 'https://example.com/logo.jpg',
        merchantLink: 'https://example.com/merchant',
        dealUrl: 'https://example.com/deal',
        affiliateUrl: 'https://example.com/affiliate',
        couponCode: 'TEST123',
        dealType: 'deal',
        categories: ['Electronics'],
        tags: ['laptop', 'sale'],
        publishedAt: new Date('2025-10-01'),
        expiresAt: new Date('2025-12-31'),
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        duplicateCount: 0,
        viewsCount: 10,
        clicksCount: 5,
        rawPayload: null,
      }

      mockedRepository.getDealById.mockResolvedValue(mockDeal)
      mockedRepository.incrementViews.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/deals/test-deal-123')
      const params = Promise.resolve({ id: 'test-deal-123' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('test-deal-123')
      expect(data.title).toBe('Test Deal Title')
      expect(data.price).toBe(99.99)
      expect(data.discount).toBe(50)
      expect(data).toHaveProperty('isExpired')
      expect(data).toHaveProperty('daysRemaining')
      expect(data).toHaveProperty('viewedAt')

      expect(mockedRepository.getDealById).toHaveBeenCalledWith('test-deal-123')
      expect(mockedRepository.incrementViews).toHaveBeenCalledWith('test-deal-123')
    })

    it('should return correct isExpired flag for expired deal', async () => {
      const mockDeal = {
        id: 'expired-deal-123',
        title: 'Expired Deal',
        price: 50,
        discount: 20,
        currency: 'EUR',
        expiresAt: new Date('2020-01-01'), // Past date
        publishedAt: new Date('2019-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceSite: 'test',
        guid: 'test-guid',
        translationStatus: 'pending' as const,
        duplicateCount: 0,
        viewsCount: 0,
        clicksCount: 0,
      }

      mockedRepository.getDealById.mockResolvedValue(mockDeal as any)
      mockedRepository.incrementViews.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/deals/expired-deal-123')
      const params = Promise.resolve({ id: 'expired-deal-123' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isExpired).toBe(true)
      expect(data.daysRemaining).toBe(0)
    })

    it('should return correct isExpired flag for active deal', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30) // 30 days from now

      const mockDeal = {
        id: 'active-deal-123',
        title: 'Active Deal',
        price: 75,
        discount: 25,
        currency: 'EUR',
        expiresAt: futureDate,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceSite: 'test',
        guid: 'test-guid',
        translationStatus: 'pending' as const,
        duplicateCount: 0,
        viewsCount: 0,
        clicksCount: 0,
      }

      mockedRepository.getDealById.mockResolvedValue(mockDeal as any)
      mockedRepository.incrementViews.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/deals/active-deal-123')
      const params = Promise.resolve({ id: 'active-deal-123' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isExpired).toBe(false)
      expect(data.daysRemaining).toBeGreaterThan(25)
      expect(data.daysRemaining).toBeLessThanOrEqual(31)
    })

    it('should handle deals without expiration date', async () => {
      const mockDeal = {
        id: 'no-expiry-123',
        title: 'No Expiry Deal',
        price: 100,
        discount: 10,
        currency: 'EUR',
        expiresAt: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceSite: 'test',
        guid: 'test-guid',
        translationStatus: 'pending' as const,
        duplicateCount: 0,
        viewsCount: 0,
        clicksCount: 0,
      }

      mockedRepository.getDealById.mockResolvedValue(mockDeal as any)
      mockedRepository.incrementViews.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/deals/no-expiry-123')
      const params = Promise.resolve({ id: 'no-expiry-123' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isExpired).toBe(false)
      expect(data.daysRemaining).toBeNull()
    })

    it('should include contentBlocks in response', async () => {
      const mockDeal = {
        id: 'deal-with-blocks-123',
        title: 'Deal with Content Blocks',
        price: 50,
        discount: 30,
        currency: 'EUR',
        contentBlocks: [
          { type: 'heading', content: 'Features', level: 2 },
          { type: 'paragraph', content: 'This is a great deal' },
          { type: 'list', items: ['Feature 1', 'Feature 2'] },
        ],
        publishedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceSite: 'test',
        guid: 'test-guid',
        translationStatus: 'pending' as const,
        duplicateCount: 0,
        viewsCount: 0,
        clicksCount: 0,
      }

      mockedRepository.getDealById.mockResolvedValue(mockDeal as any)
      mockedRepository.incrementViews.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/deals/deal-with-blocks-123')
      const params = Promise.resolve({ id: 'deal-with-blocks-123' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contentBlocks).toHaveLength(3)
      expect(data.contentBlocks[0].type).toBe('heading')
      expect(data.contentBlocks[1].type).toBe('paragraph')
      expect(data.contentBlocks[2].type).toBe('list')
    })
  })

  describe('GET - Error Cases', () => {
    it('should return 404 for non-existent deal', async () => {
      mockedRepository.getDealById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/deals/non-existent-id')
      const params = Promise.resolve({ id: 'non-existent-id' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Deal not found')
      expect(mockedRepository.incrementViews).not.toHaveBeenCalled()
    })

    it('should return 500 on database error', async () => {
      mockedRepository.getDealById.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/deals/error-deal')
      const params = Promise.resolve({ id: 'error-deal' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle incrementViews failure gracefully', async () => {
      const mockDeal = {
        id: 'test-deal-456',
        title: 'Test Deal',
        price: 99,
        discount: 20,
        currency: 'EUR',
        publishedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceSite: 'test',
        guid: 'test-guid',
        translationStatus: 'pending' as const,
        duplicateCount: 0,
        viewsCount: 0,
        clicksCount: 0,
      }

      mockedRepository.getDealById.mockResolvedValue(mockDeal as any)
      mockedRepository.incrementViews.mockRejectedValue(new Error('Failed to increment'))

      const request = new NextRequest('http://localhost:3000/api/deals/test-deal-456')
      const params = Promise.resolve({ id: 'test-deal-456' })
      const response = await GET(request, { params })

      // Should still return 200 even if incrementViews fails
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe('test-deal-456')
    })
  })

  describe('GET - Response Structure', () => {
    it('should return all required fields', async () => {
      const mockDeal = {
        id: 'full-deal-123',
        sourceSite: 'test',
        sourcePostId: '123',
        feedId: 'feed-1',
        guid: 'guid-123',
        slug: 'test-slug',
        contentHash: 'hash',
        title: 'Full Deal',
        description: 'Description',
        contentHtml: '<p>HTML</p>',
        contentBlocks: [],
        titleZh: null,
        titleEn: null,
        descriptionZh: null,
        descriptionEn: null,
        contentHtmlZh: null,
        contentHtmlEn: null,
        contentBlocksZh: null,
        contentBlocksEn: null,
        translationStatus: 'completed' as const,
        price: 100,
        originalPrice: 150,
        discount: 50,
        currency: 'EUR',
        priceText: '€100',
        imageUrl: 'image.jpg',
        images: ['img1.jpg', 'img2.jpg'],
        merchant: 'Merchant',
        merchantLogo: 'logo.jpg',
        merchantLink: 'merchant.com',
        dealUrl: 'deal.com',
        affiliateUrl: 'affiliate.com',
        couponCode: 'CODE123',
        dealType: 'deal',
        categories: ['Cat1', 'Cat2'],
        tags: ['tag1'],
        publishedAt: new Date(),
        expiresAt: null,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        duplicateCount: 2,
        viewsCount: 100,
        clicksCount: 50,
        rawPayload: { test: 'data' },
      }

      mockedRepository.getDealById.mockResolvedValue(mockDeal)
      mockedRepository.incrementViews.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/deals/full-deal-123')
      const params = Promise.resolve({ id: 'full-deal-123' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)

      // Check base fields
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('description')
      expect(data).toHaveProperty('price')
      expect(data).toHaveProperty('discount')
      expect(data).toHaveProperty('currency')

      // Check computed fields
      expect(data).toHaveProperty('isExpired')
      expect(data).toHaveProperty('daysRemaining')
      expect(data).toHaveProperty('viewedAt')

      // Check array fields
      expect(Array.isArray(data.images)).toBe(true)
      expect(Array.isArray(data.categories)).toBe(true)
      expect(Array.isArray(data.tags)).toBe(true)
    })
  })
})
