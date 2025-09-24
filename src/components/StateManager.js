/**
 * StateManager - Global State Management and Component Communication
 * Features: Centralized state, event bus, component lifecycle, error handling
 */

import * as PIXI from 'pixi.js';

export class StateManager extends PIXI.EventEmitter {
    constructor() {
        super();
        
        // Global application state
        this.state = {
            ui: {
                screenWidth: 375,
                screenHeight: 812,
                theme: 'light',
                scale: 1.0,
                orientation: 'portrait'
            },
            session: {
                currentSessionId: null,
                sessionName: 'General Chat',
                userName: 'User',
                isConnected: true,
                participants: []
            },
            messages: {
                messages: [],
                unreadCount: 0,
                lastMessageId: null,
                isLoading: false
            },
            input: {
                isActive: false,
                text: '',
                voiceMode: false,
                attachments: []
            },
            menu: {
                isExpanded: false,
                selectedItem: null
            }
        };
        
        // Performance metrics
        this.metrics = {
            renderTime: 0,
            memoryUsage: 0,
            componentCount: 0,
            errorCount: 0,
            lastUpdate: Date.now()
        };
        
        // Error tracking
        this.errors = [];
        this.maxErrors = 50;
        
        // Component registry
        this.components = new Map();
        this.componentLifecycle = new Map();
        
        // Logger configuration
        this.logger = {
            level: 'info', // debug, info, warn, error
            enableConsole: true,
            enableStorage: false,
            maxLogs: 1000,
            logs: []
        };
        
        console.log('[StateManager] State management system initialized');
        
        this.init();
    }
    
    init() {
        try {
            this.setupErrorHandling();
            this.setupPerformanceMonitoring();
            this.setupStoragePersistence();
            
            // Listen for window resize
            if (typeof window !== 'undefined') {
                window.addEventListener('resize', this.handleResize.bind(this));
                window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
            }
            
            this.log('info', 'StateManager initialized successfully');
        } catch (error) {
            this.handleError('StateManager initialization failed', error);
        }
    }
    
    /**
     * Update state with validation and event emission
     * @param {string} path - State path (e.g., 'ui.theme' or 'messages.unreadCount')
     * @param {*} value - New value
     * @param {Object} options - Update options
     */
    setState(path, value, options = {}) {
        try {
            const oldValue = this.getState(path);
            
            // Set new value
            this.setNestedProperty(this.state, path, value);
            
            // Emit state change event
            this.emit('stateChange', {
                path,
                oldValue,
                newValue: value,
                timestamp: Date.now(),
                source: options.source || 'unknown'
            });
            
            // Emit specific path change event
            this.emit(`state:${path}`, value, oldValue);
            
            this.log('debug', `State updated: ${path}`, { oldValue, newValue: value });
            
            return true;
        } catch (error) {
            this.handleError(`Failed to update state at path: ${path}`, error);
            return false;
        }
    }
    
    /**
     * Get state value by path
     * @param {string} path - State path
     */
    getState(path) {
        try {
            return this.getNestedProperty(this.state, path);
        } catch (error) {
            this.handleError(`Failed to get state at path: ${path}`, error);
            return undefined;
        }
    }
    
    /**
     * Get entire state (read-only copy)
     */
    getAllState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    /**
     * Register a component for lifecycle management
     * @param {string} id - Component ID
     * @param {Object} component - Component instance
     * @param {Object} config - Component configuration
     */
    registerComponent(id, component, config = {}) {
        try {
            if (this.components.has(id)) {
                this.log('warn', `Component ${id} already registered, replacing`);
            }
            
            const componentInfo = {
                id,
                component,
                config: {
                    autoCleanup: config.autoCleanup !== false,
                    trackPerformance: config.trackPerformance !== false,
                    handleErrors: config.handleErrors !== false,
                    ...config
                },
                registeredAt: Date.now(),
                lastActive: Date.now(),
                errorCount: 0
            };
            
            this.components.set(id, componentInfo);
            this.componentLifecycle.set(id, {
                created: Date.now(),
                mounted: null,
                updated: [],
                destroyed: null
            });
            
            // Setup component error handling
            if (componentInfo.config.handleErrors && component.on) {
                component.on('error', (error) => {
                    this.handleComponentError(id, error);
                });
            }
            
            // Update metrics
            this.metrics.componentCount = this.components.size;
            
            this.emit('componentRegistered', { id, component, config: componentInfo.config });
            this.log('info', `Component registered: ${id}`);
            
            return true;
        } catch (error) {
            this.handleError(`Failed to register component: ${id}`, error);
            return false;
        }
    }
    
