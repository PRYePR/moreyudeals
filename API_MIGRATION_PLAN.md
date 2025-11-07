# API集成迁移计划

## 目标
将前端从直接连接PostgreSQL改为通过API服务器访问数据

## 总体架构变化
```
【当前】Vercel前端 → 直接读PostgreSQL
【目标】Vercel前端 → API服务器(Cloudflare Tunnel) → PostgreSQL
```

---

## 迁移步骤

### ✅ 第1轮: API客户端基础层 (已完成)
- [x] 创建分支 `feature/api-integration`
- [x] 创建 `lib/api-client/types.ts` - API类型定义
- [x] 创建 `lib/api-client/client.ts` - HTTP客户端
- [x] 创建 `lib/api-client/converters.ts` - 数据转换器
- [x] 创建 `lib/api-client/index.ts` - 统一导出
- [x] 配置 `.env.local` - 本地环境变量
- [x] 验证: TypeScript编译通过

---

### ✅ 第2轮: 迁移首页 (已完成)

#### 文件清单
- `packages/web/src/app/page.tsx` - 首页主文件

#### 改造内容
1. 移除对 `dealsService` 的直接调用
2. 改用 `apiClient.getDeals()` 获取数据
3. 使用 `convertApiDealsToDeals()` 转换数据格式
4. 保持UI组件不变

#### 改造完成
- [x] 改造 `app/api/deals/live/route.ts` - 代理到后端API
- [x] 改造 `app/page.tsx` - 使用apiClient获取分类和商家
- [x] 添加 `apiClient.getMerchants()` 方法
- [x] 创建分类映射逻辑,保持前端UI不变
- [x] **Bug修复**: 修正后端API返回`data`而不是`deals`的字段名问题
- [x] **Bug修复**: 添加`hasNext`和`hasPrev`到分页信息

#### 验证清单
- [ ] 首页能正常加载
- [ ] 优惠列表正确显示
- [ ] 图片、标题、价格等信息正确
- [ ] 控制台无错误
- [ ] 语言切换功能正常

---

### 🔄 第3轮: 迁移优惠列表页 (下一步)

#### 文件清单
- `packages/web/src/app/deals/page.tsx` - 列表页主文件

#### 改造内容
1. 改用API客户端获取数据
2. 保持筛选、排序、分页功能
3. 保持搜索功能

#### 验证清单
- [ ] 列表页正常显示
- [ ] 分页功能正常
- [ ] 筛选功能(分类、商家、价格)正常
- [ ] 排序功能正常
- [ ] 搜索功能正常

---

### 第4轮: 迁移优惠详情页

#### 文件清单
- `packages/web/src/app/deals/[id]/page.tsx` - 详情页主文件
- `packages/web/src/app/deals/[id]/DealPageClient.tsx` - 客户端组件

#### 改造内容
1. 改用 `apiClient.getDealById()` 获取详情
2. 保持详情展示、HTML内容渲染
3. 保持跳转链接功能

#### 验证清单
- [ ] 详情页正常显示
- [ ] 优惠信息完整(标题、价格、描述、图片)
- [ ] HTML内容正确渲染
- [ ] 语言切换正常
- [ ] 跳转链接正常工作

---

### 第5轮: 迁移Next.js API路由

#### 文件清单(需要改造)
- `packages/web/src/app/api/categories/route.ts` - 分类API
- `packages/web/src/app/api/stats/route.ts` - 统计API
- `packages/web/src/app/api/search/route.ts` - 搜索API

#### 改造方式
**选项A: 改为代理** (推荐)
- Next.js API路由作为代理层
- 转发请求到后端API服务器
- 好处: 前端代码改动最小

**选项B: 直接使用API客户端**
- 前端组件直接调用API服务器
- 移除Next.js API路由
- 好处: 架构更简单

#### 验证清单
- [ ] 分类筛选功能正常
- [ ] 统计数据正确显示
- [ ] 搜索功能正常

---

### 第6轮: 迁移跳转追踪路由

#### 文件清单
- `packages/web/src/app/api/go/[dealId]/route.ts` - 跳转追踪

#### 改造内容
1. 检查后端API是否有跳转追踪endpoint
2. 如果有: 改为代理到后端
3. 如果没有: 保留现有实现(需要数据库连接)

#### 验证清单
- [ ] 点击优惠能正确跳转
- [ ] 点击统计记录正常

---

### 第7轮: 清理旧代码

#### 清理清单
- [ ] 移除 `lib/db/pool.ts` - 数据库连接池
- [ ] 移除 `lib/db/deals-repository.ts` - 数据库访问层
- [ ] 移除 `lib/services/deals-service.ts` - 业务逻辑层(如果不再需要)
- [ ] 更新 `package.json` - 移除 `pg`, `ioredis` 等依赖
- [ ] 删除数据库相关环境变量
- [ ] 更新 `.gitignore` - 确保 `.env.local` 被忽略

#### 验证清单
- [ ] 编译通过(无TypeScript错误)
- [ ] 构建成功 `npm run build`
- [ ] 所有页面功能正常
- [ ] 无控制台错误
- [ ] Lint通过 `npm run lint`

---

### 第8轮: 最终测试

#### 完整功能测试
- [ ] 首页加载和显示
- [ ] 优惠列表页(分页、筛选、排序)
- [ ] 优惠详情页
- [ ] 搜索功能
- [ ] 分类筛选
- [ ] 语言切换(中文/德语)
- [ ] 优惠跳转和追踪
- [ ] 移动端响应式
- [ ] 性能检查(加载速度)

#### 生产环境准备
- [ ] 更新 `.env.production` - 配置生产API地址
- [ ] 测试生产构建 `npm run build && npm run start`
- [ ] 准备部署文档

---

## 注意事项

### 每轮完成后
1. 运行 `npm run dev` 测试
2. 浏览器访问相关页面
3. 检查控制台是否有错误
4. 确认功能正常后再继续下一轮

### 遇到问题
1. 立即停止
2. 报告具体错误信息
3. 不要继续"修补"
4. 讨论解决方案后再执行

### Git提交策略
- 每完成一轮就提交一次
- 提交信息格式: `feat: 迁移XXX使用API客户端`
- 保持每次提交都是可工作的状态

---

## 当前状态

**当前轮次**: 测试阶段
**已完成**: 第1-5轮
**待完成**: 测试、清理、生产部署

**下一步**: 重启dev server并测试所有功能
