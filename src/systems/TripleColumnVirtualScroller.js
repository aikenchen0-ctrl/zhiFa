/**
 * 三列独立虚拟滚动系统
 * 专门为会话头像、消息气泡、账号头像三列布局优化
 * 支持差异化监听策略和高性能连接线渲染
 */

import PrecisionSVGPathCalculator from '../performance/PrecisionSVGPathCalculator.js';

export class TripleColumnVirtualScroller {
  constructor(config) {
    this.config = {
      // 三列配置
      columns: {
        conversation: {
          container: config.conversationContainer,
          itemHeight: config.conversationItemHeight || 60,
          bufferSize: config.conversationBufferSize || 5,
          monitoring: 'scroll-end' // 滚动结束时更新
        },
        messages: {
          container: config.messagesContainer,
          itemHeight: config.messageItemHeight || 80,
          bufferSize: config.messageBufferSize || 8,
          monitoring: 'natural' // 自然跟随
        },
        account: {
          container: config.accountContainer,
          itemHeight: config.accountItemHeight || 60,
          bufferSize: config.accountBufferSize || 5,
          monitoring: 'realtime', // 1ms实时监听
          realtimeInterval: 1
        }
      },
      
      // 连接线配置
      connectionContainer: config.connectionContainer,
      enableConnections: config.enableConnections !== false,
      
      // 性能配置
      targetFPS: config.targetFPS || 120,
      frameTimeTarget: 1000 / (config.targetFPS || 120),
      enableGPUAcceleration: config.enableGPUAcceleration !== false,
      enableMemoryOptimization: config.enableMemoryOptimization !== false
    };
    
    // 数据存储
    this.data = {
      conversations: [],
      messages: [],
      accounts: []
    };
    
    // 虚拟滚动器实例
    this.scrollers = {};
    
    // 连接线系统
    this.pathCalculator = new PrecisionSVGPathCalculator({
      cornerRadius: 12,
      horizontalOffset: 4,
      enableCaching: true,
      precisionDigits: 2
    });
    
    this.connections = new Map(); // 存储连接线元素
    
    // 性能监控
    this.performance = {
      frameTime: 0,
      fps: 0,
      memoryUsage: 0,
      connectionsRendered: 0,
      frameTimeHistory: [],
      lastFrameTime: performance.now()
    };
    
    // 监听器管理
    this.listeners = {
      conversation: null,
      messages: null,
      account: null
    };
    
    this.init();
  }

  /**
   * 初始化三列滚动系统
   */
  init() {
    console.log('🚀 初始化三列虚拟滚动系统...');
    
    // 初始化三个列的虚拟滚动器
    this.initColumnScrollers();
    
    // 设置差异化监听策略
    this.setupDifferentialMonitoring();
    
    // 初始化连接线系统
    this.initConnectionSystem();
    
    // 启动性能监控
    this.startPerformanceMonitoring();
    
    console.log('✅ 三列虚拟滚动系统初始化完成');
  }

  /**
   * 初始化三列滚动器
   */
  initColumnScrollers() {
    // 会话列滚动器
    this.scrollers.conversation = new ColumnVirtualScroller({
      container: this.config.columns.conversation.container,
      itemHeight: this.config.columns.conversation.itemHeight,
      bufferSize: this.config.columns.conversation.bufferSize,
      renderItem: (index, data) => this.renderConversationItem(index, data),
      onVisibilityChange: (items) => this.onConversationVisibilityChange(items)
    });
    
    // 消息列滚动器
    this.scrollers.messages = new ColumnVirtualScroller({
      container: this.config.columns.messages.container,
      itemHeight: this.config.columns.messages.itemHeight,
      bufferSize: this.config.columns.messages.bufferSize,
      renderItem: (index, data) => this.renderMessageItem(index, data),
      onVisibilityChange: (items) => this.onMessageVisibilityChange(items)
    });
    
    // 账号列滚动器
    this.scrollers.account = new ColumnVirtualScroller({
      container: this.config.columns.account.container,
      itemHeight: this.config.columns.account.itemHeight,
      bufferSize: this.config.columns.account.bufferSize,
      renderItem: (index, data) => this.renderAccountItem(index, data),
      onVisibilityChange: (items) => this.onAccountVisibilityChange(items)
    });
  }

