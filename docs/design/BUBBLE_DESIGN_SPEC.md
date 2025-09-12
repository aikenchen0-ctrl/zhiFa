# 气泡组件设计规范

**版本**: 1.0  
**最后更新**: 2024-09-13  
**标准参考文件**: `bubble-demo.html`

## ⚠️ 重要说明

**所有气泡组件的实现都必须严格遵循此设计规范，确保视觉和交互的一致性。**

当其他 AI 或开发者需要实现气泡相关功能时，**必须以 `bubble-demo.html` 为标准参考**，而不是重新设计或猜测样式。

---

## 🎨 基础设计系统

### 色彩和背景
- **页面背景**: `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **玻璃模糊效果**: `backdrop-filter: blur(20px)` + `-webkit-backdrop-filter: blur(20px)`

### 玻璃材质系统
```css
/* 自己发送的气泡 */
.glass-self {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 别人发送的气泡 */
.glass-other {
  background: transparent;
  border: 1px solid rgba(156, 163, 175, 0.4);
}

/* 更深的自己气泡（备选） */
.glass-self-dark {
  background: rgba(255, 255, 255, 0.08);
}
```

### 文本阴影系统
```css
/* 消息内容文本阴影 */
.text-shadow-enhanced {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6), 
               0 0 6px rgba(0, 0, 0, 0.4), 
               0 0 10px rgba(0, 0, 0, 0.25), 
               0 1px 1px rgba(0, 0, 0, 0.5);
}

/* 发送者名字阴影 */
.sender-name-shadow {
  text-shadow: 0 2px 6px rgba(0, 0, 0, 1), 
               0 0 16px rgba(255, 255, 255, 0.9), 
               0 0 8px rgba(0, 0, 0, 0.8);
}
```

---

## 💬 气泡组件类型

### 1. 有头像详细气泡 (DetailedBubble with Avatar)

**特点**: 圆角正方形头像 + 左上角发送者名字 + 强背景模糊效果 + 增强文本阴影

**头像规范**:
- 尺寸: `40x40px` (w-10 h-10)
- 圆角: `rounded-xl` (12px border-radius)
- 背景: `bg-gradient-to-br from-blue-400 to-purple-500`
- 位置: 左侧固定，与气泡对齐

**气泡规范**:
- 圆角: `rounded-xl` (12px border-radius)
- 内边距: `px-2 py-1.5`
- 最大宽度: `max-w-full w-fit`
- Hover效果: `hover:scale-[1.01] transition-transform duration-200`

### 2. 无头像详细气泡 (SimpleDetailedBubble)

**特点**: 仅左上角发送者名字 + 强背景模糊效果 + 增强文本阴影

**差异**: 移除头像部分，其他规范与有头像详细气泡一致

### 3. 简单气泡 (SimpleBubble)

**特点**: 圆角边框 + 小尾巴 + 增强文本阴影

**尾巴实现**:
```css
/* 左尾巴（别人发送） */
after:absolute after:bottom-0 after:-left-1 after:w-0 after:h-0 
after:border-r-8 after:border-r-transparent 
after:border-t-8 after:border-t-transparent 
after:border-b-8 after:border-b-transparent

