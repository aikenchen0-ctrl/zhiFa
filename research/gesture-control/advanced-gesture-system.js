// 先进手势控制系统实现
// 基于2024年最新Web API和性能优化技术

// ========================= 1. 现代手势管理器核心类 =========================
class AdvancedGestureManager {
  constructor(element, options = {}) {
    this.element = element
    this.options = {
      threshold: 10,
      velocity: 0.3,
      enableInertia: true,
      enableBounds: false,
      bounds: { left: 0, top: 0, right: 0, bottom: 0 },
      ...options
    }
    
    this.state = {
      isActive: false,
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      timestamp: 0
    }
    
    this.recognizers = new Map()
    this.animationId = null
    
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.registerDefaultRecognizers()
  }

  setupEventListeners() {
    // 使用passive listeners提升性能
    const passiveOptions = { passive: true }
    const activeOptions = { passive: false }

    // 触摸事件
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), activeOptions)
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), passiveOptions)
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), passiveOptions)
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), passiveOptions)

    // 鼠标事件 (桌面端兼容)
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this), activeOptions)
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this), passiveOptions)
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this), passiveOptions)

    // Pointer Events (现代浏览器)
    if (window.PointerEvent) {
      this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this), activeOptions)
      this.element.addEventListener('pointermove', this.handlePointerMove.bind(this), passiveOptions)
      this.element.addEventListener('pointerup', this.handlePointerUp.bind(this), passiveOptions)
    }

    // 防止默认的触摸行为
    this.element.style.touchAction = 'none'
  }

  // ========================= 2. 手势识别器系统 =========================
  registerDefaultRecognizers() {
    this.addRecognizer('tap', new TapRecognizer())
    this.addRecognizer('pan', new PanRecognizer())
    this.addRecognizer('pinch', new PinchRecognizer())
    this.addRecognizer('rotate', new RotateRecognizer())
    this.addRecognizer('swipe', new SwipeRecognizer())
    this.addRecognizer('longPress', new LongPressRecognizer())
  }

  addRecognizer(name, recognizer) {
    recognizer.setManager(this)
    this.recognizers.set(name, recognizer)
  }

  // ========================= 3. 事件处理核心逻辑 =========================
  handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    this.startGesture(touch.clientX, touch.clientY, e.timeStamp)
    
    // 多点触控支持
    if (e.touches.length > 1) {
      this.handleMultiTouch(e)
    }
  }

  handleTouchMove(e) {
    const touch = e.touches[0]
    this.updateGesture(touch.clientX, touch.clientY, e.timeStamp)
    
    if (e.touches.length > 1) {
      this.handleMultiTouch(e)
    }
  }

  handleTouchEnd(e) {
    this.endGesture(e.timeStamp)
  }

  handleMouseDown(e) {
    e.preventDefault()
    this.startGesture(e.clientX, e.clientY, e.timeStamp)
  }

  handleMouseMove(e) {
    if (this.state.isActive) {
      this.updateGesture(e.clientX, e.clientY, e.timeStamp)
    }
  }

  handleMouseUp(e) {
    this.endGesture(e.timeStamp)
  }

  // Pointer Events处理 (最现代的方法)
  handlePointerDown(e) {
    e.preventDefault()
    this.element.setPointerCapture(e.pointerId)
    this.startGesture(e.clientX, e.clientY, e.timeStamp)
  }

  handlePointerMove(e) {
    if (this.state.isActive) {
      this.updateGesture(e.clientX, e.clientY, e.timeStamp)
    }
  }

  handlePointerUp(e) {
    this.element.releasePointerCapture(e.pointerId)
    this.endGesture(e.timeStamp)
  }

  // ========================= 4. 手势状态管理 =========================
  startGesture(x, y, timestamp) {
    this.state.isActive = true
    this.state.startPoint = { x, y }
    this.state.currentPoint = { x, y }
    this.state.timestamp = timestamp
    
    // 通知所有手势识别器
    this.recognizers.forEach(recognizer => {
      recognizer.onStart(this.state)
    })

    this.emit('gesturestart', this.state)
  }

  updateGesture(x, y, timestamp) {
    if (!this.state.isActive) return

    const deltaTime = timestamp - this.state.timestamp
    const deltaX = x - this.state.currentPoint.x
    const deltaY = y - this.state.currentPoint.y

    // 计算速度
    this.state.velocity = {
      x: deltaX / deltaTime,
      y: deltaY / deltaTime
    }

    this.state.currentPoint = { x, y }
    this.state.timestamp = timestamp

    // 使用RAF优化更新频率
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    this.animationId = requestAnimationFrame(() => {
      this.recognizers.forEach(recognizer => {
        recognizer.onMove(this.state)
      })
      
      this.emit('gesturemove', this.state)
      this.animationId = null
    })
  }

  endGesture(timestamp) {
    if (!this.state.isActive) return

    this.state.isActive = false
    this.state.timestamp = timestamp

    // 实现惯性滚动
    if (this.options.enableInertia) {
      this.applyInertia()
    }

    this.recognizers.forEach(recognizer => {
      recognizer.onEnd(this.state)
    })

    this.emit('gestureend', this.state)
  }

  // ========================= 5. 惯性滚动实现 =========================
  applyInertia() {
    const { velocity } = this.state
    const friction = 0.95
    const threshold = 0.01

    const animate = () => {
      velocity.x *= friction
      velocity.y *= friction

      if (Math.abs(velocity.x) < threshold && Math.abs(velocity.y) < threshold) {
        return // 停止动画
      }

      // 应用惯性移动
      this.state.currentPoint.x += velocity.x
      this.state.currentPoint.y += velocity.y

      // 边界检查
      if (this.options.enableBounds) {
        this.applyBounds()
      }

      this.emit('inertia', {
        ...this.state,
        velocity: { ...velocity }
      })

      requestAnimationFrame(animate)
    }

    animate()
  }

  applyBounds() {
    const { bounds } = this.options
    const { currentPoint } = this.state

    if (currentPoint.x < bounds.left) {
      currentPoint.x = bounds.left
      this.state.velocity.x = 0
    }
    if (currentPoint.x > bounds.right) {
      currentPoint.x = bounds.right
      this.state.velocity.x = 0
    }
    if (currentPoint.y < bounds.top) {
      currentPoint.y = bounds.top
      this.state.velocity.y = 0
    }
    if (currentPoint.y > bounds.bottom) {
      currentPoint.y = bounds.bottom
      this.state.velocity.y = 0
    }
  }

  // ========================= 6. 多点触控支持 =========================
  handleMultiTouch(e) {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      // 计算缩放
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )

      if (this.initialDistance) {
        this.state.scale = distance / this.initialDistance
      } else {
        this.initialDistance = distance
      }

      // 计算旋转
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * (180 / Math.PI)

      if (this.initialAngle !== undefined) {
        this.state.rotation = angle - this.initialAngle
      } else {
        this.initialAngle = angle
      }

      this.emit('multitouch', {
        scale: this.state.scale,
        rotation: this.state.rotation,
        center: {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        }
      })
    }
  }

  // ========================= 7. 事件发射器 =========================
  emit(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true
    })
    this.element.dispatchEvent(event)
  }
}

