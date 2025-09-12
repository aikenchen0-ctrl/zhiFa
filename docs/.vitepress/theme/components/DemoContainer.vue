<template>
  <div class="demo-container">
    <div class="demo-preview" v-if="showPreview">
      <slot name="preview">
        <div class="demo-placeholder">
          Component preview will be shown here
        </div>
      </slot>
    </div>
    
    <div class="demo-description" v-if="description">
      <p>{{ description }}</p>
    </div>
    
    <div class="demo-controls">
      <button 
        @click="togglePreview" 
        class="demo-toggle"
        :class="{ active: showPreview }"
      >
        {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
      </button>
      
      <button 
        @click="toggleCode" 
        class="demo-toggle"
        :class="{ active: showCode }"
      >
        {{ showCode ? 'Hide Code' : 'Show Code' }}
      </button>
      
      <button 
        @click="copyCode" 
        class="demo-copy"
        title="Copy code"
      >
        📋
      </button>
    </div>
    
    <div class="demo-code" v-if="showCode">
      <slot name="code">
        <pre><code>// Code example will be shown here</code></pre>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  description?: string
  defaultShowPreview?: boolean
  defaultShowCode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  defaultShowPreview: true,
  defaultShowCode: false
})

const showPreview = ref(props.defaultShowPreview)
const showCode = ref(props.defaultShowCode)

const togglePreview = () => {
  showPreview.value = !showPreview.value
}

const toggleCode = () => {
  showCode.value = !showCode.value
}

const copyCode = async () => {
  try {
    const codeElement = document.querySelector('.demo-code code')
    if (codeElement) {
      await navigator.clipboard.writeText(codeElement.textContent || '')
      // Show success feedback
      console.log('Code copied to clipboard')
    }
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}
</script>

<style scoped>
.demo-container {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 24px 0;
  background: var(--vp-c-bg);
}

.demo-preview {
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-placeholder {
  color: var(--vp-c-text-2);
  font-style: italic;
  text-align: center;
}

.demo-description {
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}

.demo-description p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.demo-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.demo-toggle {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-toggle:hover {
  background: var(--vp-c-bg-soft);
}

.demo-toggle.active {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.demo-copy {
  padding: 6px 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.demo-copy:hover {
  background: var(--vp-c-bg-soft);
}

.demo-code {
  background: var(--vp-code-block-bg);
  overflow-x: auto;
}

.demo-code pre {
  margin: 0;
  padding: 16px;
}

.demo-code code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .demo-preview {
    padding: 16px;
  }
  
  .demo-controls {
    padding: 8px 12px;
    flex-wrap: wrap;
  }
  
  .demo-toggle,
  .demo-copy {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>