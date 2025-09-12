// 状态持久化工具
import { StateCreator } from 'zustand';
import { PersistConfig } from '../types';

// 本地存储适配器
export class StorageAdapter {
  private storage: Storage;

  constructor(storage: 'localStorage' | 'sessionStorage' = 'localStorage') {
    this.storage = storage === 'localStorage' ? window.localStorage : window.sessionStorage;
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.warn('Failed to get item from storage:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set item to storage:', error);
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove item from storage:', error);
    }
  }
}

// 序列化工具
export class Serializer {
  static serialize(value: any): string {
    return JSON.stringify(value, (key, val) => {
      // 处理Set类型
      if (val instanceof Set) {
        return { __type: 'Set', value: Array.from(val) };
      }
      // 处理Map类型
      if (val instanceof Map) {
        return { __type: 'Map', value: Array.from(val.entries()) };
      }
      return val;
    });
  }

  static deserialize(value: string): any {
    return JSON.parse(value, (key, val) => {
      // 恢复Set类型
      if (val && val.__type === 'Set') {
        return new Set(val.value);
      }
      // 恢复Map类型
      if (val && val.__type === 'Map') {
        return new Map(val.value);
      }
      return val;
    });
  }
}

// 持久化中间件
export const createPersistMiddleware = <T>(
  config: PersistConfig,
  stateCreator: StateCreator<T>
) => {
  const adapter = new StorageAdapter(config.storage);
  
  return (set: any, get: any, api: any) => {
    const state = stateCreator(set, get, api);
    
    // 加载持久化状态
    const loadPersistedState = () => {
      try {
        const persistedData = adapter.getItem(config.name);
        if (persistedData) {
          const parsed = Serializer.deserialize(persistedData);
          const migratedState = config.migrate 
            ? config.migrate(parsed, config.version || 1)
            : parsed;
          
          // 部分状态恢复
          const stateToRestore = config.partialize 
            ? config.partialize(migratedState)
            : migratedState;
            
          set(stateToRestore);
        }
      } catch (error) {
        console.warn('Failed to load persisted state:', error);
      }
    };

    // 保存状态
    const saveState = () => {
      try {
        const currentState = get();
        const stateToPersist = config.partialize 
          ? config.partialize(currentState)
          : currentState;
        
        adapter.setItem(config.name, Serializer.serialize(stateToPersist));
      } catch (error) {
        console.warn('Failed to save state:', error);
      }
    };

    // 初始加载
    loadPersistedState();

    // 监听状态变化并保存
    const originalSet = set;
    const wrappedSet = (newState: any) => {
      originalSet(newState);
      saveState();
    };

    return {
      ...state,
      _set: wrappedSet,
      _clearPersistedState: () => {
        adapter.removeItem(config.name);
      }
    };
  };
};

// 状态版本迁移工具
export class StateMigration {
  static migrations = new Map<string, Map<number, (state: any) => any>>();

  static addMigration(storeName: string, version: number, migrationFn: (state: any) => any) {
    if (!this.migrations.has(storeName)) {
      this.migrations.set(storeName, new Map());
    }
    this.migrations.get(storeName)!.set(version, migrationFn);
  }

  static migrate(storeName: string, state: any, fromVersion: number, toVersion: number) {
    const storeMigrations = this.migrations.get(storeName);
    if (!storeMigrations) return state;

    let migratedState = state;
    for (let version = fromVersion + 1; version <= toVersion; version++) {
      const migration = storeMigrations.get(version);
      if (migration) {
        migratedState = migration(migratedState);
      }
    }
    return migratedState;
  }
}

// 预定义迁移
StateMigration.addMigration('userStore', 2, (state) => ({
  ...state,
  possessionAccounts: state.accounts || []
}));

StateMigration.addMigration('chatStore', 2, (state) => ({
  ...state,
  chats: state.chats.map((chat: any) => ({
    ...chat,
    settings: chat.settings || { notifications: true }
  }))
}));