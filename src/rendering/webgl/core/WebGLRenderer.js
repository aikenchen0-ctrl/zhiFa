/**
 * WebGL核心渲染器
 * 负责WebGL上下文管理和基础渲染功能
 */
import * as THREE from 'three';

export class WebGLRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      ...options
    };

    this.renderer = null;
    this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.isInitialized = false;
    this.capabilities = {};
    
    this.init();
  }

  init() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        ...this.options
      });

      this.renderer.setPixelRatio(this.devicePixelRatio);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.sortObjects = false;
      this.renderer.autoClear = false;

      // Enable extensions for better performance
      const gl = this.renderer.getContext();
      this.capabilities = {
        maxTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
        maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
        maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
        supportsInstancedArrays: !!gl.getExtension('ANGLE_instanced_arrays'),
        supportsVAO: !!gl.getExtension('OES_vertex_array_object')
      };

      this.isInitialized = true;
      console.log('WebGL Renderer initialized with capabilities:', this.capabilities);
    } catch (error) {
      console.error('Failed to initialize WebGL renderer:', error);
      throw new Error('WebGL not supported or initialization failed');
    }
  }

  setSize(width, height) {
    if (!this.renderer) return;
    
    this.renderer.setSize(width, height, false);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  clear() {
    if (!this.renderer) return;
    this.renderer.clear();
  }

  render(scene, camera) {
    if (!this.renderer || !this.isInitialized) return;
    this.renderer.render(scene, camera);
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
      this.isInitialized = false;
    }
  }

  getRenderer() {
    return this.renderer;
  }

  getCapabilities() {
    return this.capabilities;
  }
}