// ========================= 8. 具体手势识别器实现 =========================

// 点击识别器
class TapRecognizer {
  constructor() {
    this.threshold = 10
    this.maxDuration = 300
  }

  setManager(manager) {
    this.manager = manager
  }

  onStart(state) {
    this.startTime = state.timestamp
    this.startPoint = { ...state.startPoint }
  }

  onMove(state) {
    // 移动距离过大则取消点击
    const distance = this.getDistance(state.startPoint, state.currentPoint)
    if (distance > this.threshold) {
      this.canceled = true
    }
  }

  onEnd(state) {
    if (this.canceled) {
      this.canceled = false
      return
    }

    const duration = state.timestamp - this.startTime
    const distance = this.getDistance(this.startPoint, state.currentPoint)

    if (duration < this.maxDuration && distance < this.threshold) {
      this.manager.emit('tap', {
        point: state.currentPoint,
        duration
      })
    }
  }

  getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }
}

// 拖拽识别器
class PanRecognizer {
  constructor() {
    this.threshold = 10
  }

  setManager(manager) {
    this.manager = manager
  }

  onStart(state) {
    this.started = false
  }

  onMove(state) {
    const distance = Math.sqrt(
      Math.pow(state.currentPoint.x - state.startPoint.x, 2) +
      Math.pow(state.currentPoint.y - state.startPoint.y, 2)
    )

    if (!this.started && distance > this.threshold) {
      this.started = true
      this.manager.emit('panstart', state)
    }

    if (this.started) {
      this.manager.emit('panmove', {
        ...state,
        delta: {
          x: state.currentPoint.x - state.startPoint.x,
          y: state.currentPoint.y - state.startPoint.y
        }
      })
    }
  }

