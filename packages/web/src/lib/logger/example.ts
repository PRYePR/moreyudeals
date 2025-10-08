/**
 * 日志系统使用示例
 *
 * 这个文件展示了如何使用新的日志系统
 */

import { createModuleLogger, log, logger } from './index'

// ============================================
// 方式 1: 使用全局 log 便捷方法
// ============================================
export function example1() {
  log.debug('This is a debug message')
  log.info('User logged in', { userId: '123', username: 'john' })
  log.warn('API rate limit approaching', { current: 950, limit: 1000 })
  log.error('Failed to save data', new Error('Database connection lost'))
}

// ============================================
// 方式 2: 使用模块专用 logger
// ============================================
const translationLogger = createModuleLogger('translation')
const cacheLogger = createModuleLogger('cache')

export function example2() {
  translationLogger.info('Starting translation', { text: 'Hello World', from: 'en', to: 'de' })
  translationLogger.debug('Cache hit', { key: 'translation:en-de:hello' })

  cacheLogger.info('Cache initialized', { type: 'memory', size: 0 })
  cacheLogger.warn('Cache size exceeds 80%', { current: 850, max: 1000 })
}

// ============================================
// 方式 3: 创建带有上下文的子 logger
// ============================================
export function example3(requestId: string) {
  const requestLogger = logger.child({ requestId })

  requestLogger.info('Request started', { method: 'GET', path: '/api/deals' })
  requestLogger.debug('Fetching from database')
  requestLogger.info('Request completed', { duration: 125, statusCode: 200 })
}

// ============================================
// 方式 4: 记录错误和异常
// ============================================
export function example4() {
  try {
    throw new Error('Something went wrong')
  } catch (error) {
    log.error('Failed to process request', error as Error, {
      context: 'example4',
      timestamp: Date.now()
    })
  }
}

// ============================================
// 替换现有 console.log 的模式
// ============================================

// 之前:
// console.log('✅ Translation completed:', result)

// 之后:
// log.info('Translation completed', { provider: 'deepl', duration: 492 })

// 之前:
// console.error('❌ Error fetching deals:', error)

// 之后:
// log.error('Error fetching deals', error, { source: 'sparhamster' })

// 之前:
// console.log(`📊 Click tracked: ${dealId}`)

// 之后:
// log.info('Click tracked', { dealId, merchant, deviceType })