/* 右尾巴（自己发送） */
after:absolute after:bottom-0 after:-right-1 after:w-0 after:h-0 
after:border-l-8 after:border-l-white/25 
after:border-t-8 after:border-t-transparent 
after:border-b-8 after:border-b-transparent
```

**内边距**: `px-2 py-1` (比详细气泡稍小)

---

## 📝 发送者名字规范

**⚠️ 关键要点**: 发送者名字**只能有文本阴影，不能有背景矩形**

**CSS 实现**:
```css
.sender-name {
  position: absolute;
  left: 12px;               /* left-3 = 12px */
  top: 0;
  transform: translateY(-50%);
  z-index: 30;
  font-size: 0.75rem;       /* text-xs */
  line-height: 1;           /* leading-none */
  color: white;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 1), 
               0 0 16px rgba(255, 255, 255, 0.9), 
               0 0 8px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(24px);
}
```

**禁止的样式**:
```css
/* ❌ 禁止添加以下样式 */
background: rgba(0, 0, 0, 0.2);    /* 不要背景 */
padding: 2px 4px;                  /* 不要内边距 */
border-radius: 4px;                /* 不要圆角 */
```

---

## 🎛️ 操作菜单规范

**布局**: 2行4列 (`grid-cols-4 grid-rows-2`)

**样式**:
```css
.action-menu {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
```

**8个操作按钮** (顺序固定):
1. 💬 话外音 (aside)
2. 📋 复制 (copy)  
3. 📤 转发 (forward)
4. ⭐ 收藏 (collect)
5. ✅ 多选 (multi-select)
6. 💬 引用 (quote)
7. 🔍 放大 (enlarge)  
8. 🗑️ 删除 (delete)

**按钮样式**:
```css
.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  font-size: 0.75rem;
  border-radius: 8px;
  transition: background-color 150ms ease;
  color: #374151;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.8);
}
```

---

## 📐 尺寸和间距

### 圆角统一规范
- **所有气泡**: `12px` (rounded-xl)
- **头像**: `12px` (rounded-xl，与气泡一致)
- **操作菜单**: `12px` 
- **操作按钮**: `8px`

### 内边距规范
- **详细气泡**: `px-2 py-1.5` (8px 6px)
- **简单气泡**: `px-2 py-1` (8px 4px)
- **操作菜单**: `8px` 整体边距，按钮内部 `8px 4px`

### 字体规范
- **消息内容**: 默认字体大小，白色，增强阴影
- **发送者名字**: `text-xs` (12px)，白色，特殊阴影
- **操作按钮**: `text-xs` (12px)，灰色

---

## 🚀 交互规范

### Hover 效果
- **气泡**: `hover:scale-[1.01]` + `transition-transform duration-200`
- **操作按钮**: 背景色变化 + `transition-all duration-150`

### 点击交互
1. 点击气泡显示操作菜单
2. 再次点击气泡或点击其他地方关闭菜单
3. 点击操作按钮执行相应动作并关闭菜单

---

## 📱 响应式规范

### 最大宽度
- **所有气泡**: `max-w-full w-fit`
- **操作菜单**: `min-w-[280px]`

### 对齐规则
- **别人发送**: 左对齐 (`margin-right: auto`)
- **自己发送**: 右对齐 (`margin-left: auto`)
- **发送者名字**: 始终相对气泡左上角定位

---

## 🛠️ 技术实现要求

### CSS Framework
- 优先使用 **Tailwind CSS** classes
- 自定义 CSS 仅用于特殊效果（玻璃材质、文本阴影等）

### TypeScript 接口
```typescript
export interface BubbleProps {
  message: Message;
  style?: 'detailed' | 'simple';
  showAvatar?: boolean;
  onActionClick?: (action: ActionType, message: Message) => void;
  isMultiSelectMode?: boolean;
  className?: string;
}
```

### 组件结构
```
BubbleContainer
├── Avatar (可选)
├── BubbleContent
│   ├── SenderName (详细气泡)
│   ├── MessageText
│   └── ActionMenu (点击显示)
└── Tail (简单气泡)
```

---

## ✅ 验收标准

实现的气泡组件必须满足以下标准才算合格:

1. ✅ **视觉一致性**: 与 `bubble-demo.html` 视觉效果完全一致
2. ✅ **发送者名字**: 只有文本阴影，无背景矩形
3. ✅ **圆角统一**: 所有圆角都是 12px
4. ✅ **玻璃材质**: 正确的透明度和模糊效果
5. ✅ **操作菜单**: 2行4列布局，8个按钮顺序正确
6. ✅ **交互流畅**: hover 和点击效果自然
7. ✅ **响应式**: 移动端和桌面端都正常显示

---

## 🔄 更新历史

- **v1.0** (2024-09-13): 基于 `bubble-demo.html` 创建初始设计规范

---

**⚠️ 重要提醒**: 任何对此规范的修改都必须先更新 `bubble-demo.html`，然后更新此文档。保持 `bubble-demo.html` 作为视觉标准的权威性。