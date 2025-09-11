/**
 * Web Workers Integration for Mobile Overlay Systems
 * Web Workers在移动端蒙层系统中的应用和集成方案
 */

// Web Worker工厂类
class WebWorkerFactory {
  constructor() {
    this.workers = new Map();
    this.workerScripts = new Map();
    this.maxWorkers = navigator.hardwareConcurrency || 4;
  }

  // 创建Worker脚本
  createWorkerScript(name, workerCode) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.workerScripts.set(name, workerUrl);
    return workerUrl;
  }

  // 获取或创建Worker
  getWorker(name) {
    if (!this.workers.has(name)) {
      const scriptUrl = this.workerScripts.get(name);
      if (!scriptUrl) {
        throw new Error(`Worker script '${name}' not found`);
      }
      
      const worker = new Worker(scriptUrl);
      this.workers.set(name, worker);
      
      // 错误处理
      worker.onerror = (error) => {
        console.error(`Worker '${name}' error:`, error);
      };
    }
    
    return this.workers.get(name);
  }

  // 销毁Worker
  terminateWorker(name) {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
      
      const scriptUrl = this.workerScripts.get(name);
      if (scriptUrl) {
        URL.revokeObjectURL(scriptUrl);
        this.workerScripts.delete(name);
      }
    }
  }

  // 销毁所有Workers
  terminateAll() {
    this.workers.forEach((worker, name) => {
      this.terminateWorker(name);
    });
  }
}

// 数据处理Worker脚本
const DATA_PROCESSING_WORKER = `
// Data processing worker for overlay systems
class DataProcessor {
  constructor() {
    this.cache = new Map();
  }

  // 处理大量列表数据
  processListData(data, filters = {}) {
    const startTime = performance.now();
    
    let result = data;
    
    // 应用过滤器
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(item => 
        JSON.stringify(item).toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.category) {
      result = result.filter(item => item.category === filters.category);
    }
    
    // 排序
    if (filters.sortBy) {
      result.sort((a, b) => {
        const aVal = a[filters.sortBy];
        const bVal = b[filters.sortBy];
        
        if (typeof aVal === 'string') {
          return filters.sortOrder === 'desc' 
            ? bVal.localeCompare(aVal)
            : aVal.localeCompare(bVal);
        }
        
        return filters.sortOrder === 'desc' 
          ? bVal - aVal 
          : aVal - bVal;
      });
    }
    
    const endTime = performance.now();
    
    return {
      data: result,
      processTime: endTime - startTime,
      originalCount: data.length,
      filteredCount: result.length
    };
  }

  // 图片预处理
  processImageData(imageData, options = {}) {
    const { width, height, quality = 0.8 } = options;
    
    // 在Worker中无法直接操作Canvas，但可以处理ImageData
    // 这里模拟图片处理逻辑
    return {
      processed: true,
      width,
      height,
      quality,
      size: imageData.length
    };
  }

  // 缓存管理
  manageCache(key, data, ttl = 300000) { // 5分钟TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // 清理过期缓存
    this.cleanExpiredCache();
  }

  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const processor = new DataProcessor();

// 监听主线程消息
self.onmessage = function(e) {
  const { id, type, payload } = e.data;
  let result;
  
  try {
    switch (type) {
      case 'PROCESS_LIST':
        result = processor.processListData(payload.data, payload.filters);
        break;
        
      case 'PROCESS_IMAGE':
        result = processor.processImageData(payload.imageData, payload.options);
        break;
        
      case 'CACHE_SET':
        processor.manageCache(payload.key, payload.data, payload.ttl);
        result = { success: true };
        break;
        
      case 'CACHE_GET':
        result = processor.getFromCache(payload.key);
        break;
        
      case 'CACHE_CLEAN':
        processor.cleanExpiredCache();
        result = { cleaned: true };
        break;
        
      default:
        throw new Error(\`Unknown message type: \${type}\`);
    }
    
    // 发送结果回主线程
    self.postMessage({
      id,
      success: true,
      result
    });
    
  } catch (error) {
    // 发送错误回主线程
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};
`;

// 计算密集型Worker脚本
const COMPUTATION_WORKER = `
// Computation worker for complex calculations
class ComputationEngine {
  constructor() {
    this.algorithms = {
      fibonacci: this.fibonacci.bind(this),
      prime: this.isPrime.bind(this),
      sort: this.quickSort.bind(this),
      search: this.binarySearch.bind(this)
    };
  }

  fibonacci(n) {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  isPrime(num) {
    if (num < 2) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
      if (num % i === 0) return false;
    }
    return true;
  }

  quickSort(arr) {
    if (arr.length <= 1) return arr;
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);
    return [...this.quickSort(left), ...middle, ...this.quickSort(right)];
  }

  binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] === target) return mid;
      if (arr[mid] < target) left = mid + 1;
      else right = mid - 1;
    }
    return -1;
  }

  // 批量计算
  batchCalculate(operations) {
    const results = [];
    const startTime = performance.now();
    
    for (const operation of operations) {
      const { algorithm, params } = operation;
      const algorithmFn = this.algorithms[algorithm];
      
      if (!algorithmFn) {
        results.push({ error: \`Unknown algorithm: \${algorithm}\` });
        continue;
      }
      
      try {
        const result = algorithmFn(...params);
        results.push({ result });
      } catch (error) {
        results.push({ error: error.message });
      }
    }
    
    const endTime = performance.now();
    
    return {
      results,
      totalTime: endTime - startTime,
      operationCount: operations.length
    };
  }
}

const engine = new ComputationEngine();

self.onmessage = function(e) {
  const { id, type, payload } = e.data;
  let result;
  
  try {
    switch (type) {
      case 'CALCULATE':
        const { algorithm, params } = payload;
        const algorithmFn = engine.algorithms[algorithm];
        if (!algorithmFn) {
          throw new Error(\`Unknown algorithm: \${algorithm}\`);
        }
        result = algorithmFn(...params);
        break;
        
      case 'BATCH_CALCULATE':
        result = engine.batchCalculate(payload.operations);
        break;
        
      default:
        throw new Error(\`Unknown message type: \${type}\`);
    }
    
    self.postMessage({
      id,
      success: true,
      result
    });
    
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};
`;

