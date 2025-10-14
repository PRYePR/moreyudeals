-- ============================================
-- 迁移脚本: 创建 deals 表
-- 用于: T10 主程序集成测试
-- 日期: 2025-10-13
-- 注意: 这是简化版,不迁移现有 rss_items 数据
-- ============================================

BEGIN;

-- 1. 创建 deals 表
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_site VARCHAR(50) NOT NULL DEFAULT 'sparhamster',
  source_post_id VARCHAR(100),
  feed_id UUID,  -- 可空,解除强制依赖
  guid VARCHAR(500) NOT NULL,
  slug VARCHAR(255),
  content_hash VARCHAR(16),

  title TEXT,
  original_title TEXT,
  description TEXT,
  original_description TEXT,
  content_html TEXT,
  content_text TEXT,
  content_blocks JSONB DEFAULT '[]'::jsonb,

  link TEXT NOT NULL,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,

  merchant VARCHAR(255),
  merchant_logo TEXT,
  merchant_link TEXT,

  affiliate_link TEXT,
  affiliate_enabled BOOLEAN DEFAULT false NOT NULL,
  affiliate_network VARCHAR(50),

  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  discount INTEGER,
  currency VARCHAR(3) DEFAULT 'EUR' NOT NULL,
  coupon_code VARCHAR(100),

  categories JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,

  published_at TIMESTAMP,
  expires_at TIMESTAMP,

  language VARCHAR(5) DEFAULT 'de' NOT NULL,
  translation_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  translation_provider VARCHAR(32),
  translation_language VARCHAR(8),
  translation_detected_language VARCHAR(8),
  is_translated BOOLEAN DEFAULT false NOT NULL,

  raw_payload JSONB,
  duplicate_count INTEGER DEFAULT 0 NOT NULL,
  first_seen_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT deals_translation_status_check
    CHECK (translation_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_deals_source_site ON deals(source_site);
CREATE INDEX IF NOT EXISTS idx_deals_content_hash ON deals(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_merchant ON deals(merchant) WHERE merchant IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_published_at ON deals(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_translation_status ON deals(translation_status);
CREATE INDEX IF NOT EXISTS idx_deals_first_seen_at ON deals(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_expires_at ON deals(expires_at) WHERE expires_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_source_guid ON deals(source_site, guid);

-- 3. 添加触发器 (使用已存在的函数)
DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- 显示创建结果
SELECT 'deals 表创建完成' AS message;
SELECT COUNT(*) AS deals_count FROM deals;