  /**
   * 设置差异化监听策略
   */
  setupDifferentialMonitoring() {
    const { conversation, messages, account } = this.config.columns;
    
    // 会话列：滚动结束时更新（节省性能）
    if (conversation.monitoring === 'scroll-end') {
      this.setupScrollEndListener(this.scrollers.conversation, 'conversation');
    }
    
    // 消息列：自然跟随（正常监听）
    if (messages.monitoring === 'natural') {
      this.setupNaturalListener(this.scrollers.messages, 'messages');
    }
    
    // 账号列：1ms实时监听（最高精度）
    if (account.monitoring === 'realtime') {
      this.setupRealtimeListener(this.scrollers.account, 'account', account.realtimeInterval);
    }
  }

  /**
   * 滚动结束监听器
   */
  setupScrollEndListener(scroller, columnName) {
    let scrollTimeout;
    const scrollEndDelay = 150; // 滚动结束后150ms才触发更新
    
    scroller.container.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scroller.updateVisibleItems();
        this.updateConnectionsForColumn(columnName);
      }, scrollEndDelay);
    }, { passive: true });
  }

  /**
   * 自然跟随监听器
   */
  setupNaturalListener(scroller, columnName) {
    let ticking = false;
    
    scroller.container.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          scroller.updateVisibleItems();
          this.updateConnectionsForColumn(columnName);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /**
   * 实时监听器（1ms间隔）
   */
  setupRealtimeListener(scroller, columnName, interval) {
    let lastScrollTop = scroller.container.scrollTop;
    
    const realtimeUpdate = () => {
      const currentScrollTop = scroller.container.scrollTop;
      if (currentScrollTop !== lastScrollTop) {
        scroller.updateVisibleItems();
        this.updateConnectionsForColumn(columnName);
        lastScrollTop = currentScrollTop;
      }
    };
    
    // 高频率监听
    setInterval(realtimeUpdate, interval);
    
    // 同时保持requestAnimationFrame监听以确保平滑性
    this.setupNaturalListener(scroller, columnName);
  }

  /**
   * 初始化连接线系统
   */
  initConnectionSystem() {
    if (!this.config.enableConnections) return;
    
    // 创建SVG容器
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'connection-overlay';
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '10';
    
    // GPU加速
    if (this.config.enableGPUAcceleration) {
      svg.style.willChange = 'transform';
      svg.style.transform = 'translateZ(0)';
    }
    
    this.config.connectionContainer.appendChild(svg);
    this.connectionSvg = svg;
    
    // 预计算常用路径
    this.precomputeCommonPaths();
  }

  /**
   * 预计算常用路径
   */
  precomputeCommonPaths() {
    // 生成样本位置数据进行预计算
    const sampleMessagePositions = [
      { left: 100, right: 300, centerY: 50 },
      { left: 100, right: 300, centerY: 150 },
      { left: 100, right: 300, centerY: 250 }
    ];
    
    const sampleAvatarPositions = [
      { left: 50, right: 90, centerY: 30 },
      { left: 350, right: 390, centerY: 30 },
      { left: 50, right: 90, centerY: 180 },
      { left: 350, right: 390, centerY: 180 }
    ];
    
    this.pathCalculator.precomputeCommonPaths(sampleMessagePositions, sampleAvatarPositions);
  }

  /**
   * 渲染会话项目
   */
  renderConversationItem(index, data) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.setAttribute('data-conversation-id', data.id);
    item.setAttribute('data-index', index);
    
    const avatar = document.createElement('div');
    avatar.className = 'conversation-avatar';
    avatar.textContent = data.name.charAt(0);
    avatar.title = data.name;
    
    item.appendChild(avatar);
    
    // GPU优化
    if (this.config.enableGPUAcceleration) {
      item.style.willChange = 'transform';
      item.style.contain = 'layout style paint';
    }
    
    return item;
  }

  /**
   * 渲染消息项目
   */
  renderMessageItem(index, data) {
    const item = document.createElement('div');
    item.className = 'message-item';
    item.setAttribute('data-message-id', data.id);
    item.setAttribute('data-index', index);
    
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${data.fromAccount ? 'from-account' : 'from-conversation'}`;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = data.content;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = data.time;
    
    bubble.appendChild(content);
    bubble.appendChild(time);
    item.appendChild(bubble);
    
    // GPU优化
    if (this.config.enableGPUAcceleration) {
      item.style.willChange = 'transform';
      bubble.style.willChange = 'transform';
      item.style.contain = 'layout style paint';
    }
    
    return item;
  }

  /**
   * 渲染账号项目
   */
  renderAccountItem(index, data) {
    const item = document.createElement('div');
    item.className = 'account-item';
    item.setAttribute('data-account-id', data.id);
    item.setAttribute('data-index', index);
    
    const avatar = document.createElement('div');
    avatar.className = 'account-avatar';
    avatar.textContent = data.name.charAt(0);
    avatar.title = data.name;
    
    item.appendChild(avatar);
    
    // GPU优化
    if (this.config.enableGPUAcceleration) {
      item.style.willChange = 'transform';
      item.style.contain = 'layout style paint';
    }
    
    return item;
  }

  /**
   * 处理会话可见性变化
   */
  onConversationVisibilityChange(visibleItems) {
    // 会话列变化时，更新相关的连接线
    this.updateConnectionsForConversations(visibleItems);
  }

  /**
   * 处理消息可见性变化
   */
  onMessageVisibilityChange(visibleItems) {
    // 消息列变化时，需要更新所有连接线
    this.updateAllConnections(visibleItems);
  }

  /**
   * 处理账号可见性变化
   */
  onAccountVisibilityChange(visibleItems) {
    // 账号列变化时，更新相关的连接线
    this.updateConnectionsForAccounts(visibleItems);
  }

  /**
   * 更新特定列的连接线
   */
  updateConnectionsForColumn(columnName) {
    const frameStart = performance.now();
    
    if (columnName === 'messages') {
      this.updateAllConnections();
    } else if (columnName === 'conversation') {
      const visibleConversations = this.scrollers.conversation.getVisibleItems();
      this.updateConnectionsForConversations(visibleConversations);
    } else if (columnName === 'account') {
      const visibleAccounts = this.scrollers.account.getVisibleItems();
      this.updateConnectionsForAccounts(visibleAccounts);
    }
    
    const frameTime = performance.now() - frameStart;
    this.updatePerformanceMetrics(frameTime);
  }

  /**
   * 更新所有连接线
   */
  updateAllConnections(visibleMessages = null) {
    if (!this.config.enableConnections) return;
    
    const messages = visibleMessages || this.scrollers.messages.getVisibleItems();
    const visibleMessageIds = new Set();
    
    messages.forEach(messageData => {
      visibleMessageIds.add(messageData.id);
      
      const messageElement = document.querySelector(`[data-message-id="${messageData.id}"]`);
      if (!messageElement) return;
      
      const messagePos = this.getElementPosition(messageElement.querySelector('.message-bubble'));
      
      if (messageData.fromAccount) {
        // 账号头像发送的消息
        const accountElement = document.querySelector(`[data-account-id="${messageData.senderId}"]`);
        if (accountElement) {
          const avatarPos = this.getElementPosition(accountElement);
          this.updateConnectionLine(messageData.id, messagePos, avatarPos, true);
        }
      } else {
        // 会话头像发送的消息
        const conversationElement = document.querySelector(`[data-conversation-id="${messageData.senderId}"]`);
        if (conversationElement) {
          const avatarPos = this.getElementPosition(conversationElement);
          this.updateConnectionLine(messageData.id, messagePos, avatarPos, false);
        }
      }
    });
    
    // 清理不可见的连接线
    for (const [messageId, pathElement] of this.connections.entries()) {
      if (!visibleMessageIds.has(messageId)) {
        pathElement.remove();
        this.connections.delete(messageId);
      }
    }
    
    this.performance.connectionsRendered = this.connections.size;
  }

  /**
   * 更新单条连接线
   */
  updateConnectionLine(messageId, messagePos, avatarPos, isFromAccount) {
    let pathElement = this.connections.get(messageId);
    
    if (!pathElement) {
      pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.className = `connection-line ${isFromAccount ? 'from-account' : 'from-conversation'}`;
      pathElement.setAttribute('data-message-id', messageId);
      
      // 设置样式
      pathElement.style.stroke = isFromAccount ? '#007AFF' : '#34C759';
      pathElement.style.strokeWidth = '2';
      pathElement.style.fill = 'none';
      pathElement.style.opacity = '0.8';
      
      // GPU优化
      if (this.config.enableGPUAcceleration) {
        pathElement.style.willChange = 'd';
      }
      
      this.connectionSvg.appendChild(pathElement);
      this.connections.set(messageId, pathElement);
    }
    
    // 使用精确路径算法计算路径
    const pathData = this.pathCalculator.calculateConnectionPath(messagePos, avatarPos, isFromAccount);
    pathElement.setAttribute('d', pathData);
  }

  /**
   * 获取元素精确位置
   */
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    const containerRect = this.connectionSvg.getBoundingClientRect();
    
    return {
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      centerX: rect.left - containerRect.left + rect.width / 2,
      centerY: rect.top - containerRect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  }

  /**
   * 启动性能监控
   */
  startPerformanceMonitoring() {
    const monitorFrame = () => {
      const now = performance.now();
      const frameTime = now - this.performance.lastFrameTime;
      
      this.performance.frameTimeHistory.push(frameTime);
      if (this.performance.frameTimeHistory.length > 60) {
        this.performance.frameTimeHistory.shift();
      }
      
      // 计算平均帧时间和FPS
      const avgFrameTime = this.performance.frameTimeHistory.reduce((a, b) => a + b, 0) / this.performance.frameTimeHistory.length;
      this.performance.frameTime = avgFrameTime;
      this.performance.fps = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;
      
      // 内存使用统计
      if (performance.memory) {
        this.performance.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      }
      
      this.performance.lastFrameTime = now;
      requestAnimationFrame(monitorFrame);
    };
    
    requestAnimationFrame(monitorFrame);
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(connectionUpdateTime) {
    // 检查是否超出目标帧时间
    if (connectionUpdateTime > this.config.frameTimeTarget) {
      console.warn(`⚠️ 连接线更新超时: ${connectionUpdateTime.toFixed(2)}ms > ${this.config.frameTimeTarget.toFixed(2)}ms`);
      
      // 可以在这里触发降质优化
      this.triggerQualityOptimization();
    }
  }

  /**
   * 触发质量优化
   */
  triggerQualityOptimization() {
    // 降低连接线精度或减少缓冲区大小
    console.log('🔄 触发性能优化...');
    
    if (this.config.enableMemoryOptimization) {
      // 清理路径缓存
      this.pathCalculator.clearCache();
      
      // 减少缓冲区大小
      Object.values(this.scrollers).forEach(scroller => {
        if (scroller.bufferSize > 2) {
          scroller.bufferSize = Math.max(2, scroller.bufferSize - 1);
        }
      });
    }
  }

  /**
   * 设置数据
   */
  setData(data) {
    this.data = { ...data };
    
    // 更新各列数据
    if (this.scrollers.conversation) {
      this.scrollers.conversation.setData(data.conversations || []);
    }
    if (this.scrollers.messages) {
      this.scrollers.messages.setData(data.messages || []);
    }
    if (this.scrollers.account) {
      this.scrollers.account.setData(data.accounts || []);
    }
    
    // 重新计算连接线
    setTimeout(() => this.updateAllConnections(), 0);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      pathCalculatorStats: this.pathCalculator.getPerformanceStats(),
      scrollers: {
        conversation: this.scrollers.conversation?.getStats(),
        messages: this.scrollers.messages?.getStats(),
        account: this.scrollers.account?.getStats()
      }
    };
  }

  /**
   * 销毁实例
   */
  destroy() {
    // 清理滚动器
    Object.values(this.scrollers).forEach(scroller => {
      if (scroller.destroy) scroller.destroy();
    });
    
    // 清理连接线
    this.connections.forEach(pathElement => pathElement.remove());
    this.connections.clear();
    
    // 清理SVG容器
    if (this.connectionSvg) {
      this.connectionSvg.remove();
    }
    
    // 清理监听器
    Object.values(this.listeners).forEach(listener => {
      if (listener) {
        clearInterval(listener);
      }
    });
    
    console.log('🧹 三列虚拟滚动系统已销毁');
  }
}

/**
 * 单列虚拟滚动器
 */
class ColumnVirtualScroller {
  constructor(config) {
    this.container = config.container;
    this.itemHeight = config.itemHeight;
    this.bufferSize = config.bufferSize;
    this.renderItem = config.renderItem;
    this.onVisibilityChange = config.onVisibilityChange || (() => {});
    
    this.data = [];
    this.visibleItems = [];
    this.renderedElements = new Map();
    
    this.init();
  }

  init() {
    this.createVirtualContainer();
    this.bindEvents();
  }

  createVirtualContainer() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    // 创建内容容器
    this.contentContainer = document.createElement('div');
    this.contentContainer.style.position = 'relative';
    
    // 创建视窗容器
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.left = '0';
    this.viewport.style.right = '0';
    
    this.contentContainer.appendChild(this.viewport);
    this.container.appendChild(this.contentContainer);
  }

  bindEvents() {
    this.container.addEventListener('scroll', () => {
      this.updateVisibleItems();
    }, { passive: true });
  }

  updateVisibleItems() {
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    const endIndex = Math.min(
      this.data.length - 1,
      Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.bufferSize
    );
    
    // 更新视窗位置
    this.viewport.style.transform = `translateY(${startIndex * this.itemHeight}px)`;
    
    // 渲染可见项目
    this.renderVisibleItems(startIndex, endIndex);
    
    // 更新可见项目列表
    this.visibleItems = this.data.slice(startIndex, endIndex + 1);
    this.onVisibilityChange(this.visibleItems);
  }

  renderVisibleItems(startIndex, endIndex) {
    // 清空当前渲染
    this.viewport.innerHTML = '';
    this.renderedElements.clear();
    
    for (let i = startIndex; i <= endIndex && i < this.data.length; i++) {
      const itemData = this.data[i];
      const element = this.renderItem(i, itemData);
      
      element.style.position = 'absolute';
      element.style.top = `${(i - startIndex) * this.itemHeight}px`;
      element.style.left = '0';
      element.style.right = '0';
      element.style.height = `${this.itemHeight}px`;
      
      this.viewport.appendChild(element);
      this.renderedElements.set(itemData.id, element);
    }
  }

  setData(data) {
    this.data = data;
    
    // 更新容器高度
    this.contentContainer.style.height = `${data.length * this.itemHeight}px`;
    
    // 重新渲染
    this.updateVisibleItems();
  }

  getVisibleItems() {
    return this.visibleItems;
  }

  getStats() {
    return {
      totalItems: this.data.length,
      visibleItems: this.visibleItems.length,
      renderedElements: this.renderedElements.size,
      scrollTop: this.container.scrollTop,
      viewportHeight: this.container.clientHeight
    };
  }

  destroy() {
    this.renderedElements.clear();
    this.visibleItems = [];
    this.data = [];
  }
}

export default TripleColumnVirtualScroller;