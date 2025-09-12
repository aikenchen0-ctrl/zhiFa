<template>
  <div class="component-preview" :class="{ fullscreen: isFullscreen }">
    <!-- 预览头部 -->
    <div class="preview-header">
      <div class="preview-title">
        <h3>{{ title }}</h3>
        <span class="preview-subtitle" v-if="subtitle">{{ subtitle }}</span>
      </div>
      
      <div class="preview-controls">
        <!-- 设备切换 -->
        <div class="device-selector">
          <button 
            v-for="device in devices" 
            :key="device.name"
            :class="{ active: currentDevice === device.name }"
            @click="currentDevice = device.name"
            class="device-button"
          >
            <component :is="device.icon" class="device-icon" />
            <span>{{ device.label }}</span>
          </button>
        </div>
        
        <!-- 主题切换 -->
        <select 
          v-model="currentTheme" 
          class="theme-selector"
          @change="updateTheme"
        >
          <option value="liquid-glass">Liquid Glass</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="ocean">Ocean</option>
          <option value="sunset">Sunset</option>
        </select>
        
        <!-- 控制按钮 -->
        <button @click="refresh" class="control-button" title="Refresh">
          🔄
        </button>
        <button @click="toggleCode" class="control-button" title="Toggle Code">
          📝
        </button>
        <button @click="toggleFullscreen" class="control-button" title="Fullscreen">
          {{ isFullscreen ? '🗗' : '🗖' }}
        </button>
      </div>
    </div>
    
    <!-- 预览区域 -->
    <div class="preview-container">
      <div 
        class="preview-viewport" 
        :class="[`device-${currentDevice}`, `theme-${currentTheme}`]"
        :style="viewportStyle"
      >
        <div class="preview-content">
          <!-- 动态渲染组件 -->
          <component 
            :is="component" 
            v-bind="componentProps"
            v-if="component"
            @error="handleComponentError"
          />
          
          <!-- 默认插槽内容 -->
          <div v-else class="preview-placeholder">
            <slot>
              <div class="placeholder-content">
                <h4>Component Preview</h4>
                <p>Component will be displayed here</p>
              </div>
            </slot>
          </div>
          
          <!-- 错误显示 -->
          <div v-if="error" class="preview-error">
            <h4>❌ Preview Error</h4>
            <pre>{{ error }}</pre>
          </div>
        </div>
        
        <!-- 设备框架 -->
        <div 
          v-if="showDeviceFrame" 
          class="device-frame"
          :class="`device-frame-${currentDevice}`"
        ></div>
      </div>
      
      <!-- 性能监控 -->
      <div v-if="showPerformance" class="performance-monitor">
        <div class="performance-metric">
          <span class="metric-label">FPS:</span>
          <span class="metric-value">{{ performanceMetrics.fps }}</span>
        </div>
        <div class="performance-metric">
          <span class="metric-label">Memory:</span>
          <span class="metric-value">{{ performanceMetrics.memory }}MB</span>
        </div>
        <div class="performance-metric">
          <span class="metric-label">Render:</span>
          <span class="metric-value">{{ performanceMetrics.renderTime }}ms</span>
        </div>
      </div>
    </div>
    
    <!-- 代码查看器 -->
    <div v-if="showCode" class="code-viewer">
      <div class="code-tabs">
        <button 
          v-for="tab in codeTabs" 
          :key="tab.name"
          :class="{ active: currentCodeTab === tab.name }"
          @click="currentCodeTab = tab.name"
          class="code-tab"
        >
          {{ tab.label }}
        </button>
      </div>
      
      <div class="code-content">
        <pre><code :class="`language-${currentCodeLanguage}`">{{ currentCode }}</code></pre>
        <button @click="copyCode" class="copy-button">
          {{ copied ? '✅' : '📋' }} {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>
    
    <!-- 属性控制面板 -->
    <div v-if="showProps && propsConfig" class="props-panel">
      <h4>Component Props</h4>
      <div class="props-controls">
        <div 
          v-for="(config, propName) in propsConfig" 
          :key="propName"
          class="prop-control"
        >
          <label :for="`prop-${propName}`" class="prop-label">
            {{ config.label || propName }}
            <span v-if="config.type" class="prop-type">({{ config.type }})</span>
          </label>
          
          <!-- 布尔值控制 -->
          <input 
            v-if="config.type === 'boolean'"
            :id="`prop-${propName}`"
            type="checkbox"
            :checked="componentProps[propName]"
            @change="updateProp(propName, $event.target.checked)"
            class="prop-input prop-checkbox"
          />
          
          <!-- 数字控制 -->
          <input 
            v-else-if="config.type === 'number'"
            :id="`prop-${propName}`"
            type="range"
            :min="config.min || 0"
            :max="config.max || 100"
            :step="config.step || 1"
            :value="componentProps[propName]"
            @input="updateProp(propName, Number($event.target.value))"
            class="prop-input prop-range"
          />
          
          <!-- 选择控制 -->
          <select 
            v-else-if="config.options"
            :id="`prop-${propName}`"
            :value="componentProps[propName]"
            @change="updateProp(propName, $event.target.value)"
            class="prop-input prop-select"
          >
            <option 
              v-for="option in config.options" 
              :key="option.value"
              :value="option.value"
            >
              {{ option.label || option.value }}
            </option>
          </select>
          
          <!-- 文本控制 -->
          <input 
            v-else
            :id="`prop-${propName}`"
            type="text"
            :value="componentProps[propName]"
            @input="updateProp(propName, $event.target.value)"
            :placeholder="config.placeholder"
            class="prop-input prop-text"
          />
          
          <!-- 当前值显示 -->
          <span class="prop-current-value">
            {{ formatPropValue(componentProps[propName]) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Device {
  name: string
  label: string
  width: number
  height: number
  icon: string
}

interface PropConfig {
  label?: string
  type: 'string' | 'number' | 'boolean' | 'select'
  options?: Array<{ value: any; label?: string }>
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

interface CodeTab {
  name: string
  label: string
  language: string
  code: string
}

interface Props {
  title: string
  subtitle?: string
  component?: any
  componentProps?: Record<string, any>
  propsConfig?: Record<string, PropConfig>
  codeExample?: string
  showCode?: boolean
  showProps?: boolean
  showPerformance?: boolean
  showDeviceFrame?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Component Preview',
  componentProps: () => ({}),
  showCode: false,
  showProps: false,
  showPerformance: false,
  showDeviceFrame: true
})

// 响应式状态
const currentDevice = ref('mobile')
const currentTheme = ref('liquid-glass')
const isFullscreen = ref(false)
const showCode = ref(props.showCode)
const error = ref<string | null>(null)
const copied = ref(false)
const currentCodeTab = ref('tsx')

// 设备配置
const devices: Device[] = [
  {
    name: 'mobile',
    label: 'Mobile',
    width: 375,
    height: 667,
    icon: '📱'
  },
  {
    name: 'tablet',
    label: 'Tablet', 
    width: 768,
    height: 1024,
    icon: '📊'
  },
  {
    name: 'desktop',
    label: 'Desktop',
    width: 1440,
    height: 900,
    icon: '🖥️'
  }
]

// 代码标签页
const codeTabs = computed<CodeTab[]>(() => {
  const tabs: CodeTab[] = [
    {
      name: 'tsx',
      label: 'Component',
      language: 'tsx',
      code: props.codeExample || generateComponentCode()
    }
  ]

  if (props.propsConfig) {
    tabs.push({
      name: 'props',
      label: 'Props',
      language: 'typescript',
      code: generatePropsCode()
    })
  }

  tabs.push({
    name: 'css',
    label: 'Styles',
    language: 'css',
    code: generateCSSCode()
  })

  return tabs
})

// 当前代码
const currentCode = computed(() => {
  const tab = codeTabs.value.find(t => t.name === currentCodeTab.value)
  return tab?.code || ''
})

// 当前代码语言
const currentCodeLanguage = computed(() => {
  const tab = codeTabs.value.find(t => t.name === currentCodeTab.value)
  return tab?.language || 'tsx'
})

// 视口样式
const viewportStyle = computed(() => {
  const device = devices.find(d => d.name === currentDevice.value)
  if (!device) return {}

  return {
    width: `${device.width}px`,
    height: `${device.height}px`,
    maxWidth: '100%',
    maxHeight: '80vh'
  }
})

// 性能监控
const performanceMetrics = ref({
  fps: 60,
  memory: 12,
  renderTime: 16
})

let performanceInterval: number | null = null

// 方法
const refresh = () => {
  error.value = null
  // 触发组件重新渲染
}

const toggleCode = () => {
  showCode.value = !showCode.value
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const updateTheme = () => {
  // 主题更新逻辑
  document.documentElement.className = `theme-${currentTheme.value}`
}

const updateProp = (propName: string, value: any) => {
  props.componentProps[propName] = value
}

const formatPropValue = (value: any): string => {
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

const handleComponentError = (err: Error) => {
  error.value = err.message
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(currentCode.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}

const generateComponentCode = (): string => {
  if (!props.component) return ''
  
  const propsString = Object.entries(props.componentProps)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}="${value}"`
      } else if (typeof value === 'boolean') {
        return value ? key : `${key}={false}`
      } else {
        return `${key}={${JSON.stringify(value)}}`
      }
    })
    .join('\n  ')

  return `<${props.component.name}${propsString ? `\n  ${propsString}` : ''}${propsString ? '\n' : ' '}/>`
}

const generatePropsCode = (): string => {
  if (!props.propsConfig) return ''
  
  const propsInterface = Object.entries(props.propsConfig)
    .map(([name, config]) => {
      const optional = props.componentProps[name] !== undefined ? '?' : ''
      return `  ${name}${optional}: ${config.type}`
    })
    .join('\n')

  return `interface ComponentProps {\n${propsInterface}\n}`
}

const generateCSSCode = (): string => {
  return `
.component-preview {
  background: var(--glass-primary);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid var(--glass-border-light);
  box-shadow: var(--glass-shadow-lg);
}

.preview-content {
  padding: 24px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
  `.trim()
}

const startPerformanceMonitoring = () => {
  if (performanceInterval) return
  
  performanceInterval = setInterval(() => {
    // 模拟性能数据
    performanceMetrics.value = {
      fps: Math.round(55 + Math.random() * 10),
      memory: Math.round(10 + Math.random() * 5),
      renderTime: Math.round(12 + Math.random() * 8)
    }
  }, 1000) as any
}

const stopPerformanceMonitoring = () => {
  if (performanceInterval) {
    clearInterval(performanceInterval)
    performanceInterval = null
  }
}

// 生命周期
onMounted(() => {
  updateTheme()
  if (props.showPerformance) {
    startPerformanceMonitoring()
  }
})

onUnmounted(() => {
  stopPerformanceMonitoring()
})

// 监听器
watch(() => props.showPerformance, (show) => {
  if (show) {
    startPerformanceMonitoring()
  } else {
    stopPerformanceMonitoring()
  }
})
</script>

<style scoped>
.component-preview {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  margin: 20px 0;
  background: var(--vp-c-bg);
  transition: all 0.3s ease;
}

.component-preview.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  border-radius: 0;
  margin: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.preview-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.preview-subtitle {
  color: var(--vp-c-text-2);
  font-size: 12px;
  margin-left: 8px;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-selector {
  display: flex;
  gap: 4px;
}

.device-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.device-button:hover {
  background: var(--vp-c-bg-soft);
}

.device-button.active {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.device-icon {
  font-size: 12px;
}

.theme-selector {
  padding: 6px 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  font-size: 12px;
}

.control-button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.control-button:hover {
  background: var(--vp-c-bg-soft);
}

.preview-container {
  position: relative;
  padding: 20px;
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-viewport {
  position: relative;
  border: 1px solid var(--vp-c-divider-light);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}

.preview-viewport.device-mobile {
  border-radius: 20px;
}

.preview-viewport.device-tablet {
  border-radius: 12px;
}

.preview-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preview-placeholder {
  text-align: center;
  color: var(--vp-c-text-2);
}

.placeholder-content h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.placeholder-content p {
  margin: 0;
  font-size: 14px;
}

.preview-error {
  text-align: center;
  color: var(--vp-c-danger);
  padding: 20px;
}

.preview-error h4 {
  margin: 0 0 8px 0;
}

.preview-error pre {
  background: rgba(255, 0, 0, 0.1);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  text-align: left;
}

.performance-monitor {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  gap: 12px;
}

.performance-metric {
  display: flex;
  gap: 4px;
}

.metric-label {
  opacity: 0.7;
}

.metric-value {
  font-weight: 600;
  color: #00ff00;
}

.code-viewer {
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-code-block-bg);
}

.code-tabs {
  display: flex;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.code-tab {
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
}

.code-tab:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.code-tab.active {
  color: var(--vp-c-brand);
  background: var(--vp-code-block-bg);
}

.code-content {
  position: relative;
  padding: 0;
}

.code-content pre {
  margin: 0;
  padding: 20px;
  background: transparent;
  font-size: 13px;
  line-height: 1.4;
  overflow-x: auto;
}

.copy-button {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-button:hover {
  background: var(--vp-c-bg-soft);
}

.props-panel {
  border-top: 1px solid var(--vp-c-divider);
  padding: 20px;
  background: var(--vp-c-bg-soft);
}

.props-panel h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
}

.props-controls {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.prop-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prop-label {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.prop-type {
  color: var(--vp-c-text-2);
  font-weight: 400;
  font-size: 11px;
}

.prop-input {
  padding: 6px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  font-size: 12px;
}

.prop-input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

.prop-current-value {
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .preview-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .preview-controls {
    flex-wrap: wrap;
  }
  
  .device-selector {
    order: -1;
  }
  
  .props-controls {
    grid-template-columns: 1fr;
  }
}
</style>