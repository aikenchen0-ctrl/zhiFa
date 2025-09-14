/**
 * Test Data Manager - Complete Management Interface
 * 
 * Provides comprehensive interface for:
 * - Managing test data lifecycle
 * - Performance monitoring and analysis
 * - Debug mode and data inspection
 * - Batch operations and cleanup
 * - Export/import functionality
 */

class TestDataManager {
    constructor() {
        this.generator = null;
        this.builder = null;
        this.performanceRunner = null;
        this.debugMode = false;
        this.currentSession = {
            id: null,
            startTime: null,
            elements: 0,
            operations: []
        };
        this.sessionHistory = [];
    }

    /**
     * Initialize the test data management system
     */
    async initialize() {
        try {
            // Initialize core components
            this.generator = new TestDataGenerator();
            this.builder = new HTMLElementBuilder();
            this.performanceRunner = new PerformanceTestRunner(this.generator);
            
            // Apply responsive styles
            this.builder.applyResponsiveStyles();
            
            // Start new session
            this.startSession();
            
            console.log('Test Data Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Test Data Manager:', error);
            return false;
        }
    }

    /**
     * Start a new testing session
     */
    startSession() {
        this.currentSession = {
            id: `session-${Date.now()}`,
            startTime: new Date().toISOString(),
            elements: 0,
            operations: []
        };
        
        this.log('operation', 'Session started', { sessionId: this.currentSession.id });
    }

    /**
     * End current session and save to history
     */
    endSession() {
        if (this.currentSession.id) {
            this.currentSession.endTime = new Date().toISOString();
            this.currentSession.duration = Date.now() - new Date(this.currentSession.startTime).getTime();
            this.sessionHistory.push({ ...this.currentSession });
            
            this.log('operation', 'Session ended', {
                sessionId: this.currentSession.id,
                duration: this.currentSession.duration,
                operations: this.currentSession.operations.length
            });
            
            this.currentSession = { id: null, startTime: null, elements: 0, operations: [] };
        }
    }

