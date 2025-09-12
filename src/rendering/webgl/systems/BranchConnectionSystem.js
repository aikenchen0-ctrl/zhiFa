/**
 * 分支连接线系统
 * 处理异形弹出层的分支连接线渲染
 */
import * as THREE from 'three';
import { PathCalculator } from '../core/PathCalculator.js';

export class BranchConnectionSystem {
  constructor(sceneManager, options = {}) {
    this.sceneManager = sceneManager;
    this.options = {
      branchAngle: Math.PI / 6, // 30度分支角度
      branchLength: 20,
      minBranchDistance: 30,
      maxBranches: 5,
      branchLineWidth: 1.5,
      branchOpacity: 0.6,
      animationDuration: 300,
      ...options
    };

    this.pathCalculator = new PathCalculator();
    this.branches = new Map();
    this.branchGeometry = null;
    this.branchMaterial = null;
    this.branchMesh = null;
    
    this.animations = new Map();
    this.needsUpdate = false;

    this.init();
  }

  init() {
    this.createBranchMaterial();
    this.createBranchGeometry();
    this.setupBranchMesh();
  }

  createBranchMaterial() {
    this.branchMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x6c5ce7) },
        opacity: { value: this.options.branchOpacity },
        lineWidth: { value: this.options.branchLineWidth },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        time: { value: 0 },
        animationProgress: { value: 1.0 }
      },
      vertexShader: this.getBranchVertexShader(),
      fragmentShader: this.getBranchFragmentShader(),
      transparent: true,
      blending: THREE.NormalBlending,
      depthTest: false,
      depthWrite: false
    });
  }

  getBranchVertexShader() {
    return `
      uniform vec2 resolution;
      uniform float lineWidth;
      uniform float time;
      uniform float animationProgress;
      
      attribute vec3 position;
      attribute vec3 previous;
      attribute vec3 next;
      attribute float side;
      attribute float branchIndex;
      attribute float progress;
      
      varying vec2 vUv;
      varying float vProgress;
      varying float vBranchIndex;
      varying float vAnimationProgress;
      
      vec2 fix(vec4 i, float aspect) {
        vec2 res = i.xy / i.w;
        res.x *= aspect;
        return res;
      }
      
      void main() {
        float aspect = resolution.x / resolution.y;
        
        // 动画进度计算
        float currentProgress = min(animationProgress, progress);
        
        vec4 finalPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 prevPos = projectionMatrix * modelViewMatrix * vec4(previous, 1.0);
        vec4 nextPos = projectionMatrix * modelViewMatrix * vec4(next, 1.0);
        
        vec2 currentP = fix(finalPosition, aspect);
        vec2 prevP = fix(prevPos, aspect);
        vec2 nextP = fix(nextPos, aspect);
        
        float pixelWidth = finalPosition.w * lineWidth;
        pixelWidth /= resolution.y;
        
        // 计算方向
        vec2 dir;
        if (nextP == currentP) {
          dir = normalize(currentP - prevP);
        } else if (prevP == currentP) {
          dir = normalize(nextP - currentP);
        } else {
          vec2 dir1 = normalize(currentP - prevP);
          vec2 dir2 = normalize(nextP - currentP);
          dir = normalize(dir1 + dir2);
        }
        
        vec2 normal = vec2(-dir.y, dir.x);
        normal.x /= aspect;
        normal *= pixelWidth * side;
        
        // 应用动画效果
        if (currentProgress < 1.0) {
          float fadeIn = smoothstep(0.0, 0.1, currentProgress);
          normal *= fadeIn;
        }
        
        finalPosition.xy += normal * finalPosition.w;
        
        gl_Position = finalPosition;
        
        vUv = vec2(progress, side);
        vProgress = progress;
        vBranchIndex = branchIndex;
        vAnimationProgress = currentProgress;
      }
    `;
  }

  getBranchFragmentShader() {
    return `
      uniform vec3 color;
      uniform float opacity;
      uniform float time;
      
      varying vec2 vUv;
      varying float vProgress;
      varying float vBranchIndex;
      varying float vAnimationProgress;
      
      void main() {
        float alpha = opacity;
        
        // 动画渐入效果
        alpha *= smoothstep(0.0, 0.2, vAnimationProgress);
        
        // 根据分支索引调整颜色
        vec3 branchColor = color;
        float hueShift = vBranchIndex * 0.1;
        branchColor = mix(branchColor, vec3(0.8, 0.4, 1.0), hueShift);
        
        // 端点渐变效果
        float distFromCenter = abs(vUv.y);
        alpha *= 1.0 - smoothstep(0.3, 1.0, distFromCenter);
        
        // 长度渐变
        alpha *= 1.0 - smoothstep(0.8, 1.0, vProgress);
        
        gl_FragColor = vec4(branchColor, alpha);
      }
    `;
  }

  createBranchGeometry() {
    this.branchGeometry = new THREE.BufferGeometry();
    
    const maxVertices = this.options.maxBranches * 100 * 6; // 每个分支最多100个线段
    
    const positions = new Float32Array(maxVertices * 3);
    const previous = new Float32Array(maxVertices * 3);
    const next = new Float32Array(maxVertices * 3);
    const sides = new Float32Array(maxVertices);
    const branchIndices = new Float32Array(maxVertices);
    const progress = new Float32Array(maxVertices);
    
    this.branchGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.branchGeometry.setAttribute('previous', new THREE.BufferAttribute(previous, 3).setUsage(THREE.DynamicDrawUsage));
    this.branchGeometry.setAttribute('next', new THREE.BufferAttribute(next, 3).setUsage(THREE.DynamicDrawUsage));
    this.branchGeometry.setAttribute('side', new THREE.BufferAttribute(sides, 1).setUsage(THREE.DynamicDrawUsage));
    this.branchGeometry.setAttribute('branchIndex', new THREE.BufferAttribute(branchIndices, 1).setUsage(THREE.DynamicDrawUsage));
    this.branchGeometry.setAttribute('progress', new THREE.BufferAttribute(progress, 1).setUsage(THREE.DynamicDrawUsage));
  }

  setupBranchMesh() {
    this.branchMesh = new THREE.Mesh(this.branchGeometry, this.branchMaterial);
    
    // 添加到场景管理器的连接层
    const connectionsLayer = this.sceneManager.layers.get('connections');
    if (connectionsLayer) {
      connectionsLayer.scene.add(this.branchMesh);
    }
  }

  /**
   * 创建分支连接系统
   * @param {string} id - 分支系统ID
   * @param {Object} mainConnection - 主连接线信息
   * @param {Array} popupElements - 弹出层元素数组
   * @param {Object} style - 样式配置
   */
  createBranchSystem(id, mainConnection, popupElements, style = {}) {
    if (!mainConnection || !popupElements || popupElements.length === 0) {
      console.warn(`Invalid branch system parameters for ${id}`);
      return;
    }

    const branchSystem = {
      id,
      mainConnection,
      popupElements: [...popupElements],
      style: {
        branchColor: style.branchColor || 0x6c5ce7,
        branchWidth: style.branchWidth || this.options.branchLineWidth,
        branchOpacity: style.branchOpacity || this.options.branchOpacity,
        animationDuration: style.animationDuration || this.options.animationDuration,
        ...style
      },
      branches: [],
      created: Date.now(),
      animated: false
    };

    // 计算分支点
    const branchPoint = this.calculateBranchPoint(mainConnection);
    if (!branchPoint) {
      console.warn(`Failed to calculate branch point for ${id}`);
      return;
    }

    // 为每个弹出元素创建分支
    branchSystem.branches = this.generateBranches(branchPoint, popupElements, branchSystem.style);
    
    this.branches.set(id, branchSystem);
    this.needsUpdate = true;

    // 启动动画
    if (branchSystem.style.animationDuration > 0) {
      this.animateBranchSystem(id);
    }
  }

  /**
   * 计算主连接线的分支点
   * @param {Object} mainConnection - 主连接线
   * @returns {Object|null} 分支点坐标
   */
  calculateBranchPoint(mainConnection) {
    if (!mainConnection.path || mainConnection.path.length < 2) {
      return null;
    }

    // 在主连接线的中点附近选择分支点
    const midIndex = Math.floor(mainConnection.path.length / 2);
    const midPoint = mainConnection.path[midIndex];
    
    // 找到合适的分支点（避开转角点）
    let branchPoint = midPoint;
    let bestIndex = midIndex;
    
    for (let i = Math.max(1, midIndex - 2); i <= Math.min(mainConnection.path.length - 2, midIndex + 2); i++) {
      const current = mainConnection.path[i];
      const prev = mainConnection.path[i - 1];
      const next = mainConnection.path[i + 1];
      
      // 计算角度，选择最直的部分作为分支点
      const angle1 = Math.atan2(current.y - prev.y, current.x - prev.x);
      const angle2 = Math.atan2(next.y - current.y, next.x - current.x);
      const angleDiff = Math.abs(angle2 - angle1);
      
      if (angleDiff < Math.PI / 4) { // 角度小于45度认为是直线段
        branchPoint = current;
        bestIndex = i;
        break;
      }
    }

    return {
      ...branchPoint,
      index: bestIndex,
      mainPath: mainConnection.path
    };
  }

  /**
   * 生成分支路径
   * @param {Object} branchPoint - 分支点
   * @param {Array} popupElements - 弹出元素
   * @param {Object} style - 样式
   * @returns {Array} 分支数组
   */
  generateBranches(branchPoint, popupElements, style) {
    const branches = [];
    const numElements = Math.min(popupElements.length, this.options.maxBranches);
    
    for (let i = 0; i < numElements; i++) {
      const element = popupElements[i];
      const branch = this.generateSingleBranch(branchPoint, element, i, numElements, style);
      
      if (branch) {
        branches.push(branch);
      }
    }

    return branches;
  }

  /**
   * 生成单个分支
   * @param {Object} branchPoint - 分支点
   * @param {Object} element - 目标元素
   * @param {number} index - 分支索引
   * @param {number} total - 总分支数
   * @param {Object} style - 样式
   * @returns {Object} 分支信息
   */
  generateSingleBranch(branchPoint, element, index, total, style) {
    const targetPoint = this.pathCalculator.getConnectionPoint(element, 'left');
    
    // 计算分支角度
    const baseAngle = Math.atan2(targetPoint.y - branchPoint.y, targetPoint.x - branchPoint.x);
    const angleRange = this.options.branchAngle * 2;
    const angleOffset = (index - (total - 1) / 2) * (angleRange / Math.max(1, total - 1));
    const branchAngle = baseAngle + angleOffset;
    
    // 计算分支路径
    const branchPath = this.calculateBranchPath(branchPoint, targetPoint, branchAngle, style);
    
    return {
      index,
      element,
      path: branchPath,
      angle: branchAngle,
      targetPoint,
      length: this.calculatePathLength(branchPath),
      style: {
        ...style,
        branchIndex: index
      }
    };
  }

  /**
   * 计算分支路径
   * @param {Object} start - 起点
   * @param {Object} target - 目标点
   * @param {number} angle - 分支角度
   * @param {Object} style - 样式
   * @returns {Array} 分支路径点
   */
  calculateBranchPath(start, target, angle, style) {
    const path = [start];
    
    // 添加中间控制点实现平滑过渡
    const distance = this.pathCalculator.pointDistance ? 
      this.pathCalculator.pointDistance(start, target) : 
      Math.sqrt((target.x - start.x) ** 2 + (target.y - start.y) ** 2);
    
    const numSegments = Math.max(3, Math.floor(distance / 20));
    
    for (let i = 1; i < numSegments; i++) {
      const t = i / numSegments;
      
      // 使用贝塞尔曲线计算中间点
      const controlX = start.x + Math.cos(angle) * distance * 0.3;
      const controlY = start.y + Math.sin(angle) * distance * 0.3;
      
      const x = this.cubicBezier(t, start.x, controlX, target.x, target.x);
      const y = this.cubicBezier(t, start.y, controlY, target.y, target.y);
      
      path.push({ x, y });
    }
    
    path.push(target);
    return path;
  }

  /**
   * 三次贝塞尔曲线插值
   * @param {number} t - 参数 (0-1)
   * @param {number} p0 - 起点
   * @param {number} p1 - 控制点1
   * @param {number} p2 - 控制点2
   * @param {number} p3 - 终点
   * @returns {number} 插值结果
   */
  cubicBezier(t, p0, p1, p2, p3) {
    const oneMinusT = 1 - t;
    return oneMinusT ** 3 * p0 + 
           3 * oneMinusT ** 2 * t * p1 + 
           3 * oneMinusT * t ** 2 * p2 + 
           t ** 3 * p3;
  }

  /**
   * 计算路径长度
   * @param {Array} path - 路径点数组
   * @returns {number} 路径长度
   */
  calculatePathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  /**
   * 动画分支系统
   * @param {string} id - 分支系统ID
   */
  animateBranchSystem(id) {
    const branchSystem = this.branches.get(id);
    if (!branchSystem || branchSystem.animated) return;

    const startTime = Date.now();
    const duration = branchSystem.style.animationDuration;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 更新动画进度
      this.branchMaterial.uniforms.animationProgress.value = progress;
      this.branchMaterial.uniforms.time.value = elapsed * 0.001;
      
      this.needsUpdate = true;
      
      if (progress < 1) {
        this.animations.set(id, requestAnimationFrame(animate));
      } else {
        branchSystem.animated = true;
        this.animations.delete(id);
      }
    };

    animate();
  }

  /**
   * 更新分支系统
   * @param {string} id - 分支系统ID
   * @param {Object} mainConnection - 更新的主连接
   * @param {Array} popupElements - 更新的弹出元素
   */
  updateBranchSystem(id, mainConnection, popupElements) {
    const branchSystem = this.branches.get(id);
    if (!branchSystem) return;

    // 重新计算分支
    const branchPoint = this.calculateBranchPoint(mainConnection);
    if (branchPoint) {
      branchSystem.mainConnection = mainConnection;
      branchSystem.popupElements = [...popupElements];
      branchSystem.branches = this.generateBranches(branchPoint, popupElements, branchSystem.style);
      branchSystem.animated = false;
      
      this.needsUpdate = true;
      
      // 重新启动动画
      if (branchSystem.style.animationDuration > 0) {
        this.animateBranchSystem(id);
      }
    }
  }

  /**
   * 移除分支系统
   * @param {string} id - 分支系统ID
   */
  removeBranchSystem(id) {
    if (this.branches.has(id)) {
      // 停止动画
      if (this.animations.has(id)) {
        cancelAnimationFrame(this.animations.get(id));
        this.animations.delete(id);
      }
      
      this.branches.delete(id);
      this.needsUpdate = true;
    }
  }

  /**
   * 渲染分支系统
   */
  render() {
    if (!this.needsUpdate) return;

    this.updateBranchGeometry();
    this.needsUpdate = false;
  }

  /**
   * 更新分支几何体
   */
  updateBranchGeometry() {
    const branchSystems = Array.from(this.branches.values());
    if (branchSystems.length === 0) {
      this.branchMesh.visible = false;
      return;
    }

    const positions = this.branchGeometry.attributes.position.array;
    const previous = this.branchGeometry.attributes.previous.array;
    const next = this.branchGeometry.attributes.next.array;
    const sides = this.branchGeometry.attributes.side.array;
    const branchIndices = this.branchGeometry.attributes.branchIndex.array;
    const progress = this.branchGeometry.attributes.progress.array;

    let vertexIndex = 0;

    for (const branchSystem of branchSystems) {
      for (const branch of branchSystem.branches) {
        if (branch.path.length < 2) continue;

        const vertices = this.generateBranchVertices(branch);
        
        if (vertexIndex + vertices.positions.length / 3 > positions.length / 3) {
          break; // 超出缓冲区容量
        }

        positions.set(vertices.positions, vertexIndex * 3);
        previous.set(vertices.previous, vertexIndex * 3);
        next.set(vertices.next, vertexIndex * 3);
        sides.set(vertices.sides, vertexIndex);
        branchIndices.set(vertices.branchIndices, vertexIndex);
        progress.set(vertices.progress, vertexIndex);

        vertexIndex += vertices.positions.length / 3;
      }
    }

    // 更新缓冲区
    this.branchGeometry.attributes.position.needsUpdate = true;
    this.branchGeometry.attributes.previous.needsUpdate = true;
    this.branchGeometry.attributes.next.needsUpdate = true;
    this.branchGeometry.attributes.side.needsUpdate = true;
    this.branchGeometry.attributes.branchIndex.needsUpdate = true;
    this.branchGeometry.attributes.progress.needsUpdate = true;

    this.branchGeometry.setDrawRange(0, vertexIndex);
    this.branchMesh.visible = vertexIndex > 0;
  }

  /**
   * 为单个分支生成顶点数据
   * @param {Object} branch - 分支信息
   * @returns {Object} 顶点数据
   */
  generateBranchVertices(branch) {
    const positions = [];
    const previous = [];
    const next = [];
    const sides = [];
    const branchIndices = [];
    const progress = [];

    const path = branch.path;
    let distance = 0;
    const totalLength = branch.length;

    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const nextPoint = path[i + 1];
      const prevPoint = i > 0 ? path[i - 1] : current;
      const nextNextPoint = i < path.length - 2 ? path[i + 2] : nextPoint;

      const segmentLength = Math.sqrt(
        (nextPoint.x - current.x) ** 2 + (nextPoint.y - current.y) ** 2
      );

      const progressStart = distance / totalLength;
      const progressEnd = (distance + segmentLength) / totalLength;

      // 为每个线段创建四个顶点（两个三角形）
      const vertices = [
        { pos: current, prev: prevPoint, next: nextPoint, side: -1, prog: progressStart },
        { pos: current, prev: prevPoint, next: nextPoint, side: 1, prog: progressStart },
        { pos: nextPoint, prev: current, next: nextNextPoint, side: -1, prog: progressEnd },
        
        { pos: current, prev: prevPoint, next: nextPoint, side: 1, prog: progressStart },
        { pos: nextPoint, prev: current, next: nextNextPoint, side: 1, prog: progressEnd },
        { pos: nextPoint, prev: current, next: nextNextPoint, side: -1, prog: progressEnd }
      ];

      for (const vertex of vertices) {
        positions.push(vertex.pos.x, vertex.pos.y, 0);
        previous.push(vertex.prev.x, vertex.prev.y, 0);
        next.push(vertex.next.x, vertex.next.y, 0);
        sides.push(vertex.side);
        branchIndices.push(branch.index);
        progress.push(vertex.prog);
      }

      distance += segmentLength;
    }

    return { positions, previous, next, sides, branchIndices, progress };
  }

  /**
   * 调整大小
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  resize(width, height) {
    this.branchMaterial.uniforms.resolution.value.set(width, height);
  }

  /**
   * 清除所有分支系统
   */
  clear() {
    // 停止所有动画
    for (const animationId of this.animations.keys()) {
      cancelAnimationFrame(this.animations.get(animationId));
    }
    this.animations.clear();
    
    this.branches.clear();
    this.needsUpdate = true;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let totalBranches = 0;
    for (const branchSystem of this.branches.values()) {
      totalBranches += branchSystem.branches.length;
    }

    return {
      branchSystems: this.branches.size,
      totalBranches,
      activeAnimations: this.animations.size,
      needsUpdate: this.needsUpdate
    };
  }

  /**
   * 销毁分支系统
   */
  dispose() {
    this.clear();

    if (this.branchGeometry) {
      this.branchGeometry.dispose();
    }
    if (this.branchMaterial) {
      this.branchMaterial.dispose();
    }
    if (this.branchMesh && this.branchMesh.parent) {
      this.branchMesh.parent.remove(this.branchMesh);
    }
  }
}