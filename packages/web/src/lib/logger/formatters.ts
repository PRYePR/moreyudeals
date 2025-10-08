/**
 * 日志格式化器
 */

import { LogEntry, LogLevel, LogLevelNames } from './types'

/**
 * 简单文本格式化器
 */
export function simpleFormatter(entry: LogEntry): string {
  const { level, message, timestamp, context, error, metadata } = entry

  const parts: string[] = []

  // 时间戳
  parts.push(`[${timestamp.toISOString()}]`)

  // 级别
  parts.push(`[${LogLevelNames[level]}]`)

  // 模块
  if (context?.module) {
    parts.push(`[${context.module}]`)
  }

  // 消息
  parts.push(message)

  // 元数据
  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(JSON.stringify(metadata))
  }

  // 错误
  if (error) {
    parts.push(`\n  Error: ${error.message}`)
    if (error.stack) {
      parts.push(`\n  Stack: ${error.stack}`)
    }
  }

  return parts.join(' ')
}

/**
 * JSON 格式化器（适合日志聚合系统）
 */
export function jsonFormatter(entry: LogEntry): string {
  const { level, message, timestamp, context, error, metadata } = entry

  const logObject: any = {
    timestamp: timestamp.toISOString(),
    level: LogLevelNames[level],
    message,
  }

  if (context) {
    logObject.context = context
  }

  if (metadata) {
    logObject.metadata = metadata
  }

  if (error) {
    logObject.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  }

  return JSON.stringify(logObject)
}

/**
 * 带颜色的控制台格式化器
 */
export function colorFormatter(entry: LogEntry): string {
  const { level, message, timestamp, context, error, metadata } = entry

  // ANSI 颜色代码
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  }

  // 根据级别选择颜色
  let levelColor = colors.reset
  let levelIcon = '●'

  switch (level) {
    case LogLevel.DEBUG:
      levelColor = colors.gray
      levelIcon = '◆'
      break
    case LogLevel.INFO:
      levelColor = colors.blue
      levelIcon = '●'
      break
    case LogLevel.WARN:
      levelColor = colors.yellow
      levelIcon = '▲'
      break
    case LogLevel.ERROR:
      levelColor = colors.red
      levelIcon = '✖'
      break
    case LogLevel.FATAL:
      levelColor = colors.magenta + colors.bright
      levelIcon = '✖✖'
      break
  }

  const parts: string[] = []

  // 时间戳（灰色）
  parts.push(`${colors.gray}${timestamp.toISOString().split('T')[1].split('.')[0]}${colors.reset}`)

  // 级别（带颜色）
  parts.push(`${levelColor}${levelIcon} ${LogLevelNames[level].padEnd(5)}${colors.reset}`)

  // 模块（青色）
  if (context?.module) {
    parts.push(`${colors.cyan}[${context.module}]${colors.reset}`)
  }

  // 消息
  parts.push(message)

  // 元数据（灰色）
  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(`${colors.gray}${JSON.stringify(metadata)}${colors.reset}`)
  }

  let result = parts.join(' ')

  // 错误（红色）
  if (error) {
    result += `\n  ${colors.red}Error: ${error.message}${colors.reset}`
    if (error.stack) {
      result += `\n  ${colors.dim}${error.stack}${colors.reset}`
    }
  }

  return result
}

/**
 * 紧凑格式化器（单行，适合生产环境）
 */
export function compactFormatter(entry: LogEntry): string {
  const { level, message, timestamp, context, error, metadata } = entry

  const parts: string[] = [
    timestamp.toISOString(),
    LogLevelNames[level],
    context?.module || '-',
    message,
  ]

  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(JSON.stringify(metadata))
  }

  if (error) {
    parts.push(`error="${error.message}"`)
  }

  return parts.join(' | ')
}
