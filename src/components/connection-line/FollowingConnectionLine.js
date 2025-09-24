import AnimationManager from '../../core/AnimationManager.js';
import PositionManager from '../../core/PositionManager.js';
import SVGPathCalculator from './SVGPathCalculator.js';

class FollowingConnectionLine {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            strokeWidth: 2,
            strokeColor: '#007AFF',
            cornerRadius: 8,
            horizontalOffset: 4,
            animationDuration: 150,
            enableSmoothing: true,
            enableAnimation: true,
            opacity: 0.8,
            ...options
        };
        
        this.animationManager = new AnimationManager({
            targetFPS: 120,
            adaptiveFrameRate: true
        });
        
        this.positionManager = new PositionManager(this.animationManager, {
            updateFrequency: 120,
            throttleAccountUpdates: true,
            debounceSessionDelay: 150
        });
        
        this.pathCalculator = new SVGPathCalculator({
            cornerRadius: this.options.cornerRadius,
            horizontalOffset: this.options.horizontalOffset
        });
        
        this.connections = new Map();
        this.svgElements = new Map();
        this.animatingPaths = new Map();
        
        this.setupSVGContainer();
        this.bindEvents();
        this.startPerformanceMonitoring();
    }

    setupSVGContainer() {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', 'connection-lines-svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.pointerEvents = 'none';
        this.svg.style.zIndex = '10';
        this.svg.style.overflow = 'visible';
        
        this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        this.svg.appendChild(this.defs);
        
        this.createGradients();
        this.createFilters();
        
        this.container.appendChild(this.svg);
        this.updateSVGSize();
    }

    createGradients() {
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'connectionGradient';
        gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', this.options.strokeColor);
        stop1.setAttribute('stop-opacity', '0.9');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', this.options.strokeColor);
        stop2.setAttribute('stop-opacity', '0.6');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        this.defs.appendChild(gradient);
    }

    createFilters() {
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.id = 'connectionGlow';
        filter.setAttribute('x', '-50%');
        filter.setAttribute('y', '-50%');
        filter.setAttribute('width', '200%');
        filter.setAttribute('height', '200%');
        
        const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        feGaussianBlur.setAttribute('stdDeviation', '2');
        feGaussianBlur.setAttribute('result', 'coloredBlur');
        
        const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');
        
        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        filter.appendChild(feGaussianBlur);
        filter.appendChild(feMerge);
        this.defs.appendChild(filter);
    }

    bindEvents() {
        this.positionManager.addListener(this.updateConnections.bind(this));
        
        window.addEventListener('resize', () => {
            this.updateSVGSize();
            this.redrawAllConnections();
        });
        
        this.connectionUpdateHandler = this.updateConnections.bind(this);
    }

    updateSVGSize() {
        const rect = this.container.getBoundingClientRect();
        this.svg.setAttribute('width', rect.width);
        this.svg.setAttribute('height', rect.height);
        this.svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }

    connectVirtualLists(accountList, sessionList, messageList) {
        accountList.setPositionUpdateCallback((positions, type) => {
            this.positionManager.handleAccountPositions(positions, type);
        });
        
        sessionList.setPositionUpdateCallback((positions, type) => {
            this.positionManager.handleSessionPositions(positions, type);
        });
        
        messageList.setPositionUpdateCallback((positions, type) => {
            this.positionManager.handleMessagePositions(positions, type);
        });
        
        accountList.onScrollStart = () => {
            this.positionManager.setScrollState('account', true);
        };
        
        accountList.onScrollEnd = () => {
            this.positionManager.setScrollState('account', false);
        };
        
        sessionList.onScrollStart = () => {
            this.positionManager.setScrollState('session', true);
            this.hideConnections();
        };
        
        sessionList.onScrollEnd = () => {
            this.positionManager.setScrollState('session', false);
            this.showConnections();
        };
    }

    updateConnections(connectionData, timestamp) {
        const activeConnections = new Set();
        
        connectionData.forEach(connection => {
            activeConnections.add(connection.id);
            
            if (connection.visible) {
                this.updateConnection(connection);
            } else {
                this.hideConnection(connection.id);
            }
        });
        
        this.connections.forEach((_, connectionId) => {
            if (!activeConnections.has(connectionId)) {
                this.removeConnection(connectionId);
            }
        });
    }

    updateConnection(connection) {
        const existingConnection = this.connections.get(connection.id);
        const path = this.calculatePath(connection);
        
        if (!existingConnection) {
            this.createConnection(connection, path);
        } else if (this.options.enableAnimation) {
            this.animateConnectionUpdate(connection, path);
        } else {
            this.updateConnectionPath(connection.id, path);
        }
        
        this.connections.set(connection.id, connection);
    }

    calculatePath(connection) {
        const { startPoint, endPoint, type } = connection;
        
        if (type === 'message-to-session') {
            return this.pathCalculator.calculateMessageToSessionPath(startPoint, endPoint);
        } else if (type === 'message-to-account') {
            return this.pathCalculator.calculateMessageToAccountPath(startPoint, endPoint);
        }
        
        return '';
    }

    createConnection(connection, path) {
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        // 临时修复：使用简单颜色替换渐变
        pathElement.setAttribute('stroke', '#007AFF');
        pathElement.setAttribute('stroke-width', '3'); // 加粗便于观察
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke-linecap', 'round');
        pathElement.setAttribute('stroke-linejoin', 'round');
        pathElement.setAttribute('opacity', '1'); // 完全不透明
        pathElement.setAttribute('class', `connection-line connection-${connection.type}`);
        
        if (this.options.enableAnimation) {
            // 临时禁用filter以避免干扰
            // pathElement.style.filter = 'url(#connectionGlow)';
            
            const length = pathElement.getTotalLength();
            pathElement.style.strokeDasharray = length;
            pathElement.style.strokeDashoffset = length;
            
            this.animationManager.add((deltaTime) => {
                const currentOffset = parseFloat(pathElement.style.strokeDashoffset);
                const newOffset = Math.max(0, currentOffset - (length / this.options.animationDuration) * deltaTime);
                pathElement.style.strokeDashoffset = newOffset;
                
                return newOffset > 0;
            }, { priority: 'high' });
        }
        
        this.svg.appendChild(pathElement);
        this.svgElements.set(connection.id, pathElement);
    }

    animateConnectionUpdate(connection, newPath) {
        const pathElement = this.svgElements.get(connection.id);
        if (!pathElement) return;
        
        const currentPath = pathElement.getAttribute('d');
        
        if (currentPath === newPath) return;
        
        if (this.animatingPaths.has(connection.id)) {
            this.animationManager.remove(this.animatingPaths.get(connection.id));
        }
        
        const startTime = performance.now();
        const duration = this.options.animationDuration;
        
        const animationId = this.animationManager.add((deltaTime, currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const interpolatedPath = this.pathCalculator.calculateAnimatedPath(
                currentPath, newPath, progress
            );
            
            pathElement.setAttribute('d', interpolatedPath);
            
            if (progress >= 1) {
                this.animatingPaths.delete(connection.id);
                return false;
            }
            
            return true;
        }, { priority: 'high' });
        
        this.animatingPaths.set(connection.id, animationId);
    }

    updateConnectionPath(connectionId, path) {
        const pathElement = this.svgElements.get(connectionId);
        if (pathElement) {
            pathElement.setAttribute('d', path);
        }
    }

    hideConnection(connectionId) {
        const pathElement = this.svgElements.get(connectionId);
        if (pathElement) {
            pathElement.style.opacity = '0';
        }
    }

    showConnection(connectionId) {
        const pathElement = this.svgElements.get(connectionId);
        if (pathElement) {
            pathElement.style.opacity = this.options.opacity;
        }
    }

    removeConnection(connectionId) {
        const pathElement = this.svgElements.get(connectionId);
        if (pathElement && pathElement.parentNode) {
            pathElement.parentNode.removeChild(pathElement);
        }
        
        this.svgElements.delete(connectionId);
        this.connections.delete(connectionId);
        
        if (this.animatingPaths.has(connectionId)) {
            this.animationManager.remove(this.animatingPaths.get(connectionId));
            this.animatingPaths.delete(connectionId);
        }
    }

    hideConnections() {
        this.svgElements.forEach(pathElement => {
            pathElement.style.opacity = '0';
        });
    }

    showConnections() {
        this.svgElements.forEach(pathElement => {
            pathElement.style.opacity = this.options.opacity;
        });
    }

    redrawAllConnections() {
        this.positionManager.updateConnections();
    }

    startPerformanceMonitoring() {
        this.performanceTimer = setInterval(() => {
            const animationStats = this.animationManager.getPerformanceStats();
            const positionStats = this.positionManager.getPerformanceStats();
            
            if (!animationStats.isPerformanceGood) {
                this.optimizePerformance();
            }
            
            if (this.options.debug) {
                console.log('Performance Stats:', {
                    animation: animationStats,
                    position: positionStats,
                    connections: this.connections.size
                });
            }
        }, 5000);
    }

    optimizePerformance() {
        this.positionManager.optimizePerformance();
        this.animationManager.adaptToPerformance();
        
        if (this.connections.size > 50) {
            this.options.enableAnimation = false;
            console.log('Disabled animations due to high connection count');
        }
    }

    getStats() {
        return {
            connections: this.connections.size,
            svgElements: this.svgElements.size,
            animatingPaths: this.animatingPaths.size,
            animation: this.animationManager.getPerformanceStats(),
            position: this.positionManager.getPerformanceStats()
        };
    }

    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.redrawAllConnections();
    }

    destroy() {
        clearInterval(this.performanceTimer);
        
        this.animationManager.destroy();
        this.positionManager.destroy();
        
        this.connections.clear();
        this.svgElements.clear();
        this.animatingPaths.clear();
        
        if (this.svg && this.svg.parentNode) {
            this.svg.parentNode.removeChild(this.svg);
        }
    }
}

export default FollowingConnectionLine;