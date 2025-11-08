# Moreyudeals 废弃代码清单速查表

## 快速索引

| # | 文件路径 | 类型 | 行数 | 状态 | 删除难度 | 推荐 |
|---|---------|------|------|------|---------|------|
| 1 | `packages/web/src/lib/fetchers/sparhamster-api.ts` | @deprecated | 254 | 可删 | 低 | 立即删 |
| 2 | `packages/web/src/lib/logger/example.ts` | 示例 | 79 | 可删 | 低 | 立即删 |
| 3 | `packages/web/src/lib/translation/test.ts` | 测试 | 124 | 可删 | 低 | 立即删 |
| 4 | `packages/translation/test.ts` | 测试 | 124 | 可删 | 低 | 立即删 |
| 5 | `packages/translation/simple-test.js` | 脚本 | 50+ | 可删 | 低 | 立即删 |
| 6 | `packages/translation/real-api-test.js` | 脚本 | 60+ | 可删 | 低 | 立即删 |
| 7 | `packages/api/dist/index.js.backup` | 备份 | - | 可删 | 低 | 立即删 |
| 8-12 | `packages/web/.next/cache/webpack/*/*.old` | 缓存 | - | 可删 | 低 | 立即删 |
| 13 | `packages/web/src/lib/sparhamster-fetcher.ts` | 旧实现 | 278 | 保留 | 中 | 暂不删 |
| 14 | `packages/worker/src/fetchers/sparhamster-fetcher.ts` | 旧实现 | - | 使用中 | 高 | 暂不删 |
| 15 | `rss-parser` (npm包) | 依赖 | - | 未用 | 低 | 立即删 |

---

## 按删除难度分类

### 绿色区域 - 立即删除（无风险）

```
✓ 9个文件/包 - 总计 ~1100行代码
```

1. **备份和缓存** (5个文件)
   - `packages/api/dist/index.js.backup`
   - `packages/web/.next/cache/webpack/*/*.old` (5个.old文件)
   
2. **示例和演示** (4个文件)
   - `packages/web/src/lib/logger/example.ts` (79行)
   - `packages/web/src/lib/translation/test.ts` (124行)
   - `packages/translation/test.ts` (124行)
   - `packages/translation/simple-test.js` (50+行)
   
3. **临时脚本** (1个文件)
   - `packages/translation/real-api-test.js` (60+行)

4. **未使用的npm包**
   - `rss-parser` (在packages/web/package.json中)

5. **已弃用的实现** (1个文件)
   - `packages/web/src/lib/fetchers/sparhamster-api.ts` (254行)

---

### 黄色区域 - 待条件删除（中等风险）

```
✓ 2个文件 - 可在Worker迁移完成后删除
```

1. **RSS Fetcher实现**
   - `packages/worker/src/fetchers/sparhamster-fetcher.ts`
   - 当前仍被使用：
     - `packages/worker/src/index.ts`
     - `packages/worker/src/__tests__/**/sparhamster-fetcher.spec.ts` 
     - `packages/worker/scripts/test-e2e.ts`
   - 条件：完全迁移到新API后删除

2. **Web端RSS Fetcher**
   - `packages/web/src/lib/sparhamster-fetcher.ts` (278行)
   - 现状：已未使用
   - 条件：确认无引用后可删

---

### 红色区域 - 需要重构（高优先级）

```
2个TODO项 - 需要实现而非删除
```

| 文件 | TODO | 优先级 | 工作量 |
|------|------|--------|--------|
| `packages/web/src/lib/cache/redis-cache.ts` | 实现真正的Redis客户端 | 高 | 中等 |
| `packages/web/src/lib/tracking/storage/index.ts` | 实现PostgreSQL存储 | 高 | 中等 |

---

## 删除命令速查

### 一键删除（复制粘贴）

