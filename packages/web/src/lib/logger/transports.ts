/**
 * 日志传输器实现
 */

import { ILogTransport, LogEntry, LogFormatter } from './types'
import { colorFormatter, simpleFormatter } from './formatters'

/**
 * 控制台传输器
 */
export class ConsoleTransport implements ILogTransport {
  name = 'console'
  private formatter: LogFormatter

  constructor(formatter?: LogFormatter) {
    this.formatter = formatter || (process.env.NODE_ENV === 'production' ? simpleFormatter : colorFormatter)
  }

  log(entry: LogEntry): void {
    const formatted = this.formatter(entry)
    console.log(formatted)
  }
}

/**
 * 文件传输器（简单实现）
 *
 * 注意：这是一个简化的实现，适合开发环境
 * 生产环境建议使用专业的日志库（如 winston, pino）
 */
export class FileTransport implements ILogTransport {
  name = 'file'
  private formatter: LogFormatter
  private buffer: string[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor(formatter?: LogFormatter) {
    this.formatter = formatter || simpleFormatter

    // 每5秒刷新一次缓冲区（在实际实现中应该写入文件）
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 5000)
  }

  log(entry: LogEntry): void {
    const formatted = this.formatter(entry)
    this.buffer.push(formatted)

    // 如果缓冲区过大，立即刷新
    if (this.buffer.length >= 100) {
      this.flush()
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) {
      return
    }

    // 在实际实现中，这里应该写入文件
    // 现在只是简单地输出到控制台
    if (process.env.LOG_TO_FILE === 'true') {
      console.log('[FileTransport] Flushing logs:', this.buffer.length)
    }

    this.buffer = []
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flush()
  }
}

/**
 * 内存传输器（用于测试和调试）
 */
export class MemoryTransport implements ILogTransport {
  name = 'memory'
  private logs: LogEntry[] = []
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  log(entry: LogEntry): void {
    this.logs.push(entry)

    // 保持最大大小限制
    if (this.logs.length > this.maxSize) {
      this.logs.shift()
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = []
  }

  /**
   * 获取日志数量
   */
  size(): number {
    return this.logs.length
  }
}

/**
 * 多传输器组合
 */
export class MultiTransport implements ILogTransport {
  name = 'multi'
  private transports: ILogTransport[]

  constructor(transports: ILogTransport[]) {
    this.transports = transports
  }

  log(entry: LogEntry): void {
    for (const transport of this.transports) {
      try {
        transport.log(entry)
      } catch (error) {
        console.error(`[MultiTransport] Transport ${transport.name} failed:`, error)
      }
    }
  }

  async close(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.close) {
        try {
          await transport.close()
        } catch (error) {
          console.error(`[MultiTransport] Failed to close ${transport.name}:`, error)
        }
      }
    }
  }
}
