// 状态同步工具（多tab/iframe通信）
import { StateSync } from '../types';

export class StateSync {
  private channel: BroadcastChannel;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private instanceId: string;

  constructor(channelName: string = 'im-state-sync') {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    this.channel = new BroadcastChannel(channelName);
    this.setupListener();
  }

  private setupListener() {
    this.channel.addEventListener('message', (event) => {
      const { type, payload, source } = event.data as StateSync;
      
      // 忽略自己发送的消息
      if (source === this.instanceId) return;
      
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.forEach(listener => {
          try {
            listener(payload);
          } catch (error) {
            console.error('State sync listener error:', error);
          }
        });
      }
    });
  }

  // 广播状态变化
  broadcast(type: string, payload: any) {
    const message: StateSync = {
      type,
      payload,
      timestamp: Date.now(),
      source: this.instanceId
    };
    
    this.channel.postMessage(message);
  }

  // 订阅状态变化
  subscribe(type: string, listener: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // 返回取消订阅函数
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(listener);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  // 销毁同步器
  destroy() {
    this.channel.close();
    this.listeners.clear();
  }
}

// 状态同步中间件
export const createSyncMiddleware = (
  storeName: string,
  syncEvents: string[] = []
) => {
  const stateSync = new StateSync();
  
  return (stateCreator: any) => (set: any, get: any, api: any) => {
    const state = stateCreator(set, get, api);
    
    // 监听来自其他标签页的状态更新
    syncEvents.forEach(eventType => {
      stateSync.subscribe(`${storeName}:${eventType}`, (payload) => {
        set((prevState: any) => ({
          ...prevState,
          ...payload,
          lastUpdated: Date.now()
        }));
      });
    });

    // 包装set方法以广播变化
    const originalSet = set;
    const syncableSet = (newState: any, shouldSync = true) => {
      originalSet(newState);
      
      if (shouldSync && syncEvents.length > 0) {
        const currentState = get();
        stateSync.broadcast(`${storeName}:update`, {
          ...currentState,
          timestamp: Date.now()
        });
      }
    };

    return {
      ...state,
      _syncableSet: syncableSet,
      _stateSync: stateSync
    };
  };
};

// 跨框架通信（iframe）
export class IFrameSync {
  private messageHandlers = new Map<string, (data: any) => void>();
  private targetOrigin: string;

  constructor(targetOrigin: string = '*') {
    this.targetOrigin = targetOrigin;
    this.setupListener();
  }

  private setupListener() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type && event.data.type.startsWith('im-sync:')) {
        const type = event.data.type.replace('im-sync:', '');
        const handler = this.messageHandlers.get(type);
        if (handler) {
          handler(event.data.payload);
        }
      }
    });
  }

  // 发送消息到父窗口或子框架
  postMessage(type: string, payload: any, target: Window = window.parent) {
    target.postMessage({
      type: `im-sync:${type}`,
      payload,
      timestamp: Date.now()
    }, this.targetOrigin);
  }

  // 监听消息
  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  // 移除监听
  offMessage(type: string) {
    this.messageHandlers.delete(type);
  }
}

// 状态同步管理器
export class SyncManager {
  private static instance: SyncManager;
  private stateSync: StateSync;
  private iframeSync: IFrameSync;
  private stores = new Map<string, any>();

  private constructor() {
    this.stateSync = new StateSync();
    this.iframeSync = new IFrameSync();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  // 注册store
  registerStore(name: string, store: any) {
    this.stores.set(name, store);
  }

  // 同步所有stores
  syncAll() {
    this.stores.forEach((store, name) => {
      if (store._stateSync) {
        const state = store.getState();
        store._stateSync.broadcast(`${name}:sync`, state);
      }
    });
  }

  // 清理所有同步
  cleanup() {
    this.stateSync.destroy();
    this.stores.clear();
  }
}