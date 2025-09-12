# 气泡组件设计规范

**版本**: 2.0  
**最后更新**: 2025-01-15  
**标准参考文件**: `bubble-demo.html`

## ⚠️ 重要说明

**所有气泡组件的实现都必须严格遵循此设计规范，确保视觉和交互的一致性。**

当其他 AI 或开发者需要实现气泡相关功能时，**必须以 `bubble-demo.html` 为标准参考**，而不是重新设计或猜测样式。

## 🚨 关键原则

1. **完全复制bubble-demo.html**: 所有CSS样式、HTML结构、类名必须完全一致
2. **使用Tailwind CDN**: `<script src="https://cdn.tailwindcss.com"></script>`
3. **玻璃材质系统**: 必须使用 `.glass-effect`, `.glass-self`, `.glass-other` 类
4. **发送者名字定位**: 中心线与气泡上边缘对齐，使用 `top: 0` + `transform: translateY(-50%)`
5. **操作菜单**: 2行4列纯文字按钮，无图标

---

## 🎨 基础设计系统

### 必需的CSS类定义（完全基于bubble-demo.html）

#### 页面基础样式
```css
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}
```

#### 玻璃材质系统
```css
/* 玻璃模糊效果 - 基础类 */
.glass-effect {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

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

/* 备选深色版本 */
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

**🎯 重要的定位原理**: 发送者名字的**中心线**与气泡的**上边缘**对齐，不是整个名字都在气泡上方。这通过以下关键CSS实现：
- `top: 0` - 定位到容器顶部（气泡上边缘）
- `transform: translateY(-50%)` - 向上移动自身高度的一半，使名字中心与边缘对齐

**CSS 实现**:
```css
.sender-name {
  position: absolute;
  left: 12px;               /* left-3 = 12px */
  top: 0;                   /* 定位到气泡上边缘 */
  transform: translateY(-50%); /* 关键：向上移动一半高度，实现中心对齐 */
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

**视觉效果**: 发送者名字"跨越"气泡上边缘，一半在上方，一半与边缘重叠，形成自然的视觉层次。

**禁止的样式**:
```css
/* ❌ 禁止添加以下样式 */
background: rgba(0, 0, 0, 0.2);    /* 不要背景 */
padding: 2px 4px;                  /* 不要内边距 */
border-radius: 4px;                /* 不要圆角 */
```

---

## 🎛️ 操作菜单规范

**⚠️ 重要**: 操作菜单通过JavaScript动态创建，**仅文字无图标**

### 完整CSS样式（基于bubble-demo.html）
```css
/* 操作菜单容器 */
.action-menu {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  border-radius: 12px;
  padding: 8px;
  display: none;
  z-index: 50;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  min-width: 280px;
}

.action-menu.show {
  display: block;
}

/* 2行4列网格布局 */
.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

/* 操作按钮 - 仅文字，无图标 */
.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  color: #374151;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.8);
}

/* 菜单箭头 */
.menu-arrow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(255, 255, 255, 0.95);
}
```

### 8个操作按钮（顺序固定，仅文字无图标）
1. 话外音
2. 复制  
3. 转发
4. 收藏
5. 多选
6. 引用
7. 放大  
8. 删除（红色文字）

### JavaScript实现（基于bubble-demo.html）
```javascript
function toggleMenu(element) {
  // 隐藏其他菜单
  document.querySelectorAll('.action-menu').forEach(menu => {
    if (menu.parentNode !== element) {
      menu.remove();
    }
  });
  
  // 切换当前菜单
  const existingMenu = element.querySelector('.action-menu');
  if (existingMenu) {
    existingMenu.remove();
    return;
  }
  
  // 创建新菜单
  const menu = document.createElement('div');
  menu.className = 'action-menu show';
  menu.innerHTML = '...'; // 8个按钮的HTML
  
  element.style.position = 'relative';
  element.appendChild(menu);
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

#### 有头像详细气泡结构
```html
<div class="flex items-start gap-3 max-w-full">
  <!-- 头像 -->
  <div class="flex-shrink-0">
    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500">
      <span class="text-white text-sm sender-name-shadow">张</span>
    </div>
  </div>
  
  <!-- 消息内容 -->
  <div class="flex flex-col">
    <!-- 气泡和发送者名字容器 - 关键的定位参照容器 -->
    <div class="relative">
      <!-- 发送者名字 - 相对于此容器定位 -->
      <span class="absolute left-3 top-0 transform -translate-y-1/2 z-30 text-xs leading-none text-white sender-name-shadow" style="backdrop-filter: blur(24px);">
        张三
      </span>
      
      <!-- 主气泡 -->
      <div class="relative glass-other glass-effect rounded-xl...">
        <div class="relative z-10 px-2 py-1.5">
          <div class="text-white text-shadow-enhanced">消息内容</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 无头像详细气泡结构
```html
<div class="flex items-start gap-2 max-w-full">
  <!-- 消息内容 -->
  <div class="flex flex-col">
    <!-- 气泡和发送者名字容器 - 关键的定位参照容器 -->
    <div class="relative">
      <!-- 发送者名字 - 相对于此容器定位 -->
      <span class="absolute left-3 top-0 transform -translate-y-1/2 z-30 text-xs leading-none text-white sender-name-shadow" style="backdrop-filter: blur(24px);">
        李四
      </span>
      
      <!-- 主气泡 -->
      <div class="relative glass-other glass-effect rounded-xl...">
        <div class="relative z-10 px-2 py-1.5">
          <div class="text-white text-shadow-enhanced">消息内容</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 自己发送的详细气泡结构（注意：无发送者名字）
```html
<div class="flex items-start gap-2 max-w-full flex-row-reverse ml-auto justify-start">
  <!-- 消息内容 -->
  <div class="flex flex-col items-end">
    <!-- 气泡容器（注意：自己发送的不需要发送者名字） -->
    <div class="relative">
      <!-- 主气泡 -->
      <div class="relative glass-self glass-effect rounded-xl...">
        <div class="relative z-10 px-2 py-1.5">
          <div class="text-white text-shadow-enhanced">消息内容</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## ✅ 验收标准

实现的气泡组件必须满足以下标准才算合格:

1. ✅ **完全一致性**: 与 `bubble-demo.html` 在视觉和结构上100%一致
2. ✅ **CSS样式**: 所有 `.glass-effect`, `.glass-self`, `.glass-other` 类完全复制
3. ✅ **HTML结构**: 容器层次、Tailwind classes、内联样式完全一致
4. ✅ **发送者名字**: 中心线与气泡上边缘对齐，仅文本阴影无背景
5. ✅ **操作菜单**: 
   - 2行4列纯文字按钮，无图标
   - JavaScript动态创建
   - 正确的定位和箭头
6. ✅ **玻璃材质**: 
   - `.glass-effect` 背景模糊
   - `.glass-other` 透明背景，灰色边框
   - `.glass-self` 白色半透明背景
7. ✅ **简单气泡**: 正确的 `after:` 伪元素小尾巴
8. ✅ **交互效果**: `hover:scale-[1.01]` 和点击菜单切换
9. ✅ **Tailwind CDN**: 使用 `https://cdn.tailwindcss.com`
10. ✅ **代码完整性**: 无JavaScript错误，所有功能正常

---

## 🔄 更新历史

- **v1.0** (2024-09-13): 基于 `bubble-demo.html` 创建初始设计规范
- **v2.0** (2025-01-15): 
  - 🔧 重新分析并完全重写设计规范，确保与bubble-demo.html 100%一致
  - 🎨 添加完整的CSS类定义和JavaScript实现
  - 📝 详细说明发送者名字定位原理（中心对齐上边缘）
  - 🎛️ 完善操作菜单规范（2行4列纯文字无图标）
  - ✅ 更新验收标准，增加10项具体检查项
  - 🚨 添加关键原则，强调完全复制bubble-demo.html的重要性

---

**⚠️ 重要提醒**: 任何对此规范的修改都必须先更新 `bubble-demo.html`，然后更新此文档。保持 `bubble-demo.html` 作为视觉标准的权威性。

**🎯 实施建议**: 在实现气泡组件时，建议直接复制 `bubble-demo.html` 的相关部分，而不是从零开始编写，这样可以确保100%的一致性。