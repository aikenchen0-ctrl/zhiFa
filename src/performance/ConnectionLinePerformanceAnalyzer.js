/**
 * 连接线渲染性能瓶颈分析器
 * 专门诊断WebGL、Canvas、CSS渲染、内存泄漏等问题
 */
class ConnectionLinePerformanceAnalyzer {
    constructor() {
        this.analysisResults = {
            webgl: null,
            canvas: null,
            pixi: null,
            css: null,
            frameRate: null,
            memory: null,
            bottlenecks: [],
            recommendations: []
        };
        
        this.performanceMetrics = {
            startTime: performance.now(),
            samples: [],
            memorySnapshots: [],
            frameRates: [],
            renderTimes: []
        };
        
        this.config = {
            sampleInterval: 100, // ms
            maxSamples: 1000,
            memoryCheckInterval: 5000, // ms
            frameRateWindow: 60, // frames
            warningThresholds: {
                frameRate: 30,
                memoryGrowth: 50, // MB
                renderTime: 16.67, // ms (60fps)
                cpuUsage: 80 // %
            }
        };
        
        this.init();
    }

    /**
     * 初始化分析器
     */
    init() {
        console.log('🔬 Connection Line Performance Analyzer initialized');
        this.startSystemMonitoring();
    }

    /**
     * 开始系统监控
     */
    startSystemMonitoring() {
        // 内存监控
        setInterval(() => {
            this.captureMemorySnapshot();
        }, this.config.memoryCheckInterval);

        // 帧率监控
        this.startFrameRateMonitoring();

        // 性能采样
        setInterval(() => {
            this.capturePerfomanceSample();
        }, this.config.sampleInterval);
    }

    /**
     * 1. WebGL支持检测
     */
    async analyzeWebGLSupport() {
        console.log('🎮 Analyzing WebGL Support...');
        
        const result = {
            supported: false,
            version: null,
            extensions: [],
            limits: {},
            issues: [],
            performance: 'unknown'
        };

        try {
            // 检测WebGL可用性
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (!gl) {
                result.issues.push('WebGL not supported in this browser');
                return result;
            }

            result.supported = true;
            result.version = gl.getParameter(gl.VERSION);
            
            // 检测扩展支持
            const supportedExtensions = gl.getSupportedExtensions();
            result.extensions = supportedExtensions || [];
            
            // 检测性能限制
            result.limits = {
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
                maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
                maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
            };

            // 性能测试
            const perfResult = await this.testWebGLPerformance(gl);
            result.performance = perfResult;

            // 检测常见问题
            this.detectWebGLIssues(result);

        } catch (error) {
            result.issues.push(`WebGL detection error: ${error.message}`);
        }

        this.analysisResults.webgl = result;
        return result;
    }

    /**
     * WebGL性能测试
     */
    async testWebGLPerformance(gl) {
        const startTime = performance.now();
        
        try {
            // 创建简单的测试场景
            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, `
                attribute vec2 a_position;
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `);
            
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, `
                precision mediump float;
                void main() {
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }
            `);
            
            const program = this.createProgram(gl, vertexShader, fragmentShader);
            
            // 执行多次绘制测试
            const iterations = 1000;
            const renderStartTime = performance.now();
            
