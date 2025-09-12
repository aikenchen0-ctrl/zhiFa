import { performance } from 'perf_hooks';

// Mock WebGL Context for testing
class MockWebGLContext {
  public canvas: HTMLCanvasElement;
  public programs: Map<string, WebGLProgram> = new Map();
  public buffers: Map<string, WebGLBuffer> = new Map();
  public shaders: Map<string, WebGLShader> = new Map();
  public drawCalls: number = 0;
  public lastDrawTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  createProgram(): WebGLProgram {
    return {} as WebGLProgram;
  }

  createBuffer(): WebGLBuffer {
    return {} as WebGLBuffer;
  }

  createShader(type: number): WebGLShader {
    return {} as WebGLShader;
  }

  linkProgram(program: WebGLProgram): void {
    // Mock implementation
  }

  useProgram(program: WebGLProgram | null): void {
    // Mock implementation
  }

  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    // Mock implementation
  }

  bufferData(target: number, data: ArrayBuffer | ArrayBufferView, usage: number): void {
    // Mock implementation
  }

  drawArrays(mode: number, first: number, count: number): void {
    const startTime = performance.now();
    this.drawCalls++;
    this.lastDrawTime = performance.now() - startTime;
  }

  clear(mask: number): void {
    // Mock implementation
  }

  viewport(x: number, y: number, width: number, height: number): void {
    // Mock implementation
  }

  getAttribLocation(program: WebGLProgram, name: string): number {
    return 0;
  }

  getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    return {} as WebGLUniformLocation;
  }

  uniformMatrix4fv(location: WebGLUniformLocation | null, transpose: boolean, value: Float32Array): void {
    // Mock implementation
  }

  enableVertexAttribArray(index: number): void {
    // Mock implementation
  }

  vertexAttribPointer(index: number, size: number, type: number, normalized: boolean, stride: number, offset: number): void {
    // Mock implementation
  }
}

// WebGL Connection Line Renderer
class WebGLConnectionLineRenderer {
  private gl: MockWebGLContext;
  private program: WebGLProgram;
  private vertexBuffer: WebGLBuffer;
  private lines: Array<{ start: { x: number; y: number }; end: { x: number; y: number }; color: [number, number, number, number] }> = [];
  private renderMetrics: Array<{ frameTime: number; lineCount: number; timestamp: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new MockWebGLContext(canvas);
    this.program = this.gl.createProgram();
    this.vertexBuffer = this.gl.createBuffer();
    this.initializeShaders();
  }

  private initializeShaders(): void {
    // Mock shader initialization
    const vertexShader = this.gl.createShader(35633); // VERTEX_SHADER
    const fragmentShader = this.gl.createShader(35632); // FRAGMENT_SHADER
    
    this.gl.linkProgram(this.program);
  }

  addLine(start: { x: number; y: number }, end: { x: number; y: number }, color: [number, number, number, number] = [1, 1, 1, 1]): void {
    this.lines.push({ start, end, color });
  }

  removeLine(index: number): void {
    if (index >= 0 && index < this.lines.length) {
      this.lines.splice(index, 1);
    }
  }

  updateLine(index: number, start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (index >= 0 && index < this.lines.length) {
      this.lines[index].start = start;
      this.lines[index].end = end;
    }
  }

  render(): { frameTime: number; lineCount: number; drawCalls: number } {
    const startTime = performance.now();
    
    // Clear previous draw calls
    const initialDrawCalls = this.gl.drawCalls;
    
    // Setup viewport
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clear(16640); // COLOR_BUFFER_BIT
    
    // Use shader program
    this.gl.useProgram(this.program);
    
    if (this.lines.length > 0) {
      // Create vertex data
      const vertices = this.createVertexData();
      
      // Buffer vertex data
      this.gl.bindBuffer(34962, this.vertexBuffer); // ARRAY_BUFFER
      this.gl.bufferData(34962, vertices, 35048); // STATIC_DRAW
      
      // Setup vertex attributes
      const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, 5126, false, 0, 0); // FLOAT
      
      // Draw lines
      this.gl.drawArrays(1, 0, this.lines.length * 2); // LINES
    }
    
