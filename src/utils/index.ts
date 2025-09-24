/**
 * 工具类库入口文件
 * Utility Library Entry Point
 */

// 数学工具
export * from './math/Vector2D'
export * from './math/MathUtils'
export * from './math/Interpolation'
export * from './math/BezierCurve'

// 几何工具
export * from './geometry/Rectangle'
export * from './geometry/Circle'
export * from './geometry/Polygon'
export * from './geometry/CollisionDetection'

// 颜色工具
export * from './color/ColorUtils'
export * from './color/ColorPalette'
export * from './color/GradientGenerator'

// 性能工具
export * from './performance/ObjectPool'
export * from './performance/Debounce'
export * from './performance/Throttle'
export * from './performance/FrameRateMonitor'

// 动画工具
export * from './animation/Easing'
export * from './animation/Tween'
export * from './animation/Timeline'
export * from './animation/SpringPhysics'

// 触摸和手势
export * from './input/TouchHandler'
export * from './input/GestureRecognizer'
export * from './input/VirtualJoystick'

// 数据结构
export * from './data/EventEmitter'
export * from './data/ObservableArray'
export * from './data/LRUCache'
export * from './data/QuadTree'

// 文本处理
export * from './text/TextMetrics'
export * from './text/TextRenderer'
export * from './text/FontManager'

// 资源管理
export * from './resources/TextureAtlas'
export * from './resources/SoundManager'
export * from './resources/PreloadManager'

// 调试工具
export * from './debug/PerformanceProfiler'
export * from './debug/MemoryTracker'
export * from './debug/DebugOverlay'

// 平台检测
export * from './platform/DeviceDetection'
export * from './platform/BrowserUtils'
export * from './platform/CapabilityDetection'

// 常用工具函数
export * from './common/Utils'
export * from './common/Validation'
export * from './common/Formatting'