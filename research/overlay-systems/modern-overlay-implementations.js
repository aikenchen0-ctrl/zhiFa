// 现代蒙层系统实现示例集合
// 2024年前端架构最佳实践

// ========================= 1. Floating UI + React Portal 实现 =========================
import React, { useState, useRef } from 'react'
import { 
  FloatingPortal, 
  FloatingOverlay, 
  useFloating, 
  autoUpdate,
  offset,
  flip,
  shift,
  useRole,
  useDismiss,
  useInteractions,
  FloatingFocusManager
} from '@floating-ui/react'
import { AnimatePresence, motion } from 'framer-motion'

// 高性能模态框组件
export function ModernModal({ isOpen, onClose, children, title }) {
  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: onClose,
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate
  })

  const role = useRole(context)
  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true
  })
  
  const { getFloatingProps } = useInteractions([role, dismiss])

  return (
    <AnimatePresence>
      {isOpen && (
        <FloatingPortal>
          <FloatingOverlay 
            className="modal-overlay backdrop-blur-sm bg-black/50"
            lockScroll
          >
            <FloatingFocusManager context={context}>
              <motion.div
                ref={refs.setFloating}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', duration: 0.3 }}
                className="modal-content max-w-md mx-auto mt-20 bg-white rounded-lg shadow-xl"
                style={{
                  // 使用CSS变量支持主题切换
                  '--modal-bg': 'var(--color-surface)',
                  '--modal-text': 'var(--color-on-surface)',
                  backgroundColor: 'var(--modal-bg)',
                  color: 'var(--modal-text)'
                }}
              >
                {title && (
                  <div className="modal-header px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">{title}</h2>
                  </div>
                )}
                <div className="modal-body p-6">
                  {children}
                </div>
              </motion.div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </AnimatePresence>
  )
}

// ========================= 2. Web Components + Shadow DOM 实现 =========================
class ModernOverlay extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.isVisible = false
  }

  static get observedAttributes() {
    return ['visible', 'backdrop-blur', 'z-index']
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()
    
    // 支持CSS自定义属性
    this.shadowRoot.adoptedStyleSheets = [this.createStyleSheet()]
  }

  createStyleSheet() {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(`
      :host {
        position: fixed;
        inset: 0;
        z-index: var(--overlay-z-index, 1000);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      :host([visible]) {
        pointer-events: auto;
        opacity: 1;
      }
      
      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: var(--backdrop-filter, blur(4px));
        animation: fadeIn 0.3s ease;
      }
      
      .content {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
      }
      
      .panel {
        background: var(--panel-bg, white);
        border-radius: var(--panel-radius, 8px);
        box-shadow: var(--panel-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
        max-width: var(--panel-max-width, 32rem);
        width: 100%;
        max-height: 90vh;
        overflow: auto;
        transform: scale(0.95) translateY(1rem);
        transition: transform 0.3s ease;
      }
      
      :host([visible]) .panel {
        transform: scale(1) translateY(0);
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      /* 支持暗黑模式 */
      @media (prefers-color-scheme: dark) {
        .panel {
          background: var(--panel-bg-dark, #1f2937);
          color: var(--panel-text-dark, white);
        }
      }
    `)
    return sheet
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="backdrop" part="backdrop"></div>
      <div class="content" part="content">
        <div class="panel" part="panel">
          <slot></slot>
        </div>
      </div>
    `
  }

  setupEventListeners() {
    const backdrop = this.shadowRoot.querySelector('.backdrop')
    backdrop.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('overlay-close', { bubbles: true }))
    })

    // 键盘事件处理
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.dispatchEvent(new CustomEvent('overlay-close', { bubbles: true }))
      }
    })
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'visible') {
      this.isVisible = newValue !== null
    }
  }

  // 公共API
  show() {
    this.setAttribute('visible', '')
    this.focus() // 焦点管理
  }

  hide() {
    this.removeAttribute('visible')
  }
}

customElements.define('modern-overlay', ModernOverlay)

// ========================= 3. 高性能Z-Index管理系统 =========================
class ZIndexManager {
  constructor() {
    this.layers = new Map()
    this.baseZIndex = 1000
    this.increment = 10
  }

  // 注册层级
  registerLayer(id, priority = 0) {
    const zIndex = this.baseZIndex + (priority * this.increment)
    this.layers.set(id, {
      zIndex,
      priority,
      elements: new Set()
    })
    return zIndex
  }

  // 分配z-index
  allocate(layerId, element) {
    if (!this.layers.has(layerId)) {
      this.registerLayer(layerId)
    }
    
    const layer = this.layers.get(layerId)
    const elementIndex = layer.elements.size
    const zIndex = layer.zIndex + elementIndex
    
    layer.elements.add(element)
    element.style.zIndex = zIndex
    
    return zIndex
  }

  // 释放z-index
  deallocate(layerId, element) {
    if (this.layers.has(layerId)) {
      this.layers.get(layerId).elements.delete(element)
      element.style.zIndex = ''
    }
  }

  // 获取最高层级
  getTopLayer() {
    let maxZ = this.baseZIndex
    for (const [id, layer] of this.layers) {
      const layerTop = layer.zIndex + layer.elements.size
      if (layerTop > maxZ) {
        maxZ = layerTop
      }
    }
    return maxZ + this.increment
  }
}

// 全局z-index管理器实例
export const zIndexManager = new ZIndexManager()

// 预定义常用层级
zIndexManager.registerLayer('tooltip', 1)
zIndexManager.registerLayer('dropdown', 2)
zIndexManager.registerLayer('modal', 3)
zIndexManager.registerLayer('toast', 4)
zIndexManager.registerLayer('loading', 5)

// ========================= 4. React Hook集成 =========================
import { useEffect, useCallback } from 'react'

// 蒙层管理Hook
export function useOverlay(id, layer = 'modal') {
  const elementRef = useRef()

  const show = useCallback(() => {
    if (elementRef.current) {
      zIndexManager.allocate(layer, elementRef.current)
      elementRef.current.setAttribute('data-overlay-visible', 'true')
      
      // 防止背景滚动
      document.body.style.overflow = 'hidden'
    }
  }, [layer])

  const hide = useCallback(() => {
    if (elementRef.current) {
      zIndexManager.deallocate(layer, elementRef.current)
      elementRef.current.removeAttribute('data-overlay-visible')
      
      // 恢复背景滚动
      document.body.style.overflow = ''
    }
  }, [layer])

  useEffect(() => {
    return () => {
      hide() // 组件卸载时清理
    }
  }, [hide])

  return { elementRef, show, hide }
}

// ========================= 5. Vue 3 Composition API 实现 =========================
import { ref, computed, watch, onUnmounted } from 'vue'

// Vue蒙层组合式函数
export function useModernOverlay(options = {}) {
  const isVisible = ref(false)
  const overlayRef = ref()
  const { layer = 'modal', lockScroll = true } = options

  const zIndex = computed(() => {
    return isVisible.value ? zIndexManager.getTopLayer() : 0
  })

  const show = () => {
    isVisible.value = true
    if (lockScroll) {
      document.body.style.overflow = 'hidden'
    }
  }

  const hide = () => {
    isVisible.value = false
    if (lockScroll) {
      document.body.style.overflow = ''
    }
  }

  // 键盘事件处理
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && isVisible.value) {
      hide()
    }
  }

  watch(isVisible, (newVal) => {
    if (newVal) {
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    if (lockScroll) {
      document.body.style.overflow = ''
    }
  })

  return {
    isVisible,
    overlayRef,
    zIndex,
    show,
    hide
  }
}

// ========================= 6. 性能优化工具 =========================

// 虚拟化大型列表蒙层
export class VirtualizedOverlay {
  constructor(container, options = {}) {
    this.container = container
    this.itemHeight = options.itemHeight || 50
    this.visibleCount = Math.ceil(container.clientHeight / this.itemHeight)
    this.scrollTop = 0
    this.items = []
  }

  setItems(items) {
    this.items = items
    this.render()
  }

  render() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight)
    const endIndex = Math.min(startIndex + this.visibleCount + 1, this.items.length)
    
    const visibleItems = this.items.slice(startIndex, endIndex)
    
    // 使用DocumentFragment提升性能
    const fragment = document.createDocumentFragment()
    
    visibleItems.forEach((item, index) => {
      const element = this.createItemElement(item, startIndex + index)
      fragment.appendChild(element)
    })
    
    // 批量更新DOM
    requestAnimationFrame(() => {
      this.container.innerHTML = ''
      this.container.appendChild(fragment)
    })
  }

  createItemElement(item, index) {
    const element = document.createElement('div')
    element.style.height = `${this.itemHeight}px`
    element.style.transform = `translateY(${index * this.itemHeight}px)`
    element.textContent = item.content
    return element
  }
}

// 使用示例
/*
const overlay = new ModernOverlay()
document.body.appendChild(overlay)

overlay.addEventListener('overlay-close', () => {
  overlay.hide()
})

// 显示蒙层
overlay.innerHTML = '<p>这是蒙层内容</p>'
overlay.show()
*/