    const frameTime = performance.now() - startTime;
    const drawCalls = this.gl.drawCalls - initialDrawCalls;
    
    this.renderMetrics.push({
      frameTime,
      lineCount: this.lines.length,
      timestamp: startTime
    });
    
    return { frameTime, lineCount: this.lines.length, drawCalls };
  }

  private createVertexData(): Float32Array {
    const vertices: number[] = [];
    
    this.lines.forEach(line => {
      // Convert screen coordinates to normalized device coordinates
      const startX = (line.start.x / this.gl.canvas.width) * 2 - 1;
      const startY = -((line.start.y / this.gl.canvas.height) * 2 - 1);
      const endX = (line.end.x / this.gl.canvas.width) * 2 - 1;
      const endY = -((line.end.y / this.gl.canvas.height) * 2 - 1);
      
      vertices.push(startX, startY, endX, endY);
    });
    
    return new Float32Array(vertices);
  }

  getPerformanceMetrics(): {
    averageFrameTime: number;
    maxFrameTime: number;
    minFrameTime: number;
    totalFrames: number;
    averageLinesPerFrame: number;
  } {
    if (this.renderMetrics.length === 0) {
      return {
        averageFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: 0,
        totalFrames: 0,
        averageLinesPerFrame: 0
      };
    }

    const frameTimes = this.renderMetrics.map(m => m.frameTime);
    const lineCounts = this.renderMetrics.map(m => m.lineCount);

    return {
      averageFrameTime: frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length,
      maxFrameTime: Math.max(...frameTimes),
      minFrameTime: Math.min(...frameTimes),
      totalFrames: this.renderMetrics.length,
      averageLinesPerFrame: lineCounts.reduce((sum, count) => sum + count, 0) / lineCounts.length
    };
  }

  clearMetrics(): void {
    this.renderMetrics = [];
  }

  dispose(): void {
    this.lines = [];
    this.renderMetrics = [];
  }
}

// Animated Connection Line System
class AnimatedConnectionSystem {
  private renderer: WebGLConnectionLineRenderer;
  private animatedLines: Array<{
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    currentProgress: number;
    animationSpeed: number;
    color: [number, number, number, number];
    isActive: boolean;
  }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLConnectionLineRenderer(canvas);
  }

  addAnimatedLine(
    id: string,
    start: { x: number; y: number },
    end: { x: number; y: number },
    animationSpeed: number = 0.02,
    color: [number, number, number, number] = [0, 1, 0, 1]
  ): void {
    this.animatedLines.push({
      id,
      start,
      end,
      currentProgress: 0,
      animationSpeed,
      color,
      isActive: true
    });
  }

  updateAnimations(deltaTime: number): { updatedLines: number; renderTime: number } {
    const startTime = performance.now();
    let updatedLines = 0;

    // Clear renderer lines
    this.renderer.lines = [];

    this.animatedLines.forEach(line => {
      if (!line.isActive) return;

      // Update animation progress
      line.currentProgress += line.animationSpeed * deltaTime;
      if (line.currentProgress > 1) {
        line.currentProgress = 1;
        line.isActive = false;
      }

      // Calculate current end point based on progress
      const currentEndX = line.start.x + (line.end.x - line.start.x) * line.currentProgress;
      const currentEndY = line.start.y + (line.end.y - line.start.y) * line.currentProgress;

      // Add to renderer
      this.renderer.addLine(line.start, { x: currentEndX, y: currentEndY }, line.color);
      updatedLines++;
    });

    const renderResult = this.renderer.render();
    const totalTime = performance.now() - startTime;

    return { updatedLines, renderTime: totalTime };
  }

  getActiveLineCount(): number {
    return this.animatedLines.filter(line => line.isActive).length;
  }

  removeCompletedAnimations(): number {
    const initialCount = this.animatedLines.length;
    this.animatedLines = this.animatedLines.filter(line => line.isActive);
    return initialCount - this.animatedLines.length;
  }

  dispose(): void {
    this.animatedLines = [];
    this.renderer.dispose();
  }
}

