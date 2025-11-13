import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// 加载环境变量：优先加载 .env.local，然后是 .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Cloudflare Tunnel
app.set('trust proxy', true);

// Database connection pool (read-only)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moreyudeals',
  user: process.env.DB_USER || 'moreyudeals_readonly',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection on startup
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(express.json());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip health checks to avoid rate limiting monitoring tools
  skip: (req) => req.path === '/api/health',
});

app.use('/api/', limiter);

// API Key middleware
const apiKeyAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
};

// Apply API key auth to all /api routes except health check
app.use('/api/', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return apiKeyAuth(req, res, next);
});

// Health check endpoint (public)
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, COUNT(*) as deal_count FROM deals');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].time,
      dealCount: parseInt(result.rows[0].deal_count),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

// Get deals with pagination and filters
app.get('/api/deals', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      merchant,
      category,
      min_price,
      max_price,
      search,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const conditions: string[] = ["translation_status = 'completed'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (merchant) {
      conditions.push(`COALESCE(canonical_merchant_name, 'Unknown') = $${paramIndex++}`);
      params.push(merchant);
    }

    if (category) {
      // categories is a JSONB array column in the database
      // Use @> operator to check if the array contains the category
      conditions.push(`categories @> $${paramIndex}::jsonb`);
      params.push(JSON.stringify([category])); // Wrap in array for JSONB containment check
      paramIndex++;
    }

    if (min_price) {
      conditions.push(`price >= $${paramIndex++}`);
      params.push(parseFloat(min_price as string));
    }

    if (max_price) {
      conditions.push(`price <= $${paramIndex++}`);
      params.push(parseFloat(max_price as string));
    }

    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort field (prevent SQL injection)
    const allowedSortFields = ['created_at', 'price', 'title', 'merchant', 'published_at', 'discount', 'expires_at'];
    const sortField = allowedSortFields.includes(sort as string) ? sort : 'published_at';  // 默认按 published_at 排序
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM deals ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT
        id, guid, title, description, link, merchant, price,
        currency, categories, image_url, created_at, updated_at,
        translation_status, title_de, content_html,
        merchant_link, affiliate_link, fallback_link,
        merchant_logo, canonical_merchant_name, original_price, discount,
        published_at, expires_at
      FROM deals
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limitNum, offset);

    const dataResult = await pool.query(dataQuery, params);

    res.json({
      data: dataResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get single deal by ID
app.get('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id, guid, title, description, link, merchant, price,
        currency, categories, image_url, created_at, updated_at,
        translation_status, title_de, content_html,
        merchant_link, affiliate_link, fallback_link,
        merchant_logo, canonical_merchant_name, original_price, discount,
        published_at, expires_at
      FROM deals
      WHERE id = $1
        AND translation_status = 'completed'
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// Get merchants list
app.get('/api/merchants', async (req, res) => {
  try {
    const { search, category, merchant } = req.query;

    // 构建 WHERE 条件
    const conditions = ['translation_status = $1'];
    const params: any[] = ['completed'];
    let paramIndex = 2;

    // 搜索条件：搜索标题和描述
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // 分类筛选
    if (category) {
      conditions.push(`categories @> $${paramIndex}::jsonb`);
      params.push(JSON.stringify([category]));
      paramIndex++;
    }

    // 商家筛选
    if (merchant) {
      conditions.push(`canonical_merchant_name = $${paramIndex}`);
      params.push(merchant);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT
        COALESCE(canonical_merchant_name, 'Unknown') as merchant,
        COUNT(*) as deal_count,
        MAX(created_at) as last_deal_at
      FROM deals
      WHERE ${whereClause}
      GROUP BY canonical_merchant_name
      ORDER BY deal_count DESC
    `;

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ error: 'Failed to fetch merchants' });
  }
});

// Get categories list
app.get('/api/categories', async (req, res) => {
  try {
    const { search, category, merchant } = req.query;

    // 构建 WHERE 条件
    const conditions = ['category IS NOT NULL', 'translation_status = $1'];
    const params: any[] = ['completed'];
    let paramIndex = 2;

    // 搜索条件：搜索标题和描述
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // 分类筛选
    if (category) {
      conditions.push(`categories @> $${paramIndex}::jsonb`);
      params.push(JSON.stringify([category]));
      paramIndex++;
    }

    // 商家筛选
    if (merchant) {
      conditions.push(`canonical_merchant_name = $${paramIndex}`);
      params.push(merchant);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT
        category,
        COUNT(*) as deal_count,
        MAX(created_at) as last_deal_at
      FROM deals,
           jsonb_array_elements_text(categories) as category
      WHERE ${whereClause}
      GROUP BY category
      ORDER BY deal_count DESC
    `;

    const result = await pool.query(query, params);

    // Transform to match frontend expectation: {categories: [{name, count}]}
    const categories = result.rows.map(row => ({
      name: row.category,
      count: parseInt(row.deal_count)
    }));

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get cross-filtering data (category-merchant matrix)
app.get('/api/cross-filter', async (req, res) => {
  try {
    // Get category-merchant combinations with counts
    const query = `
      SELECT
        category,
        COALESCE(canonical_merchant_name, 'Unknown') as merchant,
        COUNT(*) as deal_count
      FROM deals,
           jsonb_array_elements_text(categories) as category
      WHERE category IS NOT NULL
        AND translation_status = 'completed'
      GROUP BY category, canonical_merchant_name
      HAVING COUNT(*) > 0
      ORDER BY category, deal_count DESC
    `;

    const result = await pool.query(query);

    // Transform into two lookup objects
    const categoryByMerchant: Record<string, Record<string, number>> = {};
    const merchantByCategory: Record<string, Record<string, number>> = {};

    result.rows.forEach(row => {
      const { category, merchant, deal_count } = row;
      const count = parseInt(deal_count);

      // categoryByMerchant[merchant][category] = count
      if (!categoryByMerchant[merchant]) {
        categoryByMerchant[merchant] = {};
      }
      categoryByMerchant[merchant][category] = count;

      // merchantByCategory[category][merchant] = count
      if (!merchantByCategory[category]) {
        merchantByCategory[category] = {};
      }
      merchantByCategory[category][merchant] = count;
    });

    res.json({
      data: {
        categoryByMerchant,
        merchantByCategory
      }
    });
  } catch (error) {
    console.error('Error fetching cross-filter data:', error);
    res.status(500).json({ error: 'Failed to fetch cross-filter data' });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    // Get basic stats
    const basicStatsQuery = `
      SELECT
        COUNT(*) as total_deals,
        COUNT(DISTINCT merchant) as total_merchants,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as translated_deals,
        MAX(created_at) as latest_deal_at
      FROM deals
      WHERE translation_status = 'completed'
    `;

    // Get total categories count from JSONB array
    const categoriesCountQuery = `
      SELECT COUNT(DISTINCT category) as total_categories
      FROM deals,
           jsonb_array_elements_text(categories) as category
      WHERE translation_status = 'completed'
    `;

    const [basicResult, categoriesResult] = await Promise.all([
      pool.query(basicStatsQuery),
      pool.query(categoriesCountQuery)
    ]);

    res.json({
      data: {
        ...basicResult.rows[0],
        total_categories: categoriesResult.rows[0].total_categories
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔒 API Key authentication enabled`);
});