// Worker管理器
class WorkerManager {
  constructor() {
    this.factory = new WebWorkerFactory();
    this.messageId = 0;
    this.pendingMessages = new Map();
    
    this.init();
  }

  init() {
    // 注册Worker脚本
    this.factory.createWorkerScript('dataProcessor', DATA_PROCESSING_WORKER);
    this.factory.createWorkerScript('computationEngine', COMPUTATION_WORKER);
  }

  // 发送消息到Worker
  sendMessage(workerName, type, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const worker = this.factory.getWorker(workerName);
      
      // 存储待处理的Promise
      this.pendingMessages.set(id, { resolve, reject });
      
      // 设置消息处理器
      const handleMessage = (e) => {
        const { id: responseId, success, result, error } = e.data;
        
        if (responseId === id) {
          worker.removeEventListener('message', handleMessage);
          const pending = this.pendingMessages.get(id);
          
          if (pending) {
            this.pendingMessages.delete(id);
            
            if (success) {
              pending.resolve(result);
            } else {
              pending.reject(new Error(error));
            }
          }
        }
      };
      
      worker.addEventListener('message', handleMessage);
      
      // 发送消息
      worker.postMessage({ id, type, payload });
      
      // 设置超时
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          worker.removeEventListener('message', handleMessage);
          this.pendingMessages.delete(id);
          reject(new Error('Worker operation timeout'));
        }
      }, 30000); // 30秒超时
    });
  }

  // 数据处理方法
  async processListData(data, filters) {
    return this.sendMessage('dataProcessor', 'PROCESS_LIST', { data, filters });
  }

  async processImageData(imageData, options) {
    return this.sendMessage('dataProcessor', 'PROCESS_IMAGE', { imageData, options });
  }

  async setCacheData(key, data, ttl) {
    return this.sendMessage('dataProcessor', 'CACHE_SET', { key, data, ttl });
  }

  async getCacheData(key) {
    return this.sendMessage('dataProcessor', 'CACHE_GET', { key });
  }

  // 计算方法
  async calculate(algorithm, params) {
    return this.sendMessage('computationEngine', 'CALCULATE', { algorithm, params });
  }

  async batchCalculate(operations) {
    return this.sendMessage('computationEngine', 'BATCH_CALCULATE', { operations });
  }

  // 销毁所有Workers
  destroy() {
    this.factory.terminateAll();
    this.pendingMessages.clear();
  }
}

// 移动端优化的Worker使用策略
const MOBILE_WORKER_STRATEGIES = {
  dataProcessing: {
    whenToUse: [
      'List data > 1000 items',
      'Complex filtering/sorting',
      'JSON parsing > 1MB',
      'Real-time search'
    ],
    benefits: [
      'Prevents UI blocking',
      'Better scrolling performance',
      'Responsive user interactions'
    ],
    limitations: [
      'Memory overhead',
      'Message passing cost',
      'Limited mobile CPU cores'
    ]
  },
  
  imageProcessing: {
    whenToUse: [
      'Image resizing/compression',
      'Batch image operations',
      'Canvas computations'
    ],
    benefits: [
      'Offload intensive operations',
      'Maintain 60fps animations',
      'Better battery life'
    ],
    limitations: [
      'No direct DOM access',
      'Limited Canvas API support',
      'Data transfer overhead'
    ]
  },
  
  backgroundTasks: {
    whenToUse: [
      'Periodic data sync',
      'Cache management',
      'Analytics processing',
      'Background calculations'
    ],
    benefits: [
      'App remains responsive',
      'Better perceived performance',
      'Efficient resource usage'
    ],
    limitations: [
      'Limited API access',
      'Browser throttling',
      'Battery impact on mobile'
    ]
  }
};

// 使用示例和最佳实践
const WORKER_BEST_PRACTICES = {
  dos: [
    'Use for CPU-intensive tasks > 16ms',
    'Minimize data transfer between threads',
    'Implement proper error handling',
    'Clean up workers when not needed',
    'Use transferable objects for large data',
    'Consider mobile device limitations'
  ],
  
  donts: [
    'Don\'t create too many workers on mobile',
    'Don\'t pass DOM elements to workers',
    'Don\'t use for simple operations',
    'Don\'t ignore browser support',
    'Don\'t forget fallback strategies'
  ],
  
  mobileOptimizations: [
    'Limit concurrent workers to CPU cores / 2',
    'Use smaller data chunks for processing',
    'Implement progressive loading patterns',
    'Monitor battery usage impact',
    'Consider thermal throttling effects'
  ]
};

export {
  WebWorkerFactory,
  WorkerManager,
  DATA_PROCESSING_WORKER,
  COMPUTATION_WORKER,
  MOBILE_WORKER_STRATEGIES,
  WORKER_BEST_PRACTICES
};