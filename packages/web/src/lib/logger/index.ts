/**
 * 日志模块统一导出
 */

// Types
export * from './types'

// Core
export { Logger } from './logger'

// Transports
export { ConsoleTransport, FileTransport, MemoryTransport, MultiTransport } from './transports'

// Formatters
export { simpleFormatter, jsonFormatter, colorFormatter, compactFormatter } from './formatters'

// Factory and default instance
import { Logger } from './logger'
import { LogLevel, LoggerConfig } from './types'
import { ConsoleTransport } from './transports'

/**
 * 创建 Logger 实例
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config)
}

/**
 * 默认 Logger 实例
 *
 * 配置：
 * - 开发环境: DEBUG 级别，带颜色的控制台输出
 * - 生产环境: INFO 级别，简单格式
 */
export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enabled: true,
  transports: [new ConsoleTransport()],
})

/**
 * 便捷方法 - 创建模块专用 logger
 */
export function createModuleLogger(moduleName: string): Logger {
  return logger.child({ module: moduleName })
}

/**
 * 便捷导出 - 直接使用的日志方法
 */
export const log = {
  debug: (message: string, metadata?: Record<string, any>) => logger.debug(message, metadata),
  info: (message: string, metadata?: Record<string, any>) => logger.info(message, metadata),
  warn: (message: string, metadata?: Record<string, any>) => logger.warn(message, metadata),
  error: (message: string, error?: Error, metadata?: Record<string, any>) => logger.error(message, error, metadata),
  fatal: (message: string, error?: Error, metadata?: Record<string, any>) => logger.fatal(message, error, metadata),
}