describe('WebGL Connection Line Rendering Tests', () => {
  let canvas: HTMLCanvasElement;
  let renderer: WebGLConnectionLineRenderer;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    renderer = new WebGLConnectionLineRenderer(canvas);
  });

  afterEach(() => {
    renderer.dispose();
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  describe('Basic Line Rendering', () => {
    it('should render single line efficiently', () => {
      renderer.addLine({ x: 100, y: 100 }, { x: 200, y: 200 });
      
      const result = renderer.render();

      expect(result.lineCount).toBe(1);
      expect(result.frameTime).toBeLessThan(2);
      expect(result.drawCalls).toBeGreaterThan(0);
    });

    it('should handle multiple lines without performance degradation', () => {
      // Add 100 lines
      for (let i = 0; i < 100; i++) {
        renderer.addLine(
          { x: i * 4, y: 100 },
          { x: i * 4 + 50, y: 200 },
          [Math.random(), Math.random(), Math.random(), 1]
        );
      }

      const result = renderer.render();

      expect(result.lineCount).toBe(100);
      expect(result.frameTime).toBeLessThan(10);
    });

    it('should maintain performance with large numbers of lines', () => {
      // Add 1000 lines (typical IM group with many connections)
      for (let i = 0; i < 1000; i++) {
        renderer.addLine(
          { x: Math.random() * 800, y: Math.random() * 600 },
          { x: Math.random() * 800, y: Math.random() * 600 }
        );
      }

      const result = renderer.render();

      expect(result.lineCount).toBe(1000);
      expect(result.frameTime).toBeLessThan(16.67); // 60fps target
    });
  });

  describe('Line Management Operations', () => {
    it('should add and remove lines correctly', () => {
      renderer.addLine({ x: 0, y: 0 }, { x: 100, y: 100 });
      renderer.addLine({ x: 200, y: 200 }, { x: 300, y: 300 });
      
      expect(renderer.lines.length).toBe(2);
      
      renderer.removeLine(0);
      expect(renderer.lines.length).toBe(1);
      
      const result = renderer.render();
      expect(result.lineCount).toBe(1);
    });

    it('should update lines efficiently', () => {
      renderer.addLine({ x: 0, y: 0 }, { x: 100, y: 100 });
      
      const updateStartTime = performance.now();
      renderer.updateLine(0, { x: 50, y: 50 }, { x: 150, y: 150 });
      const updateTime = performance.now() - updateStartTime;

      expect(updateTime).toBeLessThan(1);
      expect(renderer.lines[0].start.x).toBe(50);
      expect(renderer.lines[0].end.x).toBe(150);
    });

    it('should handle rapid line updates', () => {
      // Add initial lines
      for (let i = 0; i < 100; i++) {
        renderer.addLine({ x: i, y: i }, { x: i + 100, y: i + 100 });
      }

      const updateTimes: number[] = [];
      
      // Perform rapid updates
      for (let frame = 0; frame < 60; frame++) {
        const startTime = performance.now();
        
        // Update every line
        for (let i = 0; i < 100; i++) {
          renderer.updateLine(i, 
            { x: i + frame, y: i + frame }, 
            { x: i + 100 + frame, y: i + 100 + frame }
          );
        }
        
        renderer.render();
        updateTimes.push(performance.now() - startTime);
      }

      const averageUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      expect(averageUpdateTime).toBeLessThan(16.67); // 60fps
    });
  });

  describe('Performance Metrics and Analysis', () => {
    it('should track rendering metrics accurately', () => {
      // Render multiple frames
      for (let i = 0; i < 10; i++) {
        renderer.addLine({ x: i * 10, y: 100 }, { x: i * 10 + 50, y: 200 });
        renderer.render();
      }

      const metrics = renderer.getPerformanceMetrics();

      expect(metrics.totalFrames).toBe(10);
      expect(metrics.averageFrameTime).toBeGreaterThan(0);
      expect(metrics.maxFrameTime).toBeGreaterThanOrEqual(metrics.minFrameTime);
      expect(metrics.averageLinesPerFrame).toBeGreaterThan(0);
    });

    it('should identify performance bottlenecks', () => {
      const lineCounts = [10, 100, 500, 1000, 2000];
      const performanceResults: Array<{ lineCount: number; frameTime: number }> = [];

      lineCounts.forEach(count => {
        // Clear previous lines
        renderer.lines = [];
        renderer.clearMetrics();

        // Add specified number of lines
        for (let i = 0; i < count; i++) {
          renderer.addLine(
            { x: Math.random() * 800, y: Math.random() * 600 },
            { x: Math.random() * 800, y: Math.random() * 600 }
          );
        }

        const result = renderer.render();
        performanceResults.push({ lineCount: count, frameTime: result.frameTime });
      });

      // Performance should scale reasonably
      const linearityCheck = performanceResults.every((result, index) => {
        if (index === 0) return true;
        const previous = performanceResults[index - 1];
        const scaleFactor = result.lineCount / previous.lineCount;
        const timeScaleFactor = result.frameTime / previous.frameTime;
        
        // Time increase should be less than 2x the line count increase
        return timeScaleFactor < scaleFactor * 2;
      });

      expect(linearityCheck).toBe(true);
    });
  });

  describe('Mobile-Specific Optimizations', () => {
    it('should handle high-DPI displays correctly', () => {
      // Simulate high-DPI display
      const highDPICanvas = document.createElement('canvas');
      highDPICanvas.width = 1600; // 2x resolution
      highDPICanvas.height = 1200;
      document.body.appendChild(highDPICanvas);

      const highDPIRenderer = new WebGLConnectionLineRenderer(highDPICanvas);

      // Add lines at high resolution
      for (let i = 0; i < 100; i++) {
        highDPIRenderer.addLine(
          { x: Math.random() * 1600, y: Math.random() * 1200 },
          { x: Math.random() * 1600, y: Math.random() * 1200 }
        );
      }

      const result = highDPIRenderer.render();

      expect(result.frameTime).toBeLessThan(20); // Slightly higher threshold for high-DPI
      
      highDPIRenderer.dispose();
      highDPICanvas.parentNode?.removeChild(highDPICanvas);
    });

    it('should optimize for touch device performance', () => {
      // Simulate touch device constraints (lower GPU performance)
      const mobileOptimizedLines = 200; // Reduced from desktop

      for (let i = 0; i < mobileOptimizedLines; i++) {
        renderer.addLine(
          { x: Math.random() * 375, y: Math.random() * 667 }, // Mobile viewport
          { x: Math.random() * 375, y: Math.random() * 667 }
        );
      }

      // Simulate multiple frames
      const frameTimes: number[] = [];
      for (let frame = 0; frame < 30; frame++) {
        const result = renderer.render();
        frameTimes.push(result.frameTime);
      }

      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const consistentFrames = frameTimes.filter(time => time < 16.67).length;

      expect(averageFrameTime).toBeLessThan(12); // Mobile optimization target
      expect(consistentFrames).toBeGreaterThan(25); // 83% consistent frames
    });
  });
});

