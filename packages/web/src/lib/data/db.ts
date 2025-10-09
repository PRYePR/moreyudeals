import { Pool, PoolClient, QueryResult } from 'pg'

let pool: Pool | null = null

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL

  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined
    })
  }

  const host = process.env.DB_HOST || 'localhost'
  const port = Number(process.env.DB_PORT || '5432')
  const database = process.env.DB_NAME || 'moreyudeals_dev'
  const user = process.env.DB_USER || 'postgres'
  const password = process.env.DB_PASSWORD || ''

  return new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined
  })
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool()
  }
  return pool
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export async function query<T extends Record<string, any> = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  return withClient(async (client) => client.query<T>(text, params))
}
