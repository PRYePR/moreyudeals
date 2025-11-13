import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'moreyudeals_dev',
  user: process.env.DB_USER || 'prye',
  password: process.env.DB_PASSWORD || '',
});

async function check() {
  const result = await pool.query(`
    SELECT
      id,
      title_de,
      merchant,
      canonical_merchant_name,
      merchant_logo,
      source_site
    FROM deals
    WHERE source_site = 'preisjaeger'
    LIMIT 5
  `);

  console.log('\nPreisjaeger商品Logo检查:\n');
  result.rows.forEach(row => {
    console.log(`商品: ${row.title_de}`);
    console.log(`  原始商家: ${row.merchant}`);
    console.log(`  规范商家: ${row.canonical_merchant_name}`);
    console.log(`  Logo: ${row.merchant_logo || '无'}`);
    console.log('');
  });

  await pool.end();
}

check();
