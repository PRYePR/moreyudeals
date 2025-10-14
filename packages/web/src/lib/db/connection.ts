/**
 * Database connection pool for PostgreSQL
 * Uses environment variables from .env.local
 */

import { Pool, PoolConfig } from 'pg'

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moreyudeals',
  user: process.env.DB_USER || 'moreyu_admin',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),
}

// Create a singleton pool instance
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(config)

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err)
    })

    pool.on('connect', () => {
      console.log('PostgreSQL client connected')
    })
  }

  return pool
}

/**
 * Execute a query with the connection pool
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool()
  const start = Date.now()

  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: result.rowCount })
    }

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    }
  } catch (error) {
    console.error('Database query error', { text, error })
    throw error
  }
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('PostgreSQL pool closed')
  }
}