  onEnd(state) {
    if (this.started) {
      this.manager.emit('panend', state)
      this.started = false
    }
  }
}

// 滑动识别器
class SwipeRecognizer {
  constructor() {
    this.threshold = 30
    this.velocityThreshold = 0.3
  }

  setManager(manager) {
    this.manager = manager
  }

  onStart(state) {
    // 滑动在结束时判断
  }

  onMove(state) {
    // 实时更新不处理
  }

  onEnd(state) {
    const distance = Math.sqrt(
      Math.pow(state.currentPoint.x - state.startPoint.x, 2) +
      Math.pow(state.currentPoint.y - state.startPoint.y, 2)
    )

    const velocity = Math.sqrt(
      Math.pow(state.velocity.x, 2) +
      Math.pow(state.velocity.y, 2)
    )

    if (distance > this.threshold && velocity > this.velocityThreshold) {
      const direction = this.getDirection(state.startPoint, state.currentPoint)
      
      this.manager.emit('swipe', {
        direction,
        distance,
        velocity,
        angle: this.getAngle(state.startPoint, state.currentPoint)
      })
    }
  }

  getDirection(start, end) {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }

  getAngle(start, end) {
    return Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI)
  }
}

// 长按识别器
class LongPressRecognizer {
  constructor() {
    this.duration = 500
    this.threshold = 10
  }

  setManager(manager) {
    this.manager = manager
  }

  onStart(state) {
    this.timer = setTimeout(() => {
      // 检查是否仍在原位置
      const distance = Math.sqrt(
        Math.pow(state.currentPoint.x - state.startPoint.x, 2) +
        Math.pow(state.currentPoint.y - state.startPoint.y, 2)
      )

      if (distance < this.threshold) {
        this.manager.emit('longpress', {
          point: state.startPoint,
          duration: this.duration
        })
      }
    }, this.duration)
  }

  onMove(state) {
    // 移动过多则取消长按
    const distance = Math.sqrt(
      Math.pow(state.currentPoint.x - state.startPoint.x, 2) +
      Math.pow(state.currentPoint.y - state.startPoint.y, 2)
    )

    if (distance > this.threshold) {
      this.cancel()
    }
  }

  onEnd(state) {
    this.cancel()
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

// 缩放识别器
class PinchRecognizer {
  setManager(manager) {
    this.manager = manager
  }

  onStart(state) {
    this.initialScale = 1
  }

  onMove(state) {
    if (state.scale && state.scale !== 1) {
      this.manager.emit('pinch', {
        scale: state.scale,
        delta: state.scale - this.initialScale
      })
    }
  }

  onEnd(state) {
    // 缩放结束
  }
}

// 旋转识别器
class RotateRecognizer {
  setManager(manager) {
    this.manager = manager
  }

  onStart(state) {
    this.initialRotation = 0
  }

  onMove(state) {
    if (state.rotation !== undefined) {
      this.manager.emit('rotate', {
        rotation: state.rotation,
        delta: state.rotation - this.initialRotation
      })
    }
  }

  onEnd(state) {
    // 旋转结束
  }
}

// ========================= 9. 高级手势组合系统 =========================
class GestureComposer {
  constructor(element) {
    this.element = element
    this.activeGestures = new Set()
    this.gestureQueue = []
    this.conflictResolver = new GestureConflictResolver()
  }

  // 注册手势序列
  registerSequence(name, gestures, options = {}) {
    const sequence = new GestureSequence(name, gestures, options)
    sequence.attach(this.element)
    
    return sequence
  }

  // 注册同时手势
  registerSimultaneous(name, gestures, options = {}) {
    const simultaneous = new SimultaneousGesture(name, gestures, options)
    simultaneous.attach(this.element)
    
    return simultaneous
  }
}

// 手势冲突解决器
class GestureConflictResolver {
  constructor() {
    this.priorities = new Map()
  }

  setPriority(gestureType, priority) {
    this.priorities.set(gestureType, priority)
  }

  resolve(gestures) {
    return gestures.sort((a, b) => {
      const priorityA = this.priorities.get(a.type) || 0
      const priorityB = this.priorities.get(b.type) || 0
      return priorityB - priorityA
    })[0]
  }
}

// ========================= 10. 与React Spring集成的高性能手势Hook =========================
import { useSpring, animated } from '@react-spring/web'
import { useDrag, useWheel, usePinch } from '@use-gesture/react'

export function useAdvancedGesture(options = {}) {
  const [{ x, y, scale, rotateZ }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
    rotateZ: 0,
    config: { 
      tension: 300, 
      friction: 30 
    }
  }))