            for (let i = 0; i < iterations; i++) {
                gl.useProgram(program);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
            
            gl.finish(); // 等待GPU完成
            const renderTime = performance.now() - renderStartTime;
            
            const totalTime = performance.now() - startTime;
            
            return {
                renderTime: renderTime,
                totalTime: totalTime,
                averageRenderTime: renderTime / iterations,
                rating: this.getRenderPerformanceRating(renderTime / iterations)
            };
            
        } catch (error) {
            return {
                error: error.message,
                rating: 'poor'
            };
        }
    }

    /**
     * 创建WebGL着色器
     */
    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
        }
        
        return shader;
    }

    /**
     * 创建WebGL程序
     */
    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
        }
        
        return program;
    }

    /**
     * 2. Canvas层级问题诊断
     */
    async analyzeCanvasLayering() {
        console.log('🎨 Analyzing Canvas Layering Issues...');
        
        const result = {
            canvasElements: [],
            zIndexConflicts: [],
            pointerEventIssues: [],
            overlappingElements: [],
            recommendations: []
        };

        try {
            // 获取所有Canvas元素
            const canvasElements = document.querySelectorAll('canvas');
            
            canvasElements.forEach((canvas, index) => {
                const canvasInfo = {
                    element: canvas,
                    index: index,
                    zIndex: this.getComputedZIndex(canvas),
                    position: this.getElementPosition(canvas),
                    size: this.getElementSize(canvas),
                    pointerEvents: getComputedStyle(canvas).pointerEvents,
                    opacity: getComputedStyle(canvas).opacity,
                    visibility: getComputedStyle(canvas).visibility
                };
                
                result.canvasElements.push(canvasInfo);
            });

            // 检测z-index冲突
            this.detectZIndexConflicts(result);
            
            // 检测pointer-events问题
            this.detectPointerEventIssues(result);
            
            // 检测重叠问题
            this.detectOverlappingElements(result);
            
            // 生成建议
            this.generateCanvasLayeringRecommendations(result);

        } catch (error) {
            result.error = error.message;
        }

        this.analysisResults.canvas = result;
        return result;
    }

    /**
     * 3. PixiJS性能分析
     */
    async analyzePixiJSPerformance() {
        console.log('🎮 Analyzing PixiJS Performance...');
        
        const result = {
            pixiAvailable: false,
            version: null,
            applications: [],
            rendererInfo: {},
            performanceMetrics: {},
            issues: [],
            recommendations: []
        };

        try {
            // 检测PixiJS是否可用
            if (typeof PIXI === 'undefined') {
                result.issues.push('PixiJS not loaded');
                return result;
            }

            result.pixiAvailable = true;
            result.version = PIXI.VERSION;

            // 分析现有的PixiJS应用
            this.analyzePixiApplications(result);
            
            // 分析渲染器性能
            this.analyzePixiRenderer(result);
            
            // 检测常见性能问题
            this.detectPixiPerformanceIssues(result);
            
            // 生成优化建议
            this.generatePixiOptimizationRecommendations(result);

        } catch (error) {
            result.issues.push(`PixiJS analysis error: ${error.message}`);
        }

        this.analysisResults.pixi = result;
        return result;
    }

    /**
     * 4. CSS渲染性能检测
     */
    async analyzeCSSRenderingPerformance() {
        console.log('🎨 Analyzing CSS Rendering Performance...');
        
        const result = {
            criticalRenderingPath: {},
            layoutThrashing: [],
            expensiveStyles: [],
            animationPerformance: {},
            recommendations: []
        };

        try {
            // 检测昂贵的CSS属性
            this.detectExpensiveCSSProperties(result);
            
            // 检测Layout Thrashing
            this.detectLayoutThrashing(result);
            
            // 分析动画性能
            this.analyzeCSSAnimationPerformance(result);
            
            // 分析关键渲染路径
            this.analyzeCriticalRenderingPath(result);
            
            // 生成CSS优化建议
            this.generateCSSOptimizationRecommendations(result);

        } catch (error) {
            result.error = error.message;
        }

        this.analysisResults.css = result;
        return result;
    }

    /**
     * 5. 帧率和渲染循环监控
     */
    startFrameRateMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        let fps = 0;

        const measureFrameRate = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.recordFrameRate(fps);
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFrameRate);
        };

        requestAnimationFrame(measureFrameRate);
    }

    /**
     * 记录帧率数据
     */
    recordFrameRate(fps) {
        this.performanceMetrics.frameRates.push({
            timestamp: performance.now(),
            fps: fps
        });

        // 保持最近的数据
        if (this.performanceMetrics.frameRates.length > this.config.frameRateWindow) {
            this.performanceMetrics.frameRates.shift();
        }

        // 检测帧率问题
        if (fps < this.config.warningThresholds.frameRate) {
            this.addBottleneck('low_framerate', `Low frame rate detected: ${fps}fps`, 'high');
        }
    }

    /**
     * 6. 内存泄漏检测
     */
    captureMemorySnapshot() {
        if (!performance.memory) {
            return;
        }

        const snapshot = {
            timestamp: performance.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };

        this.performanceMetrics.memorySnapshots.push(snapshot);

        // 保持最近的数据
        if (this.performanceMetrics.memorySnapshots.length > 100) {
            this.performanceMetrics.memorySnapshots.shift();
        }

        // 检测内存泄漏
        this.detectMemoryLeaks();
    }

    /**
     * 检测内存泄漏
     */
    detectMemoryLeaks() {
        const snapshots = this.performanceMetrics.memorySnapshots;
        if (snapshots.length < 10) return;

        const recent = snapshots.slice(-10);
        const growth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
        const growthMB = growth / (1024 * 1024);

        if (growthMB > this.config.warningThresholds.memoryGrowth) {
            this.addBottleneck('memory_leak', 
                `Potential memory leak detected: ${growthMB.toFixed(2)}MB growth in recent samples`, 
                'high');
        }
    }

    /**
     * 性能采样
     */
    capturePerfomanceSample() {
        const sample = {
            timestamp: performance.now(),
            timing: performance.timing,
            navigation: performance.navigation,
            entries: performance.getEntriesByType('navigation'),
            measures: performance.getEntriesByType('measure'),
            marks: performance.getEntriesByType('mark')
        };

        this.performanceMetrics.samples.push(sample);

        if (this.performanceMetrics.samples.length > this.config.maxSamples) {
            this.performanceMetrics.samples.shift();
        }
    }

    /**
     * 添加性能瓶颈
     */
    addBottleneck(type, description, severity = 'medium') {
        const bottleneck = {
            type,
            description,
            severity,
            timestamp: performance.now(),
            id: `${type}_${Date.now()}`
        };

        this.analysisResults.bottlenecks.push(bottleneck);
        console.warn(`🚨 Performance Bottleneck [${severity.toUpperCase()}]: ${description}`);
    }

    /**
     * 运行完整分析
     */
    async runCompleteAnalysis() {
        console.log('🚀 Starting Complete Performance Analysis...');
        
        const startTime = performance.now();
        
        try {
            // 并行运行所有分析
            const [webglResult, canvasResult, pixiResult, cssResult] = await Promise.all([
                this.analyzeWebGLSupport(),
                this.analyzeCanvasLayering(),
                this.analyzePixiJSPerformance(),
                this.analyzeCSSRenderingPerformance()
            ]);

            // 生成综合报告
            const report = this.generateComprehensiveReport();
            
            const analysisTime = performance.now() - startTime;
            console.log(`✅ Complete analysis finished in ${analysisTime.toFixed(2)}ms`);
            
            return report;

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            throw error;
        }
    }

    /**
     * 生成综合报告
     */
    generateComprehensiveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(),
            results: this.analysisResults,
            metrics: this.performanceMetrics,
            recommendations: this.generatePrioritizedRecommendations(),
            score: this.calculateOverallScore()
        };

        return report;
    }

    /**
     * 生成摘要
     */
    generateSummary() {
        const summary = {
            totalBottlenecks: this.analysisResults.bottlenecks.length,
            criticalIssues: this.analysisResults.bottlenecks.filter(b => b.severity === 'high').length,
            averageFrameRate: this.calculateAverageFrameRate(),
            memoryUsage: this.getCurrentMemoryUsage(),
            webglSupport: this.analysisResults.webgl?.supported || false,
            pixiAvailable: this.analysisResults.pixi?.pixiAvailable || false
        };

        return summary;
    }

    /**
     * 计算平均帧率
     */
    calculateAverageFrameRate() {
        const frames = this.performanceMetrics.frameRates;
        if (frames.length === 0) return 0;
        
        const sum = frames.reduce((acc, frame) => acc + frame.fps, 0);
        return Math.round(sum / frames.length);
    }

    /**
     * 获取当前内存使用情况
     */
    getCurrentMemoryUsage() {
        if (!performance.memory) return null;
        
        return {
            used: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
            total: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024)),
            limit: Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024))
        };
    }

    /**
     * 计算总体评分
     */
    calculateOverallScore() {
        let score = 100;
        
        // 根据瓶颈数量扣分
        const bottlenecks = this.analysisResults.bottlenecks;
        score -= bottlenecks.filter(b => b.severity === 'high').length * 20;
        score -= bottlenecks.filter(b => b.severity === 'medium').length * 10;
        score -= bottlenecks.filter(b => b.severity === 'low').length * 5;
        
        // 根据帧率扣分
        const avgFps = this.calculateAverageFrameRate();
        if (avgFps < 30) score -= 30;
        else if (avgFps < 45) score -= 15;
        else if (avgFps < 55) score -= 5;
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * 生成优先级建议
     */
    generatePrioritizedRecommendations() {
        const recommendations = [
            ...this.analysisResults.recommendations,
            ...this.generateGenericRecommendations()
        ];

        // 按优先级排序
        return recommendations.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * 生成通用建议
     */
    generateGenericRecommendations() {
        const recommendations = [];
        
        // WebGL建议
        if (!this.analysisResults.webgl?.supported) {
            recommendations.push({
                category: 'webgl',
                priority: 'high',
                title: 'Enable Hardware Acceleration',
                description: 'WebGL is not supported. Consider enabling hardware acceleration in browser settings.'
            });
        }

        // 帧率建议
        const avgFps = this.calculateAverageFrameRate();
        if (avgFps < 30) {
            recommendations.push({
                category: 'performance',
                priority: 'high',
                title: 'Optimize Rendering Performance',
                description: `Low frame rate detected (${avgFps}fps). Consider reducing rendering complexity.`
            });
        }

        // 内存建议
        const memUsage = this.getCurrentMemoryUsage();
        if (memUsage && memUsage.used > memUsage.total * 0.8) {
            recommendations.push({
                category: 'memory',
                priority: 'medium',
                title: 'Reduce Memory Usage',
                description: `High memory usage detected (${memUsage.used}MB/${memUsage.total}MB).`
            });
        }

        return recommendations;
    }

    // 辅助方法
    getComputedZIndex(element) {
        const zIndex = getComputedStyle(element).zIndex;
        return zIndex === 'auto' ? 0 : parseInt(zIndex) || 0;
    }

    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }

    getElementSize(element) {
        return { width: element.offsetWidth, height: element.offsetHeight };
    }

    getRenderPerformanceRating(avgRenderTime) {
        if (avgRenderTime < 0.01) return 'excellent';
        if (avgRenderTime < 0.05) return 'good';
        if (avgRenderTime < 0.1) return 'fair';
        return 'poor';
    }

    // 占位符方法 - 需要根据具体需求实现
    detectWebGLIssues(result) {
        // TODO: 实现WebGL问题检测
    }

    detectZIndexConflicts(result) {
        // TODO: 实现z-index冲突检测
    }

    detectPointerEventIssues(result) {
        // TODO: 实现pointer-events问题检测
    }

    detectOverlappingElements(result) {
        // TODO: 实现重叠元素检测
    }

    generateCanvasLayeringRecommendations(result) {
        // TODO: 实现Canvas层级建议生成
    }

    analyzePixiApplications(result) {
        // TODO: 实现PixiJS应用分析
    }

    analyzePixiRenderer(result) {
        // TODO: 实现PixiJS渲染器分析
    }

    detectPixiPerformanceIssues(result) {
        // TODO: 实现PixiJS性能问题检测
    }

    generatePixiOptimizationRecommendations(result) {
        // TODO: 实现PixiJS优化建议
    }

    detectExpensiveCSSProperties(result) {
        // TODO: 实现昂贵CSS属性检测
    }

    detectLayoutThrashing(result) {
        // TODO: 实现Layout Thrashing检测
    }

    analyzeCSSAnimationPerformance(result) {
        // TODO: 实现CSS动画性能分析
    }

    analyzeCriticalRenderingPath(result) {
        // TODO: 实现关键渲染路径分析
    }

    generateCSSOptimizationRecommendations(result) {
        // TODO: 实现CSS优化建议
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionLinePerformanceAnalyzer;
} else if (typeof window !== 'undefined') {
    window.ConnectionLinePerformanceAnalyzer = ConnectionLinePerformanceAnalyzer;
}