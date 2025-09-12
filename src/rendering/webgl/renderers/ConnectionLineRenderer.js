/**
 * 连接线渲染器
 * 负责高性能批量渲染连接线
 */
import * as THREE from 'three';

export class ConnectionLineRenderer {
  constructor(webglRenderer, options = {}) {
    this.webglRenderer = webglRenderer;
    this.options = {
      lineWidth: 2,
      lineColor: 0x4a90e2,
      opacity: 0.8,
      maxLines: 1000,
      batchSize: 100,
      useInstancing: true,
      ...options
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera();
    
    this.lineMaterial = null;
    this.lineGeometry = null;
    this.lineMesh = null;
    
    this.instancedMesh = null;
    this.instanceMatrix = null;
    
    this.lines = new Map();
    this.dirtyLines = new Set();
    this.visibleLines = new Set();
    
    this.renderBatch = [];
    this.needsUpdate = false;
    
    this.init();
  }

  init() {
    this.setupCamera();
    this.createLineMaterial();
    this.createGeometry();
    
    if (this.options.useInstancing && this.webglRenderer.getCapabilities().supportsInstancedArrays) {
      this.setupInstancedRendering();
    } else {
      this.setupBatchRendering();
    }
  }

  setupCamera() {
    this.camera.left = 0;
    this.camera.right = window.innerWidth;
    this.camera.top = 0;
    this.camera.bottom = window.innerHeight;
    this.camera.near = -1000;
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
  }

  createLineMaterial() {
    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.options.lineColor) },
        opacity: { value: this.options.opacity },
        lineWidth: { value: this.options.lineWidth },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        dashSize: { value: 0 },
        gapSize: { value: 0 }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent: true,
      blending: THREE.NormalBlending,
      depthTest: false,
      depthWrite: false
    });
  }

  getVertexShader() {
    return `
      uniform vec2 resolution;
      uniform float lineWidth;
      
      attribute vec3 position;
      attribute vec3 previous;
      attribute vec3 next;
      attribute float side;
      attribute float width;
      attribute float counters;
      
      varying vec2 vUv;
      varying float vCounters;
      
      vec2 fix(vec4 i, float aspect) {
        vec2 res = i.xy / i.w;
        res.x *= aspect;
        return res;
      }
      
      void main() {
        float aspect = resolution.x / resolution.y;
        
        vec4 finalPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 prevPos = projectionMatrix * modelViewMatrix * vec4(previous, 1.0);
        vec4 nextPos = projectionMatrix * modelViewMatrix * vec4(next, 1.0);
        
        vec2 currentP = fix(finalPosition, aspect);
        vec2 prevP = fix(prevPos, aspect);
        vec2 nextP = fix(nextPos, aspect);
        
        float pixelWidth = finalPosition.w * lineWidth;
        pixelWidth /= resolution.y;
        
        vec2 dir;
        if (nextP == currentP) {
          dir = normalize(currentP - prevP);
        } else if (prevP == currentP) {
          dir = normalize(nextP - currentP);
        } else {
          vec2 dir1 = normalize(currentP - prevP);
          vec2 dir2 = normalize(nextP - currentP);
          dir = normalize(dir1 + dir2);
          
          vec2 perp = vec2(-dir1.y, dir1.x);
          vec2 miter = vec2(-dir.y, dir.x);
          
          dir = miter;
        }
        
        vec2 normal = vec2(-dir.y, dir.x);
        normal.x /= aspect;
        normal *= pixelWidth * side;
        
        finalPosition.xy += normal * finalPosition.w;
        
        gl_Position = finalPosition;
        
        vUv = vec2(counters, side);
        vCounters = counters;
      }
    `;
  }

  getFragmentShader() {
    return `
      uniform vec3 color;
      uniform float opacity;
      uniform float dashSize;
      uniform float gapSize;
      
      varying vec2 vUv;
      varying float vCounters;
      
      void main() {
        float alpha = opacity;
        
        if (dashSize > 0.0) {
          float dash = dashSize + gapSize;
          float d = mod(vCounters, dash);
          alpha *= step(d, dashSize);
        }
        
        // Anti-aliasing
        float dist = abs(vUv.y);
        alpha *= 1.0 - smoothstep(0.5, 1.0, dist);
        
        gl_FragColor = vec4(color, alpha);
      }
    `;
  }

  createGeometry() {
    // 创建线段几何体
    this.lineGeometry = new THREE.BufferGeometry();
    
    // 预分配缓冲区
    const maxVertices = this.options.maxLines * 6; // 每条线2个三角形，6个顶点
    
    const positions = new Float32Array(maxVertices * 3);
    const previous = new Float32Array(maxVertices * 3);
    const next = new Float32Array(maxVertices * 3);
    const sides = new Float32Array(maxVertices);
    const widths = new Float32Array(maxVertices);
    const counters = new Float32Array(maxVertices);
    
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.lineGeometry.setAttribute('previous', new THREE.BufferAttribute(previous, 3).setUsage(THREE.DynamicDrawUsage));
    this.lineGeometry.setAttribute('next', new THREE.BufferAttribute(next, 3).setUsage(THREE.DynamicDrawUsage));
    this.lineGeometry.setAttribute('side', new THREE.BufferAttribute(sides, 1).setUsage(THREE.DynamicDrawUsage));
    this.lineGeometry.setAttribute('width', new THREE.BufferAttribute(widths, 1).setUsage(THREE.DynamicDrawUsage));
    this.lineGeometry.setAttribute('counters', new THREE.BufferAttribute(counters, 1).setUsage(THREE.DynamicDrawUsage));
  }

  setupInstancedRendering() {
    // 实例化渲染设置
    this.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(this.options.maxLines * 16), 16);
    this.instancedMesh = new THREE.InstancedMesh(this.lineGeometry, this.lineMaterial, this.options.maxLines);
    this.scene.add(this.instancedMesh);
  }

  setupBatchRendering() {
    // 批量渲染设置
    this.lineMesh = new THREE.Mesh(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.lineMesh);
  }

  /**
   * 添加或更新连接线
   * @param {string} id - 连接线唯一标识
   * @param {Array} path - 路径点数组
   * @param {Object} style - 样式配置
   */
  updateLine(id, path, style = {}) {
    if (!path || path.length < 2) {
      this.removeLine(id);
      return;
    }

    const lineData = {
      id,
      path: [...path],
      style: {
        color: style.color || this.options.lineColor,
        width: style.width || this.options.lineWidth,
        opacity: style.opacity || this.options.opacity,
        dashed: style.dashed || false,
        dashSize: style.dashSize || 0,
        gapSize: style.gapSize || 0,
        ...style
      },
      bounds: this.calculatePathBounds(path),
      visible: true
    };

    this.lines.set(id, lineData);
    this.dirtyLines.add(id);
    this.needsUpdate = true;
  }

  /**
   * 移除连接线
   * @param {string} id - 连接线标识
   */
  removeLine(id) {
    if (this.lines.has(id)) {
      this.lines.delete(id);
      this.dirtyLines.add(id);
      this.visibleLines.delete(id);
      this.needsUpdate = true;
    }
  }

  /**
   * 设置连接线可见性
   * @param {string} id - 连接线标识
   * @param {boolean} visible - 是否可见
   */
  setLineVisibility(id, visible) {
    const line = this.lines.get(id);
    if (line && line.visible !== visible) {
      line.visible = visible;
      this.dirtyLines.add(id);
      this.needsUpdate = true;
      
      if (visible) {
        this.visibleLines.add(id);
      } else {
        this.visibleLines.delete(id);
      }
    }
  }

  /**
   * 批量更新连接线
   * @param {Array} updates - 更新数组，每个元素包含 {id, path, style}
   */
  batchUpdateLines(updates) {
    for (const update of updates) {
      this.updateLine(update.id, update.path, update.style);
    }
  }

  /**
   * 视窗裁剪更新
   * @param {Object} viewport - 视窗信息 {x, y, width, height}
   */
  updateViewport(viewport) {
    this.camera.left = viewport.x;
    this.camera.right = viewport.x + viewport.width;
    this.camera.top = viewport.y;
    this.camera.bottom = viewport.y + viewport.height;
    this.camera.updateProjectionMatrix();

    // 更新视窗裁剪
    this.visibleLines.clear();
    for (const [id, line] of this.lines) {
      if (this.isLineInViewport(line.bounds, viewport)) {
        this.visibleLines.add(id);
        line.visible = true;
      } else {
        line.visible = false;
      }
      this.dirtyLines.add(id);
    }
    this.needsUpdate = true;
  }

  /**
   * 检查线条是否在视窗内
   * @param {Object} bounds - 线条边界
   * @param {Object} viewport - 视窗
   * @returns {boolean} 是否相交
   */
  isLineInViewport(bounds, viewport) {
    return !(
      bounds.maxX < viewport.x ||
      bounds.minX > viewport.x + viewport.width ||
      bounds.maxY < viewport.y ||
      bounds.minY > viewport.y + viewport.height
    );
  }

  /**
   * 计算路径边界框
   * @param {Array} path - 路径点数组
   * @returns {Object} 边界框
   */
  calculatePathBounds(path) {
    if (path.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = path[0].x;
    let minY = path[0].y;
    let maxX = path[0].x;
    let maxY = path[0].y;

    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * 渲染所有连接线
   * @param {Object} viewport - 当前视窗
   */
  render(viewport) {
    if (!this.webglRenderer.isInitialized) return;

    if (this.needsUpdate || this.dirtyLines.size > 0) {
      this.updateGeometry();
      this.needsUpdate = false;
      this.dirtyLines.clear();
    }

    this.webglRenderer.render(this.scene, this.camera);
  }

  /**
   * 更新几何体数据
   */
  updateGeometry() {
    const visibleLinesArray = Array.from(this.visibleLines).map(id => this.lines.get(id)).filter(Boolean);
    
    if (visibleLinesArray.length === 0) {
      if (this.lineMesh) {
        this.lineMesh.visible = false;
      }
      if (this.instancedMesh) {
        this.instancedMesh.count = 0;
      }
      return;
    }

    const positions = this.lineGeometry.attributes.position.array;
    const previous = this.lineGeometry.attributes.previous.array;
    const next = this.lineGeometry.attributes.next.array;
    const sides = this.lineGeometry.attributes.side.array;
    const widths = this.lineGeometry.attributes.width.array;
    const counters = this.lineGeometry.attributes.counters.array;

    let vertexIndex = 0;
    
    for (const line of visibleLinesArray) {
      if (!line.visible || line.path.length < 2) continue;
      
      const vertices = this.generateLineVertices(line.path, line.style);
      
      if (vertexIndex + vertices.positions.length / 3 > positions.length / 3) {
        break; // 超出缓冲区容量
      }
      
      // 复制顶点数据到缓冲区
      positions.set(vertices.positions, vertexIndex * 3);
      previous.set(vertices.previous, vertexIndex * 3);
      next.set(vertices.next, vertexIndex * 3);
      sides.set(vertices.sides, vertexIndex);
      widths.set(vertices.widths, vertexIndex);
      counters.set(vertices.counters, vertexIndex);
      
      vertexIndex += vertices.positions.length / 3;
    }

    // 更新缓冲区
    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.previous.needsUpdate = true;
    this.lineGeometry.attributes.next.needsUpdate = true;
    this.lineGeometry.attributes.side.needsUpdate = true;
    this.lineGeometry.attributes.width.needsUpdate = true;
    this.lineGeometry.attributes.counters.needsUpdate = true;
    
    this.lineGeometry.setDrawRange(0, vertexIndex);

    if (this.lineMesh) {
      this.lineMesh.visible = vertexIndex > 0;
    }
    if (this.instancedMesh) {
      this.instancedMesh.count = Math.floor(vertexIndex / 6);
    }
  }

  /**
   * 为单条线生成顶点数据
   * @param {Array} path - 路径点
   * @param {Object} style - 样式
   * @returns {Object} 顶点数据
   */
  generateLineVertices(path, style) {
    const positions = [];
    const previous = [];
    const next = [];
    const sides = [];
    const widths = [];
    const counters = [];
    
    const lineWidth = style.width;
    let distance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const nextPoint = path[i + 1];
      const prevPoint = i > 0 ? path[i - 1] : current;
      const nextNextPoint = i < path.length - 2 ? path[i + 2] : nextPoint;
      
      const segmentLength = Math.sqrt(
        (nextPoint.x - current.x) ** 2 + (nextPoint.y - current.y) ** 2
      );

      // 为每个线段创建四个顶点（两个三角形）
      const vertices = [
        // 第一个三角形
        { pos: current, prev: prevPoint, next: nextPoint, side: -1, counter: distance },
        { pos: current, prev: prevPoint, next: nextPoint, side: 1, counter: distance },
        { pos: nextPoint, prev: current, next: nextNextPoint, side: -1, counter: distance + segmentLength },
        
        // 第二个三角形
        { pos: current, prev: prevPoint, next: nextPoint, side: 1, counter: distance },
        { pos: nextPoint, prev: current, next: nextNextPoint, side: 1, counter: distance + segmentLength },
        { pos: nextPoint, prev: current, next: nextNextPoint, side: -1, counter: distance + segmentLength }
      ];

      for (const vertex of vertices) {
        positions.push(vertex.pos.x, vertex.pos.y, 0);
        previous.push(vertex.prev.x, vertex.prev.y, 0);
        next.push(vertex.next.x, vertex.next.y, 0);
        sides.push(vertex.side);
        widths.push(lineWidth);
        counters.push(vertex.counter);
      }

      distance += segmentLength;
    }

    return { positions, previous, next, sides, widths, counters };
  }

  /**
   * 清除所有连接线
   */
  clear() {
    this.lines.clear();
    this.dirtyLines.clear();
    this.visibleLines.clear();
    this.needsUpdate = true;
  }

  /**
   * 调整渲染器大小
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  resize(width, height) {
    this.camera.right = width;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();
    
    this.lineMaterial.uniforms.resolution.value.set(width, height);
  }

  /**
   * 销毁渲染器
   */
  dispose() {
    this.clear();
    
    if (this.lineGeometry) {
      this.lineGeometry.dispose();
    }
    if (this.lineMaterial) {
      this.lineMaterial.dispose();
    }
    if (this.lineMesh) {
      this.scene.remove(this.lineMesh);
    }
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
    }
  }

  /**
   * 获取渲染统计信息
   * @returns {Object} 统计信息
   */
  getRenderStats() {
    return {
      totalLines: this.lines.size,
      visibleLines: this.visibleLines.size,
      dirtyLines: this.dirtyLines.size,
      needsUpdate: this.needsUpdate
    };
  }
}