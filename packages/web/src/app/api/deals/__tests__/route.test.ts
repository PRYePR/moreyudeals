/**
 * Integration tests for /api/deals endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { dealsRepository } from '@/lib/db/deals-repository'

// Mock the deals repository
jest.mock('@/lib/db/deals-repository', () => ({
  dealsRepository: {
    getDeals: jest.fn(),
  },
}))

const mockedRepository = dealsRepository as jest.Mocked<typeof dealsRepository>

describe('/api/deals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - Success Cases', () => {
    it('should return deals with default pagination', async () => {
      const mockResult = {
        deals: [
          {
            id: '123',
            title: 'Test Deal',
            price: 99.99,
            discount: 20,
            currency: 'EUR',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.deals).toHaveLength(1)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20)
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      )
    })

    it('should handle pagination parameters', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: true,
        },
        filters: { page: 2, limit: 10 },
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals?page=2&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      )
    })

    it('should handle category filter', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 5,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: { category: 'Electronics' },
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals?category=Electronics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Electronics',
        })
      )
    })

    it('should handle price range filters', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest(
        'http://localhost:3000/api/deals?minPrice=50&maxPrice=200'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          minPrice: 50,
          maxPrice: 200,
        })
      )
    })

    it('should handle discount filter', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals?minDiscount=30')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          minDiscount: 30,
        })
      )
    })

    it('should handle sorting options', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const sortOptions = ['latest', 'price_asc', 'price_desc', 'discount']

      for (const sortBy of sortOptions) {
        jest.clearAllMocks()
        const request = new NextRequest(`http://localhost:3000/api/deals?sortBy=${sortBy}`)
        const response = await GET(request)

        expect(response.status).toBe(200)
        expect(mockedRepository.getDeals).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy,
          })
        )
      }
    })

    it('should handle search query', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals?search=laptop')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'laptop',
        })
      )
    })

    it('should handle multiple filters combined', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest(
        'http://localhost:3000/api/deals?category=Electronics&minPrice=100&sortBy=price_desc&page=2'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          category: 'Electronics',
          minPrice: 100,
          sortBy: 'price_desc',
        })
      )
    })
  })

  describe('GET - Parameter Validation', () => {
    it('should enforce maximum limit of 100', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals?limit=500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should clamp to max of 100
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
        })
      )
      expect(data.pagination.limit).toBe(100)
    })

    it('should handle invalid page number gracefully', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals?page=-5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should default to page 1
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
        })
      )
      expect(data.pagination.page).toBe(1)
    })

    it('should handle non-numeric price values', async () => {
      const mockResult = {
        deals: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals?minPrice=invalid')
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Should ignore invalid values
      expect(mockedRepository.getDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          minPrice: undefined,
        })
      )
    })
  })

  describe('GET - Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockedRepository.getDeals.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/deals')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should handle timeout errors', async () => {
      mockedRepository.getDeals.mockRejectedValue(new Error('Query timeout'))

      const request = new NextRequest('http://localhost:3000/api/deals')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('GET - Response Structure', () => {
    it('should return correct response structure', async () => {
      const mockResult = {
        deals: [
          {
            id: '123',
            title: 'Test Deal',
            price: 99.99,
            discount: 20,
            currency: 'EUR',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: {},
        meta: {
          fetchedAt: new Date().toISOString(),
          source: 'database',
          cacheHit: false,
        },
      }

      mockedRepository.getDeals.mockResolvedValue(mockResult as any)

      const request = new NextRequest('http://localhost:3000/api/deals')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('deals')
      expect(data).toHaveProperty('pagination')
      expect(data).toHaveProperty('filters')
      expect(data).toHaveProperty('meta')

      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('totalPages')
      expect(data.pagination).toHaveProperty('hasNext')
      expect(data.pagination).toHaveProperty('hasPrev')

      expect(data.meta).toHaveProperty('fetchedAt')
      expect(data.meta).toHaveProperty('source')
      expect(data.meta).toHaveProperty('cacheHit')
    })
  })
})