  // 拖拽手势
  const bindDrag = useDrag(
    ({ 
      offset: [ox, oy], 
      velocity: [vx, vy], 
      active, 
      movement: [mx, my],
      direction: [dx, dy],
      distance,
      tap
    }) => {
      if (tap && options.onTap) {
        options.onTap({ x: ox, y: oy })
        return
      }

      api.start({
        x: ox,
        y: oy,
        immediate: active,
        config: active 
          ? { tension: 800, friction: 50 }
          : { tension: 300, friction: 30, velocity: [vx * 0.1, vy * 0.1] }
      })

      if (options.onDrag) {
        options.onDrag({ 
          offset: [ox, oy], 
          movement: [mx, my],
          velocity: [vx, vy],
          active,
          distance
        })
      }
    },
    {
      from: () => [x.get(), y.get()],
      bounds: options.bounds,
      rubberband: true,
      ...options.dragOptions
    }
  )

  // 缩放手势
  const bindPinch = usePinch(
    ({ 
      offset: [s, a], 
      active,
      velocity: [vs, va],
      movement: [ms, ma]
    }) => {
      api.start({
        scale: s,
        rotateZ: a,
        immediate: active,
        config: active 
          ? { tension: 800, friction: 50 }
          : { tension: 300, friction: 30 }
      })

      if (options.onPinch) {
        options.onPinch({
          scale: s,
          rotation: a,
          velocity: [vs, va],
          movement: [ms, ma],
          active
        })
      }
    },
    {
      from: () => [scale.get(), rotateZ.get()],
      scaleBounds: options.scaleBounds || { min: 0.5, max: 3 },
      angleThreshold: options.angleThreshold || 0.2,
      ...options.pinchOptions
    }
  )

  // 滚轮手势
  const bindWheel = useWheel(
    ({ offset: [, sy], velocity: [, vy], active }) => {
      const newScale = Math.max(0.5, Math.min(3, scale.get() - sy / 100))
      
      api.start({
        scale: newScale,
        immediate: active,
        config: { tension: 300, friction: 30 }
      })

      if (options.onWheel) {
        options.onWheel({ scale: newScale, velocity: vy, active })
      }
    },
    {
      preventDefault: true
    }
  )

  return {
    x,
    y, 
    scale,
    rotateZ,
    bind: {
      ...bindDrag(),
      ...bindPinch(),
      ...bindWheel()
    },
    api
  }
}

// ========================= 11. 使用示例 =========================

// 基础使用
/*
const element = document.getElementById('gesture-target')
const gestureManager = new AdvancedGestureManager(element, {
  enableInertia: true,
  enableBounds: true,
  bounds: { left: 0, top: 0, right: 300, bottom: 300 }
})

// 监听手势事件
element.addEventListener('tap', (e) => {
  console.log('点击:', e.detail)
})

element.addEventListener('swipe', (e) => {
  console.log('滑动:', e.detail.direction)
})

element.addEventListener('panmove', (e) => {
  const { delta } = e.detail
  element.style.transform = `translate(${delta.x}px, ${delta.y}px)`
})
*/

// React组件使用示例
/*
function GestureDemo() {
  const { x, y, scale, rotateZ, bind } = useAdvancedGesture({
    onTap: (point) => console.log('Tapped at:', point),
    onDrag: ({ offset, active }) => {
      if (active) {
        console.log('Dragging to:', offset)
      }
    },
    bounds: { left: -200, right: 200, top: -200, bottom: 200 },
    scaleBounds: { min: 0.5, max: 2 }
  })

  return (
    <animated.div
      {...bind}
      style={{
        x,
        y,
        scale,
        rotateZ,
        width: 100,
        height: 100,
        backgroundColor: 'blue',
        borderRadius: 8,
        touchAction: 'none'
      }}
    />
  )
}
*/

export { 
  AdvancedGestureManager, 
  GestureComposer,
  TapRecognizer,
  PanRecognizer,
  SwipeRecognizer,
  PinchRecognizer,
  RotateRecognizer,
  LongPressRecognizer
}