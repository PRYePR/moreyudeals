/**
 * 日志器核心实现
 */

import {
  LogLevel,
  LogEntry,
  LogContext,
  LoggerConfig,
  ILogTransport,
  LogFormatter,
} from './types'
import { colorFormatter } from './formatters'

/**
 * Logger 类
 */
export class Logger {
  private level: LogLevel
  private enabled: boolean
  private defaultContext: LogContext
  private transports: ILogTransport[]
  private formatter: LogFormatter

  constructor(config: LoggerConfig = {}) {
    this.level = config.level ?? LogLevel.INFO
    this.enabled = config.enabled ?? true
    this.defaultContext = config.defaultContext || {}
    this.transports = config.transports || []
    this.formatter = config.formatter || colorFormatter
  }

  /**
   * 创建日志条目
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.defaultContext, ...context },
      error,
      metadata,
    }
  }

  /**
   * 写入日志
   */
  private write(entry: LogEntry): void {
    // 检查是否启用
    if (!this.enabled) {
      return
    }

    // 检查日志级别
    if (entry.level < this.level) {
      return
    }

    // 发送到所有传输器
    for (const transport of this.transports) {
      try {
        transport.log(entry)
      } catch (error) {
        // 传输器错误不应该影响应用程序
        console.error(`[Logger] Transport ${transport.name} failed:`, error)
      }
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, metadata?: Record<string, any>, context?: LogContext): void {
    this.write(this.createEntry(LogLevel.DEBUG, message, context, undefined, metadata))
  }

  /**
   * INFO 级别日志
   */
  info(message: string, metadata?: Record<string, any>, context?: LogContext): void {
    this.write(this.createEntry(LogLevel.INFO, message, context, undefined, metadata))
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, metadata?: Record<string, any>, context?: LogContext): void {
    this.write(this.createEntry(LogLevel.WARN, message, context, undefined, metadata))
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, error?: Error, metadata?: Record<string, any>, context?: LogContext): void {
    this.write(this.createEntry(LogLevel.ERROR, message, context, error, metadata))
  }

  /**
   * FATAL 级别日志
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>, context?: LogContext): void {
    this.write(this.createEntry(LogLevel.FATAL, message, context, error, metadata))
  }

  /**
   * 创建子 Logger（带有额外的上下文）
   */
  child(context: LogContext): Logger {
    return new Logger({
      level: this.level,
      enabled: this.enabled,
      defaultContext: { ...this.defaultContext, ...context },
      transports: this.transports,
      formatter: this.formatter,
    })
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * 添加传输器
   */
  addTransport(transport: ILogTransport): void {
    this.transports.push(transport)
  }

  /**
   * 移除传输器
   */
  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name)
  }

  /**
   * 清理资源
   */
  async close(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.close) {
        try {
          await transport.close()
        } catch (error) {
          console.error(`[Logger] Failed to close transport ${transport.name}:`, error)
        }
      }
    }
  }
}
