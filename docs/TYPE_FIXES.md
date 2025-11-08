# TypeScript 类型修复步骤

## 目标
修复第7轮清理后遗留的TypeScript类型警告，采用方案A+C组合

## 当前错误列表
```
src/components/deals/DealCard.tsx(35,42): error TS2345: Argument of type 'Date | null | undefined' is not assignable to parameter of type 'Date | null'.
src/components/deals/DealCard.tsx(36,43): error TS2769: No overload matches this call.
src/lib/api-client/converters.ts(71,5): error TS2322: Type 'number | null' is not assignable to type 'string | undefined'.
src/lib/api-client/converters.ts(72,5): error TS2322: Type 'number | null' is not assignable to type 'string | undefined'.
src/lib/api-client/converters.ts(75,5): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

## 修复步骤

### Step 1: 创建类型转换辅助函数
**文件**: `packages/web/src/lib/api-client/converters.ts`

在文件顶部添加辅助函数：
```typescript
/**
 * 将null转换为undefined（TypeScript类型系统更喜欢undefined）
 */
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value
}

/**
 * 确保Date类型为Date | null（不包含undefined）
 */
function ensureDateOrNull(value: Date | null | undefined): Date | null {
  return value === undefined ? null : value
}

/**
 * 确保字符串不为undefined
 */
function ensureString(value: string | undefined, fallback: string = ''): string {
  return value ?? fallback
}
```

### Step 2: 统一Deal接口类型定义
**文件**: `packages/web/src/lib/api-client/types.ts`

修改Deal接口中的类型定义：
- `expiresAt: Date | null | undefined` → `expiresAt: Date | null`
- `imageUrl: string | null` → `imageUrl: string`
- `canonicalMerchantName?: string | undefined` → `canonicalMerchantName?: string`

**关键原则**：
- 日期字段使用 `Date | null`（因为date-fns库的要求）
- 必需字符串字段使用 `string`（不允许null/undefined）
- 可选字符串字段使用 `string | undefined`（使用?操作符）
- 数字字段保持 `number | null`

### Step 3: 修复converter中的类型转换
**文件**: `packages/web/src/lib/api-client/converters.ts`

在 `convertApiDealToDeal` 函数中使用辅助函数：
```typescript
// 修复前：
imageUrl: apiDeal.image_url,

// 修复后：
imageUrl: ensureString(apiDeal.image_url, ''),

// 修复前：
expiresAt: apiDeal.expires_at ? new Date(apiDeal.expires_at) : null,

// 修复后：
expiresAt: ensureDateOrNull(apiDeal.expires_at ? new Date(apiDeal.expires_at) : null),
```

### Step 4: 修复DealCard组件中的类型问题
**文件**: `packages/web/src/components/deals/DealCard.tsx`

检查formatDistance调用和其他日期相关函数调用，确保传入的类型正确。

### Step 5: 运行类型检查
```bash
npm run type-check
```

确保所有类型错误都已解决。

## 检查清单
- [ ] Step 1: 添加类型转换辅助函数
- [ ] Step 2: 统一Deal接口类型定义
- [ ] Step 3: 修复converter中的类型转换
- [ ] Step 4: 修复DealCard组件
- [ ] Step 5: 运行type-check并确认无错误
- [ ] Step 6: 测试应用运行正常

## 注意事项
1. 所有修改都要保持向后兼容
2. 不要改变运行时行为，只修复类型定义
3. 每完成一步都要确保应用仍能正常运行
4. 优先修复converter，因为它是数据转换的核心

## 预期结果
- TypeScript编译无错误
- 应用运行时行为不变
- 类型系统更加严格和安全
