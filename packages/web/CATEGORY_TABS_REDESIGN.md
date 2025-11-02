# 分类标签重新设计说明

## 问题描述

原有的分类标签使用横向滚动布局，存在以下问题：
1. 滚动条被隐藏，用户不知道还有更多标签
2. 移动端只能看到前面几个标签，后面的标签需要手动滑动
3. 14个标签在小屏幕上体验不佳

## 解决方案

提供了两种优化方案：

### 方案 1: 响应式网格布局（已应用）

**文件**: `src/components/filters/CategoryTabs.tsx`

**特点**:
- ✅ 所有标签一次性展示，无需滚动
- ✅ 响应式网格布局，自适应不同屏幕尺寸
- ✅ 移动端 2 列，平板 3-4 列，桌面端 5-7 列
- ✅ 添加了数量徽章，显示每个分类的优惠数量
- ✅ 图标 + 文字 + 数量，信息更丰富

**布局说明**:
```
移动端 (< 640px):    2 列
平板 SM (≥ 640px):   3 列
平板 MD (≥ 768px):   4 列
桌面 LG (≥ 1024px):  5 列
桌面 XL (≥ 1280px):  7 列
```

**代码改动**:
```tsx
// 旧版本（横向滚动）
<div className="overflow-x-auto scrollbar-hide">
  <div className="flex gap-2 pb-2">
    {/* 标签 */}
  </div>
</div>

// 新版本（网格布局）
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
  {/* 标签 */}
</div>
```

### 方案 2: 可折叠网格布局（备选）

**文件**: `src/components/filters/CategoryTabsCollapsible.tsx`

**特点**:
- ✅ 移动端默认显示前 6 个分类
- ✅ 点击"显示更多"按钮展开全部分类
- ✅ 桌面端直接显示所有分类
- ✅ 更节省移动端空间
- ✅ 提供展开/收起功能，用户体验更好

**使用方法**:

如果想使用可折叠版本，在 `src/app/page.tsx` 中替换导入：

```tsx
// 替换
import CategoryTabs from '@/components/filters/CategoryTabs'

// 为
import CategoryTabs from '@/components/filters/CategoryTabsCollapsible'
```

## 视觉效果

### 改进前
```
[标签1] [标签2] [标签3] [标签4] [标签5] → → →
```
- 只能看到前 5 个标签
- 需要手动滑动才能看到后面的标签
- 滚动条被隐藏，用户可能不知道有更多内容

### 改进后 - 方案 1
```
[标签1] [标签2]     (移动端 2 列)
[标签3] [标签4]
[标签5] [标签6]
...
```

```
[标签1] [标签2] [标签3] [标签4] [标签5]     (桌面端 5 列)
[标签6] [标签7] [标签8] [标签9] [标签10]
[标签11] [标签12] [标签13] [标签14] [全部]
```

### 改进后 - 方案 2
```
[标签1] [标签2]     (移动端默认显示 6 个)
[标签3] [标签4]
[标签5] [标签6]
[显示更多 (8 个分类) ▼]

点击后展开:
[标签1] [标签2]
[标签3] [标签4]
...
[标签13] [标签14]
[收起 (8 个分类) ▲]
```

## 新增功能

### 1. 数量徽章
每个分类标签现在显示该分类下的优惠数量：

```tsx
<span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
  {category.count}
</span>
```

### 2. 响应式间距
- 移动端: `gap-2` (8px)
- 桌面端: `gap-2` (8px)
- 标签内部: `px-3 py-2.5`

### 3. 悬停效果增强
```css
hover:border-brand-primary
hover:text-brand-primary
hover:shadow-sm
```

### 4. 文字截断
长文字自动截断，避免标签宽度不一致：
```tsx
<span className="truncate">
  {category.translatedName}
</span>
```

## 性能优化

- 移除了横向滚动容器和滚动条隐藏的 CSS
- 使用原生 CSS Grid，性能更好
- 响应式断点使用 Tailwind 标准断点，不需要额外 JS

## 测试建议

### 1. 不同屏幕尺寸测试
```bash
# 启动开发服务器
cd packages/web
npm run dev

# 在浏览器中访问
open http://localhost:3000
```

在浏览器开发工具中测试：
- 移动端: iPhone SE (375px)
- 移动端: iPhone 14 Pro (430px)
- 平板: iPad (768px)
- 桌面: 1280px
- 大屏: 1920px

### 2. 功能测试
- [ ] 所有 14 个分类标签都能看到
- [ ] 点击标签能正确筛选
- [ ] 数量徽章正确显示
- [ ] 响应式布局在不同尺寸下正常
- [ ] 悬停效果流畅
- [ ] 选中状态正确高亮

### 3. 交互测试（方案 2）
- [ ] 移动端默认显示 6 个标签
- [ ] "显示更多"按钮可点击
- [ ] 展开后显示所有标签
- [ ] "收起"按钮可点击
- [ ] 桌面端不显示展开/收起按钮

## 兼容性

- ✅ 所有现代浏览器（Chrome, Firefox, Safari, Edge）
- ✅ iOS Safari 13+
- ✅ Android Chrome 80+
- ✅ 使用 Tailwind CSS 响应式工具类
- ✅ 无需额外 polyfill

## 回滚方案

如果新设计有问题，可以回滚到旧版本：

```bash
git checkout HEAD~1 packages/web/src/components/filters/CategoryTabs.tsx
```

或手动恢复横向滚动布局（见 Git 历史）。

## 后续优化建议

1. **添加滑动动画**: 在移动端可以添加左右滑动手势支持
2. **懒加载图标**: 按需加载分类图标，减少初始加载
3. **记住展开状态**: 使用 localStorage 记住用户的展开/收起偏好
4. **分类排序**: 根据点击频率动态调整分类顺序
5. **分类搜索**: 当分类数量超过 20 个时，添加搜索功能

## 技术栈

- React 18
- Next.js 14
- Tailwind CSS 3
- lucide-react (图标库)

---

**更新日期**: 2025-11-02
**作者**: Claude Code
