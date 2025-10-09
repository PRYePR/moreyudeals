import { query } from './db'

export interface DealRow {
  id: string
  feed_id: string
  guid: string
  title: string | null
  original_title: string | null
  description: string | null
  original_description: string | null
  link: string
  pub_date: Date
  categories: string | null
  image_url: string | null
  price: string | null
  original_price: string | null
  discount: number | null
  is_translated: boolean | null
  translation_status: string | null
  translation_provider?: string | null
  translation_language?: string | null
  translation_detected_language?: string | null
  content_html?: string | null
  content_text?: string | null
  merchant_name?: string | null
  merchant_logo?: string | null
  currency?: string | null
  expires_at?: Date | null
  created_at: Date
  updated_at: Date
}

const DATASET_LIMIT = Math.min(
  Math.max(Number(process.env.DEALS_DATASET_LIMIT || '120'), 20),
  500
)

export async function fetchRecentDeals(): Promise<DealRow[]> {
  const result = await query<DealRow>(
    `
      SELECT *
      FROM rss_items
      ORDER BY pub_date DESC NULLS LAST, created_at DESC
      LIMIT $1
    `,
    [DATASET_LIMIT]
  )

  return result.rows
}

export async function fetchDealByIdentifier(identifier: string): Promise<DealRow | null> {
  const result = await query<DealRow>(
    `
      SELECT *
      FROM rss_items
      WHERE id = $1 OR guid = $1 OR link = $1
      LIMIT 1
    `,
    [identifier]
  )

  if (result.rowCount === 0 && identifier.startsWith('http')) {
    const slug = identifier.split('/').filter(Boolean).pop()
    if (slug) {
      const slugResult = await query<DealRow>(
        `
          SELECT *
          FROM rss_items
          WHERE guid LIKE $1 || '%'
          ORDER BY pub_date DESC
          LIMIT 1
        `,
        [slug]
      )
      return slugResult.rows[0] || null
    }
  }

  return result.rows[0] || null
}