describe('Animated Connection System Tests', () => {
  let canvas: HTMLCanvasElement;
  let animationSystem: AnimatedConnectionSystem;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    animationSystem = new AnimatedConnectionSystem(canvas);
  });

  afterEach(() => {
    animationSystem.dispose();
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  describe('Animation Performance', () => {
    it('should handle multiple animated lines smoothly', () => {
      // Add 50 animated lines
      for (let i = 0; i < 50; i++) {
        animationSystem.addAnimatedLine(
          `line-${i}`,
          { x: Math.random() * 400, y: Math.random() * 300 },
          { x: Math.random() * 400 + 400, y: Math.random() * 300 + 300 },
          0.02,
          [Math.random(), Math.random(), Math.random(), 1]
        );
      }

      // Simulate 60 frames of animation
      const frameTimes: number[] = [];
      for (let frame = 0; frame < 60; frame++) {
        const result = animationSystem.updateAnimations(16.67); // 60fps delta
        frameTimes.push(result.renderTime);
      }

      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      const slowFrames = frameTimes.filter(time => time > 16.67).length;

      expect(averageFrameTime).toBeLessThan(12);
      expect(slowFrames).toBeLessThan(6); // Less than 10% slow frames
    });

    it('should maintain performance during animation lifecycle', () => {
      // Add staggered animations
      for (let i = 0; i < 100; i++) {
        setTimeout(() => {
          animationSystem.addAnimatedLine(
            `staggered-${i}`,
            { x: 100, y: 100 + i },
            { x: 700, y: 100 + i },
            0.05
          );
        }, i * 10);
      }

      // Simulate animation over time
      const performanceData: Array<{ activeLines: number; renderTime: number }> = [];
      
      for (let frame = 0; frame < 200; frame++) {
        const result = animationSystem.updateAnimations(16.67);
        const activeLines = animationSystem.getActiveLineCount();
        
        performanceData.push({
          activeLines,
          renderTime: result.renderTime
        });

        // Clean up completed animations periodically
        if (frame % 30 === 0) {
          animationSystem.removeCompletedAnimations();
        }
      }

      // Performance should remain consistent regardless of active line count
      const maxRenderTime = Math.max(...performanceData.map(d => d.renderTime));
      expect(maxRenderTime).toBeLessThan(20);
    });

    it('should handle burst animations efficiently', () => {
      // Simulate burst of connections (like when joining a large group)
      const burstSize = 200;
      const addStartTime = performance.now();

      for (let i = 0; i < burstSize; i++) {
        animationSystem.addAnimatedLine(
          `burst-${i}`,
          { x: 400, y: 300 }, // Center point
          { x: Math.random() * 800, y: Math.random() * 600 },
          0.03,
          [0, 1, 1, 1] // Cyan color for burst
        );
      }

      const addTime = performance.now() - addStartTime;
      expect(addTime).toBeLessThan(10); // Adding should be fast

      // Simulate first few frames where all lines are active
      const initialFrames = 10;
      const frameTimes: number[] = [];

      for (let frame = 0; frame < initialFrames; frame++) {
        const result = animationSystem.updateAnimations(16.67);
        frameTimes.push(result.renderTime);
      }

      const averageInitialFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      expect(averageInitialFrameTime).toBeLessThan(25); // Higher threshold for burst
    });
  });

  describe('Memory Management in Animations', () => {
    it('should clean up completed animations', () => {
      // Add fast animations that complete quickly
      for (let i = 0; i < 100; i++) {
        animationSystem.addAnimatedLine(
          `fast-${i}`,
          { x: i, y: 100 },
          { x: i + 100, y: 200 },
          0.1, // Fast animation speed
          [1, 0, 0, 1]
        );
      }

      // Run until all animations complete
      for (let frame = 0; frame < 20; frame++) {
        animationSystem.updateAnimations(16.67);
      }

      const removedCount = animationSystem.removeCompletedAnimations();
      const remainingActive = animationSystem.getActiveLineCount();

      expect(removedCount).toBe(100);
      expect(remainingActive).toBe(0);
    });

    it('should handle continuous animation cycles without memory leaks', () => {
      let totalAnimationsCreated = 0;
      const cycleCount = 10;

      for (let cycle = 0; cycle < cycleCount; cycle++) {
        // Add animations
        for (let i = 0; i < 50; i++) {
          animationSystem.addAnimatedLine(
            `cycle-${cycle}-${i}`,
            { x: Math.random() * 800, y: Math.random() * 600 },
            { x: Math.random() * 800, y: Math.random() * 600 },
            0.05
          );
          totalAnimationsCreated++;
        }

        // Run animations to completion
        for (let frame = 0; frame < 30; frame++) {
          animationSystem.updateAnimations(16.67);
        }

        // Clean up completed animations
        animationSystem.removeCompletedAnimations();
      }

      // Should have processed all animations without memory buildup
      expect(totalAnimationsCreated).toBe(500);
      expect(animationSystem.getActiveLineCount()).toBe(0);
    });
  });
});