    /**
     * Generate test data with specified parameters
     */
    async generateTestData(options = {}) {
        const {
            count = 1000,
            includeEdgeCases = true,
            progressCallback = null,
            batchSize = 100
        } = options;

        try {
            this.log('operation', 'Starting data generation', { count, includeEdgeCases });
            
            const startTime = performance.now();
            
            // Generate main dataset
            const data = this.generator.generateTestData(count);
            
            // Add edge cases if requested
            if (includeEdgeCases) {
                const edgeCases = this.generator.generateEdgeCases();
                data.messageBubbles = data.messageBubbles.concat(edgeCases);
                
                // Generate corresponding avatars for edge cases
                edgeCases.forEach((bubble, index) => {
                    const avatar = this.generator.generateAccountAvatar(count + index, bubble);
                    data.accountAvatars.push(avatar);
                });
            }
            
            const endTime = performance.now();
            this.currentSession.elements = data.messageBubbles.length;
            
            this.log('operation', 'Data generation completed', {
                count: data.messageBubbles.length,
                time: endTime - startTime,
                statistics: data.statistics
            });
            
            return data;
        } catch (error) {
            this.log('error', 'Data generation failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Render test data to DOM with performance monitoring
     */
    async renderTestData(data, containerId, options = {}) {
        const {
            elementType = 'all',
            maxElements = Infinity,
            useVirtualization = false,
            progressCallback = null
        } = options;

        try {
            const container = typeof containerId === 'string' 
                ? document.getElementById(containerId) 
                : containerId;
                
            if (!container) {
                throw new Error('Container not found');
            }

            this.log('operation', 'Starting render', {
                elementType,
                maxElements,
                containerSize: container.children.length
            });

            const startTime = performance.now();
            
            // Clear existing content
            this.builder.clearContainer(container);
            
            // Create layout containers if rendering all elements
            let targetContainer = container;
            if (elementType === 'all') {
                const layouts = this.builder.createLayoutContainers();
                container.appendChild(layouts.main);
                targetContainer = layouts.messageContainer;
                
                // Render session avatars to session list
                if (data.sessionAvatars.length > 0) {
                    this.builder.batchCreateElements(data, layouts.sessionList, {
                        elementType: 'sessionAvatars',
                        maxElements,
                        onProgress: progressCallback
                    });
                }
                
                // Render account avatars to avatar container
                if (data.accountAvatars.length > 0) {
                    this.builder.batchCreateElements(data, layouts.avatarContainer, {
                        elementType: 'accountAvatars',
                        maxElements,
                        onProgress: progressCallback
                    });
                }
                
                // Render message bubbles to message container
                elementType = 'messageBubbles';
            }
            
            const renderStats = this.builder.batchCreateElements(data, targetContainer, {
                elementType,
                maxElements,
                onProgress: progressCallback
            });
            
            const endTime = performance.now();
            
            this.log('operation', 'Render completed', {
                ...renderStats,
                totalTime: endTime - startTime
            });

            return renderStats;
        } catch (error) {
            this.log('error', 'Render failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run comprehensive performance tests
     */
    async runPerformanceTests(testConfigs = null) {
        if (!testConfigs) {
            testConfigs = [
                { count: 100, name: 'Small Dataset' },
                { count: 500, name: 'Medium Dataset' },
                { count: 1000, name: 'Large Dataset' },
                { count: 2000, name: 'Stress Test' }
            ];
        }

        try {
            this.log('operation', 'Starting performance tests', { configs: testConfigs.length });
            
            const results = [];
            
            for (const config of testConfigs) {
                console.log(`\n--- Running ${config.name} (${config.count} elements) ---`);
                
                const testStartTime = performance.now();
                
                // Generate data
                const data = await this.generateTestData({ count: config.count });
                
                // Create test container
                const testContainer = document.createElement('div');
                testContainer.style.cssText = 'position: absolute; top: -9999px; left: -9999px;';
                document.body.appendChild(testContainer);
                
                // Render and measure
                const renderStats = await this.renderTestData(data, testContainer);
                
                // Calculate memory usage
                const memoryUsage = this.getMemoryUsage();
                
                // Cleanup
                testContainer.remove();
                
                const testEndTime = performance.now();
                
                const result = {
                    ...config,
                    totalTime: testEndTime - testStartTime,
                    generateTime: renderStats.renderTime,
                    renderTime: renderStats.renderTime,
                    elements: renderStats.totalElements,
                    memoryUsage,
                    elementsPerSecond: Math.round(renderStats.totalElements / (renderStats.renderTime / 1000))
                };
                
                results.push(result);
                this.log('performance', 'Test completed', result);
            }
            
            // Generate performance report
            const report = this.generatePerformanceReport(results);
            
            this.log('operation', 'Performance tests completed', {
                totalTests: results.length,
                report: report.summary
            });
            
            return { results, report };
        } catch (error) {
            this.log('error', 'Performance tests failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate detailed performance report
     */
    generatePerformanceReport(results) {
        const summary = {
            totalTests: results.length,
            avgRenderTime: results.reduce((sum, r) => sum + parseFloat(r.renderTime), 0) / results.length,
            avgElementsPerSecond: results.reduce((sum, r) => sum + r.elementsPerSecond, 0) / results.length,
            maxElements: Math.max(...results.map(r => r.elements)),
            minRenderTime: Math.min(...results.map(r => parseFloat(r.renderTime))),
            maxRenderTime: Math.max(...results.map(r => parseFloat(r.renderTime)))
        };
        
        const recommendations = [];
        
        if (summary.avgRenderTime > 1000) {
            recommendations.push('Consider implementing virtualization for large datasets');
        }
        
        if (summary.avgElementsPerSecond < 1000) {
            recommendations.push('DOM creation performance could be optimized');
        }
        
        return {
            timestamp: new Date().toISOString(),
            summary,
            results,
            recommendations,
            systemInfo: this.getSystemInfo()
        };
    }

    /**
     * Enable debug mode with detailed logging
     */
    enableDebugMode() {
        this.debugMode = true;
        console.log('Debug mode enabled');
        
        // Add debug styles
        this.addDebugStyles();
        
        this.log('debug', 'Debug mode activated');
    }

    /**
     * Disable debug mode
     */
    disableDebugMode() {
        this.debugMode = false;
        console.log('Debug mode disabled');
        
        // Remove debug styles
        this.removeDebugStyles();
        
        this.log('debug', 'Debug mode deactivated');
    }

    /**
     * Add visual debug indicators
     */
    addDebugStyles() {
        const debugStyle = document.createElement('style');
        debugStyle.id = 'test-data-debug-styles';
        debugStyle.textContent = `
            .session-avatar, .message-bubble, .account-avatar {
                border: 1px dashed rgba(255, 0, 0, 0.3) !important;
                position: relative !important;
            }
            
            .session-avatar::before, .message-bubble::before, .account-avatar::before {
                content: attr(id);
                position: absolute;
                top: -15px;
                left: 0;
                font-size: 8px;
                color: red;
                background: rgba(255, 255, 255, 0.8);
                padding: 1px 3px;
                border-radius: 2px;
                font-family: monospace;
                z-index: 10000;
            }
            
            [style*="anchor-name"] {
                box-shadow: 0 0 0 2px rgba(0, 255, 0, 0.5) !important;
            }
        `;
        
        document.head.appendChild(debugStyle);
    }

    /**
     * Remove debug styles
     */
    removeDebugStyles() {
        const debugStyle = document.getElementById('test-data-debug-styles');
        if (debugStyle) {
            debugStyle.remove();
        }
    }

    /**
     * Clear all test data and DOM elements
     */
    clearAll(containerId = null) {
        try {
            this.log('operation', 'Starting cleanup');
            
            // Clear generator data
            if (this.generator) {
                this.generator.clearGeneratedData();
            }
            
            // Clear DOM if container specified
            if (containerId) {
                const container = typeof containerId === 'string' 
                    ? document.getElementById(containerId) 
                    : containerId;
                
                if (container) {
                    this.builder.clearContainer(container);
                }
            }
            
            // Reset session counters
            this.currentSession.elements = 0;
            
            this.log('operation', 'Cleanup completed');
            return true;
        } catch (error) {
            this.log('error', 'Cleanup failed', { error: error.message });
            return false;
        }
    }

    /**
     * Export data and configuration
     */
    exportData(format = 'json') {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                session: this.currentSession,
                sessionHistory: this.sessionHistory,
                data: this.generator ? this.generator.exportData() : null,
                renderStats: this.builder ? this.builder.getRenderStats() : null
            };
            
            if (format === 'json') {
                const blob = new Blob([JSON.stringify(exportData, null, 2)], 
                    { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `test-data-export-${Date.now()}.json`;
                link.click();
                
                URL.revokeObjectURL(url);
            }
            
            this.log('operation', 'Data exported', { format, size: JSON.stringify(exportData).length });
            return exportData;
        } catch (error) {
            this.log('error', 'Export failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Import data from file
     */
    async importData(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (importData.data && this.generator) {
                this.generator.importData(importData.data);
            }
            
            if (importData.sessionHistory) {
                this.sessionHistory = importData.sessionHistory;
            }
            
            this.log('operation', 'Data imported', { 
                version: importData.version,
                dataSize: importData.data ? Object.keys(importData.data).length : 0
            });
            
            return importData;
        } catch (error) {
            this.log('error', 'Import failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get current system and performance information
     */
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            memory: this.getMemoryUsage(),
            timing: performance.timing ? {
                navigationStart: performance.timing.navigationStart,
                loadEventEnd: performance.timing.loadEventEnd
            } : null
        };
    }

    /**
     * Get memory usage information
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * Log operation with context
     */
    log(type, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            data,
            sessionId: this.currentSession.id
        };
        
        this.currentSession.operations.push(logEntry);
        
        if (this.debugMode || type === 'error') {
            console.log(`[${type.toUpperCase()}] ${message}`, data);
        }
    }

    /**
     * Get current session information
     */
    getSessionInfo() {
        return {
            current: this.currentSession,
            history: this.sessionHistory,
            debugMode: this.debugMode,
            components: {
                generator: !!this.generator,
                builder: !!this.builder,
                performanceRunner: !!this.performanceRunner
            }
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            renderStats: this.builder ? this.builder.getRenderStats() : null,
            generatorStats: this.generator ? this.generator.getStatistics() : null,
            systemInfo: this.getSystemInfo(),
            sessionOperations: this.currentSession.operations.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestDataManager;
}

// Global access for browser environment
if (typeof window !== 'undefined') {
    window.TestDataManager = TestDataManager;
}