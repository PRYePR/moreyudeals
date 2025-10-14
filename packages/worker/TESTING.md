# Worker 测试指南

## 概述

Worker 包含两类测试：
1. **单元测试**：不访问外部资源，快速运行（默认）
2. **集成测试**：需要数据库连接和网络访问，需显式启用

## 运行测试

### 1. 运行单元测试（默认）

```bash
# 运行所有单元测试
npm test

# 带覆盖率报告
npm test -- --coverage

# 运行特定测试文件
npm test -- sparhamster-normalizer.spec.ts
```

**预期结果**：
- 122 个测试通过
- 24 个集成测试被跳过
- 覆盖率 >90%（Lines: 91.5%, Functions: 91.1%, Branches: 82.5%）

### 2. 运行集成测试

集成测试需要：
- 有效的数据库连接
- 网络连接访问 Sparhamster API

```bash
# 设置环境变量并运行集成测试
RUN_INTEGRATION_TESTS=1 npm test

# 或者只运行特定集成测试
RUN_INTEGRATION_TESTS=1 npm test src/__tests__/integration/
RUN_INTEGRATION_TESTS=1 npm test src/__tests__/database.spec.ts
```

**环境配置**：
确保 `.env` 文件包含有效的数据库配置：
```env
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=moreyudeals_dev
DB_USER=your-username
DB_PASSWORD=your-password
```

## 测试分类

### 单元测试（默认运行）

- **`env-validator.spec.ts`** - 环境变量验证逻辑
- **`random-scheduler.spec.ts`** - 随机调度器核心逻辑（使用 fake timers）
- **`sparhamster-normalizer.spec.ts`** - 数据标准化逻辑
- **`sparhamster-fetcher.spec.ts`** - 抓取器逻辑（使用 mock DB）
- **`deduplication-service.spec.ts`** - 去重服务逻辑
- **`translation-adapter.spec.ts`** - 翻译适配器
- **`translation-service-wrapper.spec.ts`** - 翻译服务包装器

### 集成测试（需显式启用）

- **`database.spec.ts`** - 数据库 CRUD 操作（13 个测试）
  - 测试 Deal 创建、查询、更新、去重等
  - 需要真实数据库连接

- **`integration/scheduler.spec.ts`** - 调度器真实运行（5 个测试）
  - 测试随机间隔执行、stop() 功能、错误处理
  - 使用真实 timers，运行时间 ~27 秒

- **`integration/fetch-flow.spec.ts`** - 完整抓取流程（6 个测试）
  - 测试 API 抓取 → 标准化 → 去重 → 入库
  - 需要数据库连接和网络访问

## 测试覆盖范围

当前覆盖率（仅单元测试）：
```
File                             | % Stmts | % Branch | % Funcs | % Lines
---------------------------------|---------|----------|---------|----------
All files                        |   89.43 |     82.5 |   91.07 |    91.5
 config/env-validator.ts         |     100 |      100 |     100 |     100
 fetchers/sparhamster-fetcher.ts |   97.91 |    94.11 |     100 |   97.82
 normalizers/base-normalizer.ts  |    58.2 |    54.54 |   58.33 |    62.9
 normalizers/sparhamster-norm... |   90.75 |    75.34 |     100 |   93.57
 scheduler/random-scheduler.ts   |    97.5 |       80 |     100 |     100
 services/deduplication-service  |     100 |      100 |     100 |     100
 translation/translation-adapter |     100 |      100 |     100 |     100
 translation/...service-wrapper  |     100 |      100 |     100 |     100
```

## 常见问题

### Q1: 为什么集成测试默认被跳过？

**A**: 集成测试访问真实 API 和数据库，会：
- 污染生产数据
- 依赖外部服务可用性
- 运行时间较长（~1-2 分钟）
- 在 CI/CD 中可能失败

因此默认只运行快速、隔离的单元测试。

### Q2: 如何在 CI/CD 中运行集成测试？

**A**: 在 CI 环境中设置环境变量：
```yaml
# GitHub Actions 示例
- name: Run integration tests
  env:
    RUN_INTEGRATION_TESTS: 1
    DB_HOST: ${{ secrets.TEST_DB_HOST }}
    DB_PASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
  run: npm test
```

### Q3: 集成测试失败怎么办？

**A**: 检查以下内容：
1. 数据库连接配置是否正确（`.env` 文件）
2. 数据库是否在运行
3. 网络是否可访问 Sparhamster API
4. 数据库 schema 是否最新（运行迁移）

### Q4: 如何提高测试覆盖率？

**A**: 当前覆盖率已达 91.5%，主要未覆盖区域：
- `base-normalizer.ts` (62.9%) - 抽象基类，部分方法未被具体实现覆盖
- 错误处理边界情况

## 最佳实践

1. **提交前运行单元测试**：
   ```bash
   npm test -- --coverage
   ```

2. **修改数据库相关代码后运行集成测试**：
   ```bash
   RUN_INTEGRATION_TESTS=1 npm test src/__tests__/database.spec.ts
   ```

3. **修改抓取逻辑后运行完整流程测试**：
   ```bash
   RUN_INTEGRATION_TESTS=1 npm test src/__tests__/integration/fetch-flow.spec.ts
   ```

4. **使用测试数据库**：
   建议为集成测试配置独立的测试数据库，避免污染开发/生产数据。

## 调试测试

```bash
# 运行单个测试文件并显示详细输出
npm test -- sparhamster-fetcher.spec.ts --verbose

# 使用 Node 调试器
node --inspect-brk node_modules/.bin/jest --runInBand

# 查看测试覆盖详情
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```
