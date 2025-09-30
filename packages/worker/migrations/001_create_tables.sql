-- RSS Worker数据库迁移脚本
-- 创建RSS抓取和翻译相关的表

-- RSS Feeds表
CREATE TABLE IF NOT EXISTS rss_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category VARCHAR(100),
    language VARCHAR(5) DEFAULT 'de',
    enabled BOOLEAN DEFAULT true,
    last_fetched TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RSS Items表
CREATE TABLE IF NOT EXISTS rss_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
    guid VARCHAR(500) NOT NULL,
    title TEXT,
    original_title TEXT,
    description TEXT,
    original_description TEXT,
    link TEXT NOT NULL,
    pub_date TIMESTAMP,
    categories JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),
    discount INTEGER,
    is_translated BOOLEAN DEFAULT false,
    translation_status VARCHAR(20) DEFAULT 'pending' CHECK (translation_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(feed_id, guid)
);

-- Translation Jobs表
CREATE TABLE IF NOT EXISTS translation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES rss_items(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('title', 'description')),
    original_text TEXT NOT NULL,
    translated_text TEXT,
    source_language VARCHAR(5) NOT NULL,
    target_language VARCHAR(5) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    provider VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_rss_feeds_enabled ON rss_feeds(enabled);
CREATE INDEX IF NOT EXISTS idx_rss_items_feed_id ON rss_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_items_translation_status ON rss_items(translation_status);
CREATE INDEX IF NOT EXISTS idx_rss_items_pub_date ON rss_items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_item_id ON translation_jobs(item_id);

-- 创建updated_at自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加updated_at触发器
DROP TRIGGER IF EXISTS update_rss_feeds_updated_at ON rss_feeds;
CREATE TRIGGER update_rss_feeds_updated_at
    BEFORE UPDATE ON rss_feeds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rss_items_updated_at ON rss_items;
CREATE TRIGGER update_rss_items_updated_at
    BEFORE UPDATE ON rss_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_translation_jobs_updated_at ON translation_jobs;
CREATE TRIGGER update_translation_jobs_updated_at
    BEFORE UPDATE ON translation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入一些示例RSS源
INSERT INTO rss_feeds (name, url, category, language) VALUES
    ('MyDealz Beliebteste', 'https://www.mydealz.de/rss/beliebteste', 'deals', 'de'),
    ('MyDealz Heißeste', 'https://www.mydealz.de/rss/heisseste', 'deals', 'de'),
    ('DealDoktor', 'https://www.dealdoktor.de/feed/', 'deals', 'de'),
    ('Schnäppchenfuchs', 'https://www.schnaeppchenfuchs.com/feed/', 'deals', 'de')
ON CONFLICT (url) DO NOTHING;

-- 显示表创建结果
SELECT 'RSS Feeds表创建完成' as message;
SELECT 'RSS Items表创建完成' as message;
SELECT 'Translation Jobs表创建完成' as message;
SELECT ' 索引创建完成' as message;
SELECT ' 触发器创建完成' as message;
SELECT '示例数据插入完成' as message;