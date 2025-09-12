# Interactive Playground

欢迎来到Mobile IM Components的交互式演练场！在这里你可以实时体验和测试各种组件，调整参数，查看效果。

<script setup>
import { ref, reactive } from 'vue'

const activeDemo = ref('message-bubble')
const themeConfig = reactive({
  theme: 'liquid-glass',
  showAnimations: true,
  mobileView: false
})

const messageConfig = reactive({
  content: 'Hello! This is a customizable message bubble 🎉',
  position: 'right',
  showAvatar: true,
  showTimestamp: true,
  enableAnimations: true
})

const connectionConfig = reactive({
  type: 'bezier',
  animated: true,
  color: '#646cff',
  width: 2
})
</script>

## 组件演示

<div class="playground-container">
  <div class="demo-selector">
    <button 
      @click="activeDemo = 'message-bubble'"
      :class="{ active: activeDemo === 'message-bubble' }"
      class="demo-tab"
    >
      消息气泡
    </button>
    <button 
      @click="activeDemo = 'connection-line'"
      :class="{ active: activeDemo === 'connection-line' }"
      class="demo-tab"
    >
      连接线
    </button>
    <button 
      @click="activeDemo = 'gesture-handler'"
      :class="{ active: activeDemo === 'gesture-handler' }"
      class="demo-tab"
    >
      手势识别
    </button>
    <button 
      @click="activeDemo = 'theme-showcase'"
      :class="{ active: activeDemo === 'theme-showcase' }"
      class="demo-tab"
    >
      主题展示
    </button>
  </div>

  <!-- Message Bubble Demo -->
  <div v-if="activeDemo === 'message-bubble'" class="demo-content">
    <ComponentPreview
      title="MessageBubble Interactive Demo"
      subtitle="实时调整消息气泡的各种属性"
      :show-props="true"
      :show-code="true"
      :props-config="{
        content: { 
          type: 'string', 
          label: '消息内容',
          placeholder: '输入消息内容...'
        },
        position: { 
          type: 'select', 
          label: '位置',
          options: [
            { value: 'left', label: '左侧（接收）' },
            { value: 'right', label: '右侧（发送）' }
          ]
        },
        showAvatar: { 
          type: 'boolean', 
          label: '显示头像' 
        },
        showTimestamp: { 
          type: 'boolean', 
          label: '显示时间戳' 
        },
        enableAnimations: { 
          type: 'boolean', 
          label: '启用动画' 
        }
      }"
      :component-props="{
        message: {
          id: 'demo-msg-1',
          content: messageConfig.content,
          timestamp: new Date(),
          userId: 'user1',
          type: 'text'
        },
        user: {
          id: 'user1',
          name: '演示用户',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b772e234?w=100&h=100&fit=crop&crop=face'
        },
        position: messageConfig.position,
        showAvatar: messageConfig.showAvatar,
        showTimestamp: messageConfig.showTimestamp,
        enableAnimations: messageConfig.enableAnimations
      }"
      :code-example="`
<MessageBubble
  message={{
    id: 'msg-1',
    content: '${messageConfig.content}',
    timestamp: new Date(),
    userId: 'user1',
    type: 'text'
  }}
  user={{
    id: 'user1',
    name: '演示用户',
    avatar: '/avatar.jpg'
  }}
  position="${messageConfig.position}"
  showAvatar={${messageConfig.showAvatar}}
  showTimestamp={${messageConfig.showTimestamp}}
  enableAnimations={${messageConfig.enableAnimations}}
  theme="liquid-glass"
