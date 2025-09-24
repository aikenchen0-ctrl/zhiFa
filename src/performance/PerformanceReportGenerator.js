/**
 * 性能报告生成器
 * 生成可视化的性能分析报告和优化建议
 */
class PerformanceReportGenerator {
    constructor() {
        this.reportTemplate = null;
        this.chartLibrary = null;
        this.init();
    }

    init() {
        console.log('📊 Performance Report Generator initialized');
        this.loadReportTemplate();
    }

    /**
     * 生成HTML性能报告
     */
    generateHTMLReport(analysisData) {
        const reportHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>连接线渲染性能分析报告</title>
    <style>
        ${this.getReportCSS()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="report-container">
        ${this.generateReportHeader(analysisData)}
        ${this.generateExecutiveSummary(analysisData)}
        ${this.generateDetailedAnalysis(analysisData)}
        ${this.generateRecommendations(analysisData)}
        ${this.generateMetricsCharts(analysisData)}
        ${this.generateBottleneckAnalysis(analysisData)}
        ${this.generateOptimizationPlan(analysisData)}
    </div>
    
    <script>
        ${this.getReportJavaScript(analysisData)}
    </script>
</body>
</html>`;

        return reportHTML;
    }

    /**
     * 生成报告头部
     */
    generateReportHeader(data) {
        const timestamp = new Date(data.timestamp).toLocaleString('zh-CN');
        const score = data.score || 0;
        const scoreClass = this.getScoreClass(score);

        return `
        <header class="report-header">
            <h1>🔬 连接线渲染性能分析报告</h1>
            <div class="report-meta">
                <div class="meta-item">
                    <span class="label">分析时间:</span>
                    <span class="value">${timestamp}</span>
                </div>
                <div class="meta-item">
                    <span class="label">总体评分:</span>
                    <span class="value score-${scoreClass}">${score}/100</span>
                </div>
                <div class="meta-item">
                    <span class="label">瓶颈数量:</span>
                    <span class="value">${data.summary?.totalBottlenecks || 0}</span>
                </div>
            </div>
        </header>`;
    }

    /**
     * 生成执行摘要
     */
    generateExecutiveSummary(data) {
        const summary = data.summary || {};
        
        return `
        <section class="executive-summary">
            <h2>📋 执行摘要</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>🎮 WebGL支持</h3>
                    <div class="status ${summary.webglSupport ? 'supported' : 'not-supported'}">
                        ${summary.webglSupport ? '✅ 支持' : '❌ 不支持'}
                    </div>
                </div>
                
                <div class="summary-card">
                    <h3>🎯 PixiJS状态</h3>
                    <div class="status ${summary.pixiAvailable ? 'available' : 'not-available'}">
                        ${summary.pixiAvailable ? '✅ 可用' : '❌ 不可用'}
                    </div>
                </div>
                
                <div class="summary-card">
                    <h3>⚡ 平均帧率</h3>
                    <div class="metric-value">${summary.averageFrameRate || 0} FPS</div>
                </div>
                
                <div class="summary-card">
                    <h3>💾 内存使用</h3>
                    <div class="metric-value">
                        ${summary.memoryUsage ? 
                            `${summary.memoryUsage.used}MB / ${summary.memoryUsage.total}MB` : 
                            '数据不可用'}
                    </div>
                </div>
                
                <div class="summary-card">
                    <h3>🚨 严重问题</h3>
                    <div class="metric-value critical">${summary.criticalIssues || 0}</div>
                </div>
            </div>
        </section>`;
    }

    /**
     * 生成详细分析部分
     */
    generateDetailedAnalysis(data) {
        return `
        <section class="detailed-analysis">
            <h2>🔍 详细分析</h2>
            
            ${this.generateWebGLAnalysis(data.results?.webgl)}
            ${this.generateCanvasAnalysis(data.results?.canvas)}
            ${this.generatePixiAnalysis(data.results?.pixi)}
            ${this.generateCSSAnalysis(data.results?.css)}
        </section>`;
    }

    /**
     * WebGL分析部分
     */
    generateWebGLAnalysis(webglData) {
        if (!webglData) return '';

        return `
        <div class="analysis-section">
            <h3>🎮 WebGL性能分析</h3>
            <div class="analysis-content">
                <div class="status-indicator ${webglData.supported ? 'success' : 'error'}">
                    ${webglData.supported ? '✅ WebGL支持正常' : '❌ WebGL不可用'}
                </div>
                
                ${webglData.supported ? `
                    <div class="webgl-details">
                        <p><strong>版本:</strong> ${webglData.version}</p>
                        <p><strong>性能等级:</strong> ${this.getPerformanceRating(webglData.performance?.rating)}</p>
                        <p><strong>扩展数量:</strong> ${webglData.extensions?.length || 0}</p>
                        
                        <details class="webgl-limits">
                            <summary>WebGL限制详情</summary>
                            <ul>
                                <li>最大纹理尺寸: ${webglData.limits?.maxTextureSize}</li>
                                <li>最大视口尺寸: ${webglData.limits?.maxViewportDims}</li>
                                <li>最大顶点属性: ${webglData.limits?.maxVertexAttribs}</li>
                            </ul>
                        </details>
                    </div>
                ` : ''}
                
                ${webglData.issues?.length > 0 ? `
                    <div class="issues-list">
                        <h4>检测到的问题:</h4>
                        <ul>
                            ${webglData.issues.map(issue => `<li class="issue-item">${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>`;
    }

    /**
     * Canvas分析部分
     */
    generateCanvasAnalysis(canvasData) {
        if (!canvasData) return '';

        return `
        <div class="analysis-section">
            <h3>🎨 Canvas层级分析</h3>
            <div class="analysis-content">
                <p><strong>Canvas元素数量:</strong> ${canvasData.canvasElements?.length || 0}</p>
                <p><strong>z-index冲突:</strong> ${canvasData.zIndexConflicts?.length || 0}</p>
                <p><strong>指针事件问题:</strong> ${canvasData.pointerEventIssues?.length || 0}</p>
                <p><strong>重叠元素:</strong> ${canvasData.overlappingElements?.length || 0}</p>
                
                ${canvasData.canvasElements?.length > 0 ? `
                    <details class="canvas-details">
                        <summary>Canvas元素详情</summary>
                        <table class="canvas-table">
                            <thead>
                                <tr>
                                    <th>索引</th>
                                    <th>z-index</th>
                                    <th>位置</th>
                                    <th>大小</th>
                                    <th>指针事件</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${canvasData.canvasElements.map(canvas => `
                                    <tr>
                                        <td>${canvas.index}</td>
                                        <td>${canvas.zIndex}</td>
                                        <td>${canvas.position.x}, ${canvas.position.y}</td>
                                        <td>${canvas.size.width}×${canvas.size.height}</td>
                                        <td>${canvas.pointerEvents}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </details>
                ` : ''}
            </div>
        </div>`;
    }

    /**
     * PixiJS分析部分
     */
    generatePixiAnalysis(pixiData) {
        if (!pixiData) return '';

        return `
        <div class="analysis-section">
            <h3>🎮 PixiJS性能分析</h3>
            <div class="analysis-content">
                <div class="status-indicator ${pixiData.pixiAvailable ? 'success' : 'error'}">
                    ${pixiData.pixiAvailable ? '✅ PixiJS可用' : '❌ PixiJS不可用'}
                </div>
                
                ${pixiData.pixiAvailable ? `
                    <div class="pixi-details">
                        <p><strong>版本:</strong> ${pixiData.version}</p>
                        <p><strong>应用数量:</strong> ${pixiData.applications?.length || 0}</p>
                    </div>
                ` : ''}
                
                ${pixiData.issues?.length > 0 ? `
                    <div class="issues-list">
                        <h4>检测到的问题:</h4>
                        <ul>
                            ${pixiData.issues.map(issue => `<li class="issue-item">${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>`;
    }

    /**
     * CSS分析部分
     */
    generateCSSAnalysis(cssData) {
        if (!cssData) return '';

        return `
        <div class="analysis-section">
            <h3>🎨 CSS渲染性能分析</h3>
            <div class="analysis-content">
                <p><strong>昂贵样式数量:</strong> ${cssData.expensiveStyles?.length || 0}</p>
                <p><strong>布局抖动检测:</strong> ${cssData.layoutThrashing?.length || 0}</p>
                
                ${cssData.expensiveStyles?.length > 0 ? `
                    <div class="expensive-styles">
                        <h4>发现昂贵的CSS属性:</h4>
                        <ul>
                            ${cssData.expensiveStyles.map(style => `<li>${style}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>`;
    }

    /**
     * 生成建议部分
     */
    generateRecommendations(data) {
        const recommendations = data.recommendations || [];
        
        if (recommendations.length === 0) {
            return `
            <section class="recommendations">
                <h2>💡 优化建议</h2>
                <div class="no-recommendations">
                    <p>🎉 恭喜！当前系统性能良好，暂无优化建议。</p>
                </div>
            </section>`;
        }

        return `
        <section class="recommendations">
            <h2>💡 优化建议</h2>
            <div class="recommendations-list">
                ${recommendations.map((rec, index) => `
                    <div class="recommendation-item priority-${rec.priority}">
                        <div class="recommendation-header">
                            <span class="priority-badge">${this.getPriorityText(rec.priority)}</span>
                            <h3>${rec.title}</h3>
                        </div>
                        <div class="recommendation-body">
                            <p>${rec.description}</p>
                            ${rec.implementation ? `
                                <details class="implementation-details">
                                    <summary>实施方案</summary>
                                    <p>${rec.implementation}</p>
                                </details>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>`;
    }

    /**
     * 生成性能指标图表
     */
    generateMetricsCharts(data) {
        return `
        <section class="metrics-charts">
            <h2>📊 性能指标图表</h2>
            <div class="charts-grid">
                <div class="chart-container">
                    <canvas id="frameRateChart" width="400" height="200"></canvas>
                    <h3>帧率变化趋势</h3>
                </div>
                
                <div class="chart-container">
                    <canvas id="memoryChart" width="400" height="200"></canvas>
                    <h3>内存使用趋势</h3>
                </div>
                
                <div class="chart-container">
                    <canvas id="bottleneckChart" width="400" height="200"></canvas>
                    <h3>瓶颈类型分布</h3>
                </div>
            </div>
        </section>`;
    }

    /**
     * 生成瓶颈分析
     */
    generateBottleneckAnalysis(data) {
        const bottlenecks = data.results?.bottlenecks || [];
        
        if (bottlenecks.length === 0) {
            return `
            <section class="bottleneck-analysis">
                <h2>🎯 瓶颈分析</h2>
                <div class="no-bottlenecks">
                    <p>✅ 未发现明显的性能瓶颈</p>
                </div>
            </section>`;
        }

        const severityGroups = this.groupBySeverity(bottlenecks);

        return `
        <section class="bottleneck-analysis">
            <h2>🎯 瓶颈分析</h2>
            
            ${Object.entries(severityGroups).map(([severity, items]) => `
                <div class="severity-group severity-${severity}">
                    <h3>${this.getSeverityIcon(severity)} ${this.getSeverityText(severity)} (${items.length})</h3>
                    <div class="bottleneck-list">
                        ${items.map(bottleneck => `
                            <div class="bottleneck-item">
                                <div class="bottleneck-type">${bottleneck.type}</div>
                                <div class="bottleneck-description">${bottleneck.description}</div>
                                <div class="bottleneck-timestamp">${new Date(bottleneck.timestamp).toLocaleTimeString()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </section>`;
    }

    /**
     * 生成优化计划
     */
    generateOptimizationPlan(data) {
        const recommendations = data.recommendations || [];
        const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
        const mediumPriorityRecs = recommendations.filter(r => r.priority === 'medium');
        
        return `
        <section class="optimization-plan">
            <h2>🚀 优化实施计划</h2>
            
            <div class="plan-timeline">
                <div class="phase phase-immediate">
                    <h3>🔥 立即处理 (高优先级)</h3>
                    <div class="phase-items">
                        ${highPriorityRecs.length > 0 ? 
                            highPriorityRecs.map(rec => `
                                <div class="plan-item">
                                    <input type="checkbox" id="high_${rec.title}">
                                    <label for="high_${rec.title}">${rec.title}</label>
                                </div>
                            `).join('') :
                            '<p class="no-items">暂无高优先级项目</p>'
                        }
                    </div>
                </div>
                
                <div class="phase phase-short-term">
                    <h3>⚡ 短期优化 (中优先级)</h3>
                    <div class="phase-items">
                        ${mediumPriorityRecs.length > 0 ? 
                            mediumPriorityRecs.map(rec => `
                                <div class="plan-item">
                                    <input type="checkbox" id="medium_${rec.title}">
                                    <label for="medium_${rec.title}">${rec.title}</label>
                                </div>
                            `).join('') :
                            '<p class="no-items">暂无中优先级项目</p>'
                        }
                    </div>
                </div>
                
                <div class="phase phase-long-term">
                    <h3>🎯 长期规划</h3>
                    <div class="phase-items">
                        <div class="plan-item">
                            <input type="checkbox" id="monitoring">
                            <label for="monitoring">建立持续性能监控体系</label>
                        </div>
                        <div class="plan-item">
                            <input type="checkbox" id="optimization">
                            <label for="optimization">定期进行性能优化评估</label>
                        </div>
                        <div class="plan-item">
                            <input type="checkbox" id="training">
                            <label for="training">团队性能优化培训</label>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    /**
     * 获取报告CSS样式
     */
    getReportCSS() {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
        }

        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .report-header h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            text-align: center;
        }

        .report-meta {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 20px;
        }

        .meta-item {
            text-align: center;
        }

        .meta-item .label {
            display: block;
            font-size: 0.9rem;
            opacity: 0.8;
            margin-bottom: 5px;
        }

        .meta-item .value {
            display: block;
            font-size: 1.2rem;
            font-weight: bold;
        }

        .score-excellent { color: #4CAF50; }
        .score-good { color: #8BC34A; }
        .score-fair { color: #FF9800; }
        .score-poor { color: #F44336; }

        section {
            background: white;
            margin-bottom: 30px;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }

        section h2 {
            color: #2c3e50;
            font-size: 1.8rem;
            margin-bottom: 25px;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            text-align: center;
        }

        .summary-card h3 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1rem;
        }

        .status {
            font-weight: bold;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
        }

        .status.supported, .status.available { 
            background: #d4edda; 
            color: #155724; 
        }

        .status.not-supported, .status.not-available { 
            background: #f8d7da; 
            color: #721c24; 
        }

        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #2c3e50;
        }

        .metric-value.critical {
            color: #e74c3c;
        }

        .analysis-section {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #17a2b8;
        }

        .analysis-section h3 {
            color: #2c3e50;
            margin-bottom: 15px;
        }

        .status-indicator {
            padding: 10px 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-weight: 500;
        }

        .status-indicator.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status-indicator.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .issues-list {
            margin-top: 15px;
        }

        .issue-item {
            background: #fff3cd;
            color: #856404;
            padding: 8px 12px;
            margin: 5px 0;
            border-radius: 4px;
            border-left: 3px solid #ffc107;
        }

        .recommendations-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .recommendation-item {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .recommendation-item.priority-high {
            border-left: 5px solid #e74c3c;
        }

        .recommendation-item.priority-medium {
            border-left: 5px solid #f39c12;
        }

        .recommendation-item.priority-low {
            border-left: 5px solid #27ae60;
        }

        .recommendation-header {
            background: #f8f9fa;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .priority-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
        }

        .priority-badge {
            background: #6c757d;
            color: white;
        }

        .recommendation-body {
            padding: 20px;
            background: white;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .chart-container {
            text-align: center;
        }

        .chart-container h3 {
            margin-top: 15px;
            color: #2c3e50;
        }

        .severity-group {
            margin-bottom: 25px;
            border-radius: 8px;
            overflow: hidden;
        }

        .severity-group.severity-high {
            border: 2px solid #e74c3c;
        }

        .severity-group.severity-medium {
            border: 2px solid #f39c12;
        }

        .severity-group.severity-low {
            border: 2px solid #27ae60;
        }

        .severity-group h3 {
            padding: 15px 20px;
            margin: 0;
            color: white;
        }

        .severity-group.severity-high h3 {
            background: #e74c3c;
        }

        .severity-group.severity-medium h3 {
            background: #f39c12;
        }

        .severity-group.severity-low h3 {
            background: #27ae60;
        }

        .bottleneck-list {
            padding: 20px;
            background: white;
        }

        .bottleneck-item {
            padding: 15px;
            margin-bottom: 10px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #6c757d;
        }

        .bottleneck-type {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .bottleneck-description {
            color: #6c757d;
            margin-bottom: 5px;
        }

        .bottleneck-timestamp {
            font-size: 0.8rem;
            color: #adb5bd;
        }

        .plan-timeline {
            display: flex;
            flex-direction: column;
            gap: 25px;
        }

        .phase {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .phase h3 {
            padding: 15px 20px;
            margin: 0;
            color: white;
        }

        .phase-immediate h3 {
            background: #e74c3c;
        }

        .phase-short-term h3 {
            background: #f39c12;
        }

        .phase-long-term h3 {
            background: #3498db;
        }

        .phase-items {
            padding: 20px;
            background: white;
        }

        .plan-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            margin-bottom: 8px;
            background: #f8f9fa;
            border-radius: 4px;
        }

        .plan-item input[type="checkbox"] {
            transform: scale(1.2);
        }

        .plan-item label {
            flex: 1;
            cursor: pointer;
        }

        .no-items, .no-recommendations, .no-bottlenecks {
            text-align: center;
            padding: 40px;
            color: #6c757d;
            background: #f8f9fa;
            border-radius: 8px;
        }

        details {
            margin-top: 15px;
        }

        summary {
            cursor: pointer;
            font-weight: 500;
            color: #495057;
            padding: 10px;
            background: #e9ecef;
            border-radius: 4px;
        }

        summary:hover {
            background: #dee2e6;
        }

        .canvas-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .canvas-table th,
        .canvas-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }

        .canvas-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }

        @media (max-width: 768px) {
            .report-container {
                padding: 10px;
            }

            .report-header h1 {
                font-size: 2rem;
            }

            .report-meta {
                flex-direction: column;
                gap: 10px;
            }

            .summary-grid {
                grid-template-columns: 1fr;
            }

            .charts-grid {
                grid-template-columns: 1fr;
            }

            section {
                padding: 20px;
            }
        }
        `;
    }

    /**
     * 获取报告JavaScript代码
     */
    getReportJavaScript(data) {
        return `
        // 初始化图表
        document.addEventListener('DOMContentLoaded', function() {
            initializeCharts(${JSON.stringify(data)});
        });

        function initializeCharts(data) {
            // 帧率图表
            const frameRateCtx = document.getElementById('frameRateChart');
            if (frameRateCtx && data.metrics && data.metrics.frameRates) {
                new Chart(frameRateCtx, {
                    type: 'line',
                    data: {
                        labels: data.metrics.frameRates.map(f => new Date(f.timestamp).toLocaleTimeString()),
                        datasets: [{
                            label: '帧率 (FPS)',
                            data: data.metrics.frameRates.map(f => f.fps),
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 60
                            }
                        }
                    }
                });
            }

            // 内存图表
            const memoryCtx = document.getElementById('memoryChart');
            if (memoryCtx && data.metrics && data.metrics.memorySnapshots) {
                new Chart(memoryCtx, {
                    type: 'line',
                    data: {
                        labels: data.metrics.memorySnapshots.map(m => new Date(m.timestamp).toLocaleTimeString()),
                        datasets: [{
                            label: '已用内存 (MB)',
                            data: data.metrics.memorySnapshots.map(m => m.usedJSHeapSize / (1024 * 1024)),
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }

            // 瓶颈分布图表
            const bottleneckCtx = document.getElementById('bottleneckChart');
            if (bottleneckCtx && data.results && data.results.bottlenecks) {
                const severityCount = data.results.bottlenecks.reduce((acc, b) => {
                    acc[b.severity] = (acc[b.severity] || 0) + 1;
                    return acc;
                }, {});

                new Chart(bottleneckCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(severityCount).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
                        datasets: [{
                            data: Object.values(severityCount),
                            backgroundColor: [
                                '#e74c3c',  // high
                                '#f39c12',  // medium
                                '#27ae60'   // low
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }
        }

        // 复制报告链接功能
        function copyReportLink() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('报告链接已复制到剪贴板');
            });
        }

        // 打印报告功能
        function printReport() {
            window.print();
        }

        // 导出数据功能
        function exportData() {
            const data = ${JSON.stringify(data, null, 2)};
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'performance-analysis-' + new Date().toISOString().slice(0, 19) + '.json';
            a.click();
            URL.revokeObjectURL(url);
        }
        `;
    }

    // 辅助方法
    getScoreClass(score) {
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    }

    getPerformanceRating(rating) {
        const ratings = {
            'excellent': '🟢 优秀',
            'good': '🟡 良好',
            'fair': '🟠 一般',
            'poor': '🔴 差'
        };
        return ratings[rating] || '❓ 未知';
    }

    getPriorityText(priority) {
        const texts = {
            'high': '高优先级',
            'medium': '中优先级',
            'low': '低优先级'
        };
        return texts[priority] || priority;
    }

    getSeverityIcon(severity) {
        const icons = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        };
        return icons[severity] || '❓';
    }

    getSeverityText(severity) {
        const texts = {
            'high': '严重问题',
            'medium': '中等问题',
            'low': '轻微问题'
        };
        return texts[severity] || severity;
    }

    groupBySeverity(bottlenecks) {
        return bottlenecks.reduce((groups, bottleneck) => {
            const severity = bottleneck.severity;
            if (!groups[severity]) {
                groups[severity] = [];
            }
            groups[severity].push(bottleneck);
            return groups;
        }, {});
    }

    loadReportTemplate() {
        // 可以在这里加载外部模板
        this.reportTemplate = 'default';
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceReportGenerator;
} else if (typeof window !== 'undefined') {
    window.PerformanceReportGenerator = PerformanceReportGenerator;
}