# 生产环境 Logo 回填指南

## 背景

我们修改了 sparhamster logo 的生成逻辑：
- **旧逻辑**: 从 merchantLink 提取域名生成 Google Favicon
- **新逻辑**: 从 merchant 名称 + merchant-mapping 配置生成 Google Favicon

已存在的数据库记录需要更新 logo 字段。

## 步骤

### 1. 部署新代码到生产环境

```bash
# 在本地
git add .
git commit -m "fix: 改进 sparhamster logo 生成逻辑，基于商家名称而非链接"
git push origin v2

# 在服务器上
cd /var/www/moreyudeals
git pull origin v2
cd packages/worker
npm run build

# 重启 worker
pm2 restart moreyudeals-worker
```

### 2. 运行回填脚本（生产数据库）

```bash
# 在服务器上
cd /var/www/moreyudeals/packages/worker

# 使用生产数据库环境变量运行回填脚本
DB_NAME=moreyudeals_prod \
DB_USER=moreyudeals_user \
DB_PASSWORD=your_password \
DB_HOST=localhost \
npx ts-node scripts/backfill-sparhamster-logos.ts
```

### 3. 验证结果

```bash
# 检查更新后的 logo 数量
psql -d moreyudeals_prod -c "
SELECT
  COUNT(*) as total,
  COUNT(merchant_logo) as with_logo,
  COUNT(CASE WHEN merchant IS NOT NULL AND merchant_logo IS NULL THEN 1 END) as missing_logo
FROM deals
WHERE source_site = 'sparhamster';
"
```

### 4. 清除 Web 缓存（如果使用了 CDN）

如果你的前端部署在 Vercel 或使用了 CDN，可能需要清除缓存：

```bash
# Vercel
vercel --prod
```

## 预期结果

- **287 条 sparhamster 记录**
- **约 277-282 条有 logo**（96-98%）
- **5 条无商家名**（活动类型，正常）
- **0-5 条未映射**（特殊商家，可以手动添加到 merchant-mapping.ts）

## 未映射的商家

如果发现有商家未映射，可以添加到 `packages/worker/src/config/merchant-mapping.ts`:

```typescript
{
  canonicalId: 'urlaubshamster',
  canonicalName: 'Urlaubshamster',
  aliases: ['urlaubshamster'],
  sites: ['sparhamster'],
  website: 'https://www.urlaubshamster.at'
},
```

## 注意事项

1. **备份数据库**: 运行脚本前建议备份生产数据库
2. **低峰期执行**: 建议在低峰期（凌晨）运行回填脚本
3. **监控影响**: 回填脚本会更新 updated_at 字段，可能影响排序
4. **幂等性**: 脚本可以安全地多次运行，已正确的记录会被跳过
