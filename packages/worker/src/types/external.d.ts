declare module 'pg' {
  export class Pool {
    constructor(config?: any)
    connect(): Promise<PoolClient>
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>
    end(): Promise<void>
  }

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>
    release(): void
  }
}

declare module 'cron' {
  export class CronJob {
    constructor(cronTime: string, onTick: () => void | Promise<void>)
    start(): void
    stop(): void
  }
}

declare module 'rss-parser' {
  export default class Parser<T = any> {
    constructor(options?: any)
    parseURL(url: string): Promise<{ items: T[] }>
  }
}

declare module 'cheerio' {
  export function load(html: string): CheerioAPI

  export interface CheerioAPI {
    (selector: string): CheerioElement
    text(): string
  }

  export interface CheerioElement {
    text(): string
    attr(name: string): string | undefined
    first(): CheerioElement
    length: number
  }
}
