/**
 * 日志系统类型定义
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * 日志级别字符串映射
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
}

/**
 * 日志上下文
 */
export interface LogContext {
  /**
   * 模块名称
   */
  module?: string

  /**
   * 请求ID（用于追踪请求链路）
   */
  requestId?: string

  /**
   * 用户ID
   */
  userId?: string

  /**
   * 其他自定义字段
   */
  [key: string]: any
}

/**
 * 日志条目
 */
export interface LogEntry {
  /**
   * 日志级别
   */
  level: LogLevel

  /**
   * 日志消息
   */
  message: string

  /**
   * 时间戳
   */
  timestamp: Date

  /**
   * 上下文信息
   */
  context?: LogContext

  /**
   * 错误对象（仅 ERROR/FATAL 级别）
   */
  error?: Error

  /**
   * 额外元数据
   */
  metadata?: Record<string, any>
}

/**
 * 日志传输器接口
 */
export interface ILogTransport {
  /**
   * 传输器名称
   */
  name: string

  /**
   * 写入日志
   */
  log(entry: LogEntry): void | Promise<void>

  /**
   * 清理资源
   */
  close?(): void | Promise<void>
}

/**
 * 日志格式化器
 */
export type LogFormatter = (entry: LogEntry) => string

/**
 * 日志配置
 */
export interface LoggerConfig {
  /**
   * 最小日志级别
   */
  level?: LogLevel

  /**
   * 是否启用
   */
  enabled?: boolean

  /**
   * 默认上下文
   */
  defaultContext?: LogContext

  /**
   * 传输器列表
   */
  transports?: ILogTransport[]

  /**
   * 格式化器
   */
  formatter?: LogFormatter
}