/>
      `"
    />
  </div>

  <!-- Connection Line Demo -->
  <div v-if="activeDemo === 'connection-line'" class="demo-content">
    <ComponentPreview
      title="ConnectionLine Interactive Demo"
      subtitle="体验WebGL渲染的连接线效果"
      :show-props="true"
      :show-code="true"
      :show-performance="true"
      :props-config="{
        type: {
          type: 'select',
          label: '连接线类型',
          options: [
            { value: 'straight', label: '直线' },
            { value: 'curved', label: '曲线' },
            { value: 'bezier', label: '贝塞尔曲线' }
          ]
        },
        animated: {
          type: 'boolean',
          label: '启用动画'
        },
        color: {
          type: 'string',
          label: '颜色',
          placeholder: '#646cff'
        },
        width: {
          type: 'number',
          label: '线条宽度',
          min: 1,
          max: 10,
          step: 1
        }
      }"
    />
  </div>

  <!-- Gesture Handler Demo -->
  <div v-if="activeDemo === 'gesture-handler'" class="demo-content">
    <div class="gesture-demo">
      <h3>手势识别演示</h3>
      <div class="gesture-area">
        <div class="gesture-instructions">
          <p>在下方区域尝试以下手势：</p>
          <ul>
            <li>👆 <strong>单击</strong> - 选择消息</li>
            <li>👆👆 <strong>双击</strong> - 快速回复</li>
            <li>👆⏱️ <strong>长按</strong> - 显示操作菜单</li>
            <li>👈 <strong>左滑</strong> - 回复消息</li>
            <li>👉 <strong>右滑</strong> - 转发消息</li>
            <li>🤏 <strong>捏合</strong> - 缩放内容</li>
          </ul>
        </div>
        
        <div class="interactive-message">
          <div class="message-bubble-demo">
            尝试在这里使用手势！
          </div>
        </div>
        
        <div class="gesture-feedback">
          <h4>手势检测结果：</h4>
          <div class="feedback-log">
            <div class="log-entry">等待手势输入...</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Theme Showcase -->
  <div v-if="activeDemo === 'theme-showcase'" class="demo-content">
    <div class="theme-showcase">
      <h3>主题展示</h3>
      <div class="theme-grid">
        <div class="theme-card liquid-glass">
          <div class="theme-preview">
            <div class="sample-bubble">Liquid Glass</div>
          </div>
          <h4>Liquid Glass</h4>
          <p>默认的毛玻璃主题</p>
        </div>
        
        <div class="theme-card dark">
          <div class="theme-preview">
            <div class="sample-bubble">Dark Theme</div>
          </div>
          <h4>深色主题</h4>
          <p>适合夜间使用</p>
        </div>
        
        <div class="theme-card light">
          <div class="theme-preview">
            <div class="sample-bubble">Light Theme</div>
          </div>
          <h4>浅色主题</h4>
          <p>清新明亮的界面</p>
        </div>
        
        <div class="theme-card ocean">
          <div class="theme-preview">
            <div class="sample-bubble">Ocean Breeze</div>
          </div>
          <h4>海洋微风</h4>
          <p>蓝色系主题</p>
        </div>
      </div>
    </div>
  </div>
</div>

## 性能测试

<div class="performance-section">
  <h3>实时性能监控</h3>
  <div class="performance-metrics">
    <div class="metric-card">
      <div class="metric-value">60</div>
      <div class="metric-label">FPS</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">15</div>
      <div class="metric-label">内存(MB)</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">16</div>
      <div class="metric-label">渲染时间(ms)</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">85%</div>
      <div class="metric-label">GPU利用率</div>
    </div>
  </div>
</div>

## 移动端测试

<div class="mobile-test-section">
  <h3>移动设备测试</h3>
  <p>使用下方的二维码在你的移动设备上测试组件效果：</p>
  
  <div class="qr-code-container">
    <div class="qr-code">
      📱 QR Code
    </div>
    <p>扫描二维码在移动设备上测试</p>
  </div>
  
  <div class="mobile-tips">
    <h4>移动端测试要点：</h4>
    <ul>
      <li>✅ 触摸目标大小（最小44px）</li>
      <li>✅ 手势识别准确性</li>
      <li>✅ 动画流畅度（60fps）</li>
      <li>✅ 电池消耗影响</li>
      <li>✅ 内存使用优化</li>
    </ul>
  </div>
</div>

## 代码生成器

<div class="code-generator">
  <h3>代码生成器</h3>
  <p>根据你的配置生成可用的代码片段：</p>
  
  <div class="generator-controls">
    <div class="control-group">
      <label>框架：</label>
      <select>
        <option value="react">React</option>
        <option value="vue">Vue</option>
        <option value="angular">Angular</option>
      </select>
    </div>
    
    <div class="control-group">
      <label>语言：</label>
      <select>
        <option value="typescript">TypeScript</option>
        <option value="javascript">JavaScript</option>
      </select>
    </div>
    
    <div class="control-group">
      <label>样式：</label>
      <select>
        <option value="css-modules">CSS Modules</option>
        <option value="styled-components">Styled Components</option>
        <option value="tailwind">Tailwind CSS</option>
      </select>
    </div>
  </div>
  
  <button class="generate-button">生成代码</button>
</div>

<style scoped>
.playground-container {
  margin: 20px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.demo-selector {
  display: flex;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.demo-tab {
  flex: 1;
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.demo-tab:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.demo-tab.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand);
  font-weight: 600;
}

.demo-content {
  padding: 20px;
}

.gesture-demo {
  text-align: center;
}

.gesture-area {
  margin: 20px 0;
  padding: 20px;
  border: 2px dashed var(--vp-c-divider);
  border-radius: 8px;
}

.gesture-instructions ul {
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
}

.interactive-message {
  margin: 20px 0;
}

.message-bubble-demo {
  display: inline-block;
  padding: 12px 16px;
  background: var(--vp-c-brand);
  color: white;
  border-radius: 16px;
  cursor: pointer;
  user-select: none;
}

.gesture-feedback {
  margin-top: 20px;
}

.feedback-log {
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  padding: 12px;
  min-height: 60px;
}

.theme-showcase {
  text-align: center;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.theme-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.theme-preview {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border-radius: 6px;
}

.sample-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.theme-card.liquid-glass .theme-preview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.theme-card.liquid-glass .sample-bubble {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.theme-card.dark .theme-preview {
  background: #1a1a1a;
}

.theme-card.dark .sample-bubble {
  background: #333;
  color: white;
}

.theme-card.light .theme-preview {
  background: #f5f5f5;
}

.theme-card.light .sample-bubble {
  background: white;
  color: #333;
  border: 1px solid #ddd;
}

.theme-card.ocean .theme-preview {
  background: linear-gradient(135deg, #667db6 0%, #0082c8 100%);
}

.theme-card.ocean .sample-bubble {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.performance-section {
  margin: 40px 0;
}

.performance-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.metric-card {
  text-align: center;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-brand);
  margin-bottom: 4px;
}

.metric-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.mobile-test-section {
  margin: 40px 0;
  text-align: center;
}

.qr-code-container {
  margin: 20px 0;
}

.qr-code {
  width: 150px;
  height: 150px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  background: var(--vp-c-bg-soft);
  font-size: 24px;
}

.mobile-tips {
  text-align: left;
  max-width: 400px;
  margin: 20px auto;
}

.mobile-tips ul {
  list-style: none;
  padding: 0;
}

.mobile-tips li {
  padding: 4px 0;
  font-size: 14px;
}

.code-generator {
  margin: 40px 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.generator-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
}

.control-group select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
}

.generate-button {
  background: var(--vp-c-brand);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.generate-button:hover {
  background: var(--vp-c-brand-dark);
}

@media (max-width: 768px) {
  .demo-selector {
    flex-direction: column;
  }
  
  .theme-grid {
    grid-template-columns: 1fr;
  }
  
  .performance-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .generator-controls {
    grid-template-columns: 1fr;
  }
}
</style>