```bash
# 1. 删除单个备份文件
rm /Users/prye/Documents/Moreyudeals/packages/api/dist/index.js.backup

# 2. 清理所有.next缓存
rm -rf /Users/prye/Documents/Moreyudeals/packages/web/.next/cache/

# 3. 删除示例和测试文件
rm /Users/prye/Documents/Moreyudeals/packages/web/src/lib/logger/example.ts
rm /Users/prye/Documents/Moreyudeals/packages/web/src/lib/translation/test.ts
rm /Users/prye/Documents/Moreyudeals/packages/translation/test.ts
rm /Users/prye/Documents/Moreyudeals/packages/translation/simple-test.js
rm /Users/prye/Documents/Moreyudeals/packages/translation/real-api-test.js

# 4. 删除@deprecated fetcher
rm /Users/prye/Documents/Moreyudeals/packages/web/src/lib/fetchers/sparhamster-api.ts

# 5. 卸载npm包
cd /Users/prye/Documents/Moreyudeals/packages/web
npm uninstall rss-parser
```

---

## 依赖关系图

```
工作流程依赖关系：

rss-parser (npm)
    └── packages/web/src/lib/sparhamster-fetcher.ts (Web端)
        └── [已不使用，可删除]

packages/worker/src/fetchers/sparhamster-fetcher.ts (Worker端)
    ├── packages/worker/src/index.ts [主程序导入 - 使用中]
    ├── packages/worker/src/__tests__/sparhamster-fetcher.spec.ts [单元测试]
    ├── packages/worker/src/__tests__/integration/fetch-flow.spec.ts [集成测试]
    └── packages/worker/scripts/test-e2e.ts [E2E脚本]

packages/web/src/lib/fetchers/sparhamster-api.ts (@deprecated)
    ├── 被新的API取代
    ├── 未被任何代码导入
    └── 仅在REFACTORING_SUMMARY.md中作为参考

packages/worker/src/services/amazon-link-resolver.ts
    └── 包含@deprecated方法 isLikelyAmazonLink()
        └── 应该用 isAmazonMerchant() 替代
```

---

## 代码统计

### 可删除代码量

```
示例/测试/脚本:  ~360行 (5个文件)
已弃用Fetcher:   254行 (1个文件)
待删RSS Fetcher: 278行 (2个文件，可选)
─────────────────────────────
小计:           ~900行 (必删)
              ~1200行 (可选)
```

### 文件数统计

```
必须删除:  9项 (备份、缓存、示例、脚本、npm包)
可选删除:  2项 (仅在Worker迁移后)
需要重构:  2项 (TODO项)
─────────────────────────────
总计:     13项
```

---

## 清理检查清单

删除前请验证：

- [ ] 已备份或提交当前代码到git
- [ ] 已验证`@deprecated`文件未被任何代码导入
- [ ] 已检查示例和测试文件未在package.json的scripts中引用
- [ ] 已确认npm包未被任何代码import
- [ ] 已运行`npm run build`验证删除后仍能编译
- [ ] 已运行`npm test`验证测试仍通过
- [ ] 已提交git commit（推荐）

---

## 删除时间线建议

### Phase 1: 立即（今天）
- 删除备份和缓存文件
- 删除示例文件
- 删除测试脚本
- 卸载rss-parser

**预计时间**: 5分钟
**风险**: 无

### Phase 2: 本周内
- 删除@deprecated fetcher

**预计时间**: 10分钟
**风险**: 低

### Phase 3: 确认Worker迁移后（1-2周）
- 删除Worker端RSS Fetcher
- 删除Web端sparhamster-fetcher

**预计时间**: 20分钟
**风险**: 中

### Phase 4: 长期优化
- 实现Redis缓存
- 实现PostgreSQL存储
- 减少console.log调用

**预计时间**: 每项1-2天
**风险**: 低

---

## 成功指标

删除完成后应验证：

```bash
# 1. 代码能编译
npm run build

# 2. 测试通过
npm test

# 3. 无导入错误
grep -r "legacy-cache\|sparhamster-api\|rss-parser" packages/*/src

# 4. 文件数减少
find packages -type f | wc -l

# 5. 代码行数减少
find packages -name "*.ts" -o -name "*.tsx" | xargs wc -l
```