    /**
     * Unregister and cleanup component
     * @param {string} id - Component ID
     */
    unregisterComponent(id) {
        try {
            const componentInfo = this.components.get(id);
            if (!componentInfo) {
                this.log('warn', `Component ${id} not found for unregistration`);
                return false;
            }
            
            // Mark as destroyed in lifecycle
            const lifecycle = this.componentLifecycle.get(id);
            if (lifecycle) {
                lifecycle.destroyed = Date.now();
            }
            
            // Cleanup component if it has destroy method
            if (componentInfo.component && typeof componentInfo.component.destroy === 'function') {
                try {
                    componentInfo.component.destroy();
                } catch (error) {
                    this.log('error', `Error destroying component ${id}:`, error);
                }
            }
            
            // Remove from registry
            this.components.delete(id);
            
            // Update metrics
            this.metrics.componentCount = this.components.size;
            
            this.emit('componentUnregistered', { id });
            this.log('info', `Component unregistered: ${id}`);
            
            return true;
        } catch (error) {
            this.handleError(`Failed to unregister component: ${id}`, error);
            return false;
        }
    }
    
    /**
     * Get component by ID
     * @param {string} id - Component ID
     */
    getComponent(id) {
        const componentInfo = this.components.get(id);
        return componentInfo ? componentInfo.component : null;
    }
    
    /**
     * Get all registered components
     */
    getAllComponents() {
        const components = {};
        for (const [id, info] of this.components) {
            components[id] = info.component;
        }
        return components;
    }
    
    /**
     * Update component activity timestamp
     * @param {string} id - Component ID
     */
    updateComponentActivity(id) {
        const componentInfo = this.components.get(id);
        if (componentInfo) {
            componentInfo.lastActive = Date.now();
        }
    }
    
    /**
     * Handle component-specific errors
     * @param {string} componentId - Component ID
     * @param {Error} error - Error object
     */
    handleComponentError(componentId, error) {
        const componentInfo = this.components.get(componentId);
        if (componentInfo) {
            componentInfo.errorCount++;
        }
        
        this.handleError(`Component error in ${componentId}`, error, { componentId });
        this.emit('componentError', { componentId, error });
    }
    
