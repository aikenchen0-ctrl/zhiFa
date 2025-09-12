/**
 * WebGL渲染器 - 适用于大量连接线（>500条）
 * 优势：GPU加速、批量处理、高性能
 */
class WebGLRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.mode = 'webgl';
    this.options = {
      strokeWidth: 2,
      strokeColor: [0.2, 0.2, 0.2, 1.0], // RGBA
      antialias: true,
      preserveDrawingBuffer: false,
      ...options
    };

    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.connections = new Map();
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.maxConnections = 10000;
    
    // 着色器源码
    this.vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_width;
      
      uniform vec2 u_resolution;
      uniform mat3 u_matrix;
      
      varying vec4 v_color;
      varying float v_width;
      
      void main() {
        vec2 position = (u_matrix * vec3(a_position, 1)).xy;
        vec2 zeroToOne = position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_color = a_color;
        v_width = a_width;
      }
    `;

    this.fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      varying float v_width;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;

    this.init();
  }

  init() {
    this.createCanvas();
    this.initWebGL();
    this.createShaderProgram();
    this.setupBuffers();
    this.bindEvents();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1';
    
    this.container.appendChild(this.canvas);
    this.resize();
  }

  initWebGL() {
    const options = {
      antialias: this.options.antialias,
      preserveDrawingBuffer: this.options.preserveDrawingBuffer,
      alpha: true,
      premultipliedAlpha: false
    };

    this.gl = this.canvas.getContext('webgl', options) || 
               this.canvas.getContext('experimental-webgl', options);

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    // 启用混合
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    
    // 设置视口
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  createShaderProgram() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);
    
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error('Program linking failed: ' + this.gl.getProgramInfoLog(this.program));
    }

    this.gl.useProgram(this.program);

    // 获取属性和uniform位置
    this.attributes = {
      position: this.gl.getAttribLocation(this.program, 'a_position'),
      color: this.gl.getAttribLocation(this.program, 'a_color'),
      width: this.gl.getAttribLocation(this.program, 'a_width')
    };

    this.uniforms = {
      resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
      matrix: this.gl.getUniformLocation(this.program, 'u_matrix')
    };

    // 设置分辨率
    this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    
    // 设置变换矩阵（单位矩阵）
    const matrix = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ];
    this.gl.uniformMatrix3fv(this.uniforms.matrix, false, matrix);
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('Shader compilation failed: ' + this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  setupBuffers() {
    // 顶点缓冲区
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    
    // 为最大连接数量预分配空间
    const maxVertices = this.maxConnections * 4; // 每条线2个端点，每个端点可能需要2个顶点
    const vertexData = new Float32Array(maxVertices * 7); // position(2) + color(4) + width(1)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexData, this.gl.DYNAMIC_DRAW);

    // 索引缓冲区
    this.indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    const maxIndices = this.maxConnections * 6; // 每条线2个三角形
    const indexData = new Uint16Array(maxIndices);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indexData, this.gl.DYNAMIC_DRAW);
  }

  bindEvents() {
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * 批量渲染连接线
   */
  batchRender(connections) {
    performance.mark('webgl-render-start');
    
    // 更新连接线数据
    this.updateConnections(connections);
    
    // 生成顶点数据
    const { vertices, indices } = this.generateGeometry(connections);
    
    // 更新缓冲区
    this.updateBuffers(vertices, indices);
    
    // 渲染
    this.render(indices.length);

    performance.mark('webgl-render-end');
    performance.measure('render-webgl', 'webgl-render-start', 'webgl-render-end');
  }

  updateConnections(connections) {
    const newConnections = new Map();
    
    connections.forEach(connection => {
      newConnections.set(connection.id, { ...connection });
    });

    this.connections = newConnections;
  }

  generateGeometry(connections) {
    const vertices = [];
    const indices = [];
    let vertexIndex = 0;

    connections.forEach(connection => {
      const { start, end } = connection;
      const color = this.parseColor(connection.color || this.options.strokeColor);
      const width = connection.strokeWidth || this.options.strokeWidth;
      
      // 计算线段方向和法线
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) return;
      
      const nx = -dy / length * width * 0.5;
      const ny = dx / length * width * 0.5;

      // 生成4个顶点形成矩形
      vertices.push(
        // 顶点1
        start.x + nx, start.y + ny, ...color, width,
        // 顶点2
        start.x - nx, start.y - ny, ...color, width,
        // 顶点3
        end.x + nx, end.y + ny, ...color, width,
        // 顶点4
        end.x - nx, end.y - ny, ...color, width
      );

      // 生成2个三角形的索引
      const base = vertexIndex;
      indices.push(
        base, base + 1, base + 2,
        base + 1, base + 2, base + 3
      );
      
      vertexIndex += 4;
    });

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices)
    };
  }

  parseColor(color) {
    if (Array.isArray(color)) {
      return color;
    }
    
    if (typeof color === 'string') {
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;
        return [r, g, b, 1.0];
      }
    }
    
    return this.options.strokeColor;
  }

  updateBuffers(vertices, indices) {
    // 更新顶点缓冲区
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertices);

    // 更新索引缓冲区
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 0, indices);
  }

  render(indexCount) {
    // 清除画布
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // 设置属性
    const stride = 7 * 4; // 7个float，每个4字节
    
    this.gl.enableVertexAttribArray(this.attributes.position);
    this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, stride, 0);
    
    this.gl.enableVertexAttribArray(this.attributes.color);
    this.gl.vertexAttribPointer(this.attributes.color, 4, this.gl.FLOAT, false, stride, 2 * 4);
    
    this.gl.enableVertexAttribArray(this.attributes.width);
    this.gl.vertexAttribPointer(this.attributes.width, 1, this.gl.FLOAT, false, stride, 6 * 4);

    // 绘制
    this.gl.drawElements(this.gl.TRIANGLES, indexCount, this.gl.UNSIGNED_SHORT, 0);
  }

  /**
   * 高亮连接线
   */
  highlightConnection(connectionId, highlight = true) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.highlighted = highlight;
      if (highlight) {
        connection.color = [0.0, 0.47, 1.0, 1.0]; // 蓝色高亮
        connection.strokeWidth = (connection.strokeWidth || this.options.strokeWidth) + 2;
      } else {
        delete connection.color;
        delete connection.strokeWidth;
      }
      
      // 需要重新渲染
      this.batchRender(Array.from(this.connections.values()));
    }
  }

  /**
   * 清除所有连接线
   */
  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.connections.clear();
  }

  /**
   * 调整画布大小
   */
  resize() {
    const rect = this.container.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * pixelRatio;
    this.canvas.height = rect.height * pixelRatio;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
  }

  /**
   * 设置变换矩阵（用于缩放、平移等）
   */
  setTransform(matrix) {
    this.gl.uniformMatrix3fv(this.uniforms.matrix, false, matrix);
  }

  /**
   * 检查WebGL错误
   */
  checkError() {
    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      console.error('WebGL Error:', error);
    }
  }

  /**
   * 导出为图片
   */
  exportAsImage(format = 'png', quality = 1.0) {
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * 获取WebGL信息
   */
  getWebGLInfo() {
    return {
      version: this.gl.getParameter(this.gl.VERSION),
      renderer: this.gl.getParameter(this.gl.RENDERER),
      vendor: this.gl.getParameter(this.gl.VENDOR),
      shadingLanguageVersion: this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
      maxViewportDims: this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS)
    };
  }

  /**
   * 获取渲染统计信息
   */
  getStats() {
    return {
      mode: this.mode,
      connectionCount: this.connections.size,
      maxConnections: this.maxConnections,
      canvasSize: {
        width: this.canvas.width,
        height: this.canvas.height
      },
      webglInfo: this.getWebGLInfo()
    };
  }

  destroy() {
    this.clear();
    
    // 清理WebGL资源
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
    
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
    }
    
    if (this.indexBuffer) {
      this.gl.deleteBuffer(this.indexBuffer);
    }
    
    window.removeEventListener('resize', this.resizeHandler);
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.connections.clear();
  }
}

export default WebGLRenderer;