    /**
     * Global error handling
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    handleError(message, error, context = {}) {
        const errorInfo = {
            message,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error,
            context,
            timestamp: Date.now(),
            id: Date.now().toString(36)
        };
        
        // Add to error log
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // Update metrics
        this.metrics.errorCount++;
        
        // Log error
        this.log('error', message, { error, context });
        
        // Emit error event
        this.emit('error', errorInfo);
        
        // Console output
        console.error(`[StateManager] ${message}`, error, context);
    }
    
    /**
     * Logging system
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {*} data - Additional data
     */
    log(level, message, data = null) {
        if (!this.shouldLog(level)) return;
        
        const logEntry = {
            level,
            message,
            data,
            timestamp: Date.now(),
            id: Date.now().toString(36)
        };
        
        // Add to log storage
        if (this.logger.enableStorage) {
            this.logger.logs.push(logEntry);
            if (this.logger.logs.length > this.logger.maxLogs) {
                this.logger.logs.shift();
            }
        }
        
        // Console output
        if (this.logger.enableConsole) {
            const consoleMethods = {
                debug: 'debug',
                info: 'info',
                warn: 'warn',
                error: 'error'
            };
            
            const method = consoleMethods[level] || 'log';
            const prefix = `[StateManager:${level.toUpperCase()}]`;
            
            if (data) {
                console[method](prefix, message, data);
            } else {
                console[method](prefix, message);
            }
        }
        
        // Emit log event
        this.emit('log', logEntry);
    }
    
    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = levels[this.logger.level] || 1;
        const requestLevel = levels[level] || 1;
        return requestLevel >= currentLevel;
    }
    
    /**
     * Performance monitoring
     */
    setupPerformanceMonitoring() {
        if (typeof performance !== 'undefined' && performance.memory) {
            setInterval(() => {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
                this.metrics.lastUpdate = Date.now();
            }, 5000);
        }
        
        // Track render time
        this.on('render', (renderTime) => {
            this.metrics.renderTime = renderTime;
        });
    }
    
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Global error handler
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handleError('Global JavaScript error', event.error, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.handleError('Unhandled Promise rejection', event.reason);
            });
        }
    }
    
    /**
     * Storage persistence
     */
    setupStoragePersistence() {
        if (typeof localStorage !== 'undefined') {
            // Load saved state
            try {
                const savedState = localStorage.getItem('pixiui-state');
                if (savedState) {
                    const parsed = JSON.parse(savedState);
                    this.state = { ...this.state, ...parsed };
                    this.log('info', 'State loaded from storage');
                }
            } catch (error) {
                this.log('warn', 'Failed to load state from storage:', error);
            }
            
            // Auto-save state periodically
            setInterval(() => {
                this.saveStateToStorage();
            }, 30000); // Every 30 seconds
        }
    }
    
    saveStateToStorage() {
        try {
            const stateToSave = {
                ui: this.state.ui,
                session: {
                    sessionName: this.state.session.sessionName,
                    userName: this.state.session.userName
                }
            };
            localStorage.setItem('pixiui-state', JSON.stringify(stateToSave));
            this.log('debug', 'State saved to storage');
        } catch (error) {
            this.log('warn', 'Failed to save state to storage:', error);
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (typeof window !== 'undefined') {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            
            this.setState('ui.screenWidth', newWidth);
            this.setState('ui.screenHeight', newHeight);
            
            this.emit('resize', { width: newWidth, height: newHeight });
        }
    }
    
    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        setTimeout(() => {
            this.handleResize();
            const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
            this.setState('ui.orientation', orientation);
            this.emit('orientationChange', { orientation });
        }, 100);
    }
    
    /**
     * Utility methods for nested object operations
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
    
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * Get error log
     */
    getErrors(limit = 10) {
        return this.errors.slice(-limit);
    }
    
    /**
     * Get component lifecycle info
     */
    getComponentLifecycle(id) {
        return this.componentLifecycle.get(id) || null;
    }
    
    /**
     * Get all logs
     */
    getLogs(level = null, limit = 50) {
        let logs = this.logger.logs;
        
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        
        return logs.slice(-limit);
    }
    
    /**
     * Clear errors and logs
     */
    clearLogs() {
        this.errors = [];
        this.logger.logs = [];
        this.metrics.errorCount = 0;
        this.log('info', 'Logs cleared');
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        try {
            // Save state before destroying
            this.saveStateToStorage();
            
            // Unregister all components
            for (const id of this.components.keys()) {
                this.unregisterComponent(id);
            }
            
            // Remove global event listeners
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', this.handleResize.bind(this));
                window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
            }
            
            // Clear all listeners
            this.removeAllListeners();
            
            this.log('info', 'StateManager destroyed');
        } catch (error) {
            console.error('[StateManager] Error during destruction:', error);
        }
    }
}

// Singleton instance
let stateManagerInstance = null;

export const getStateManager = () => {
    if (!stateManagerInstance) {
        stateManagerInstance = new StateManager();
    }
    return stateManagerInstance;
};

export default StateManager;