// 通用状态类型定义
export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

// 用户相关类型
export interface User extends BaseEntity {
  username: string;
  nickname: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  lastSeenAt: number;
}

export interface PossessionAccount extends BaseEntity {
  userId: string;
  accountName: string;
  accountType: 'wechat' | 'qq' | 'telegram' | 'discord' | 'other';
  isActive: boolean;
  permissions: string[];
}

// 消息相关类型
export interface Message extends BaseEntity {
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';
  replyToId?: string;
  isRead: boolean;
  isSelected: boolean;
  metadata?: Record<string, any>;
}

export interface Chat extends BaseEntity {
  name: string;
  type: 'private' | 'group' | 'channel';
  participants: string[];
  lastMessageId?: string;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  settings: ChatSettings;
}

export interface ChatSettings {
  notifications: boolean;
  muteUntil?: number;
  theme?: string;
}

// UI状态类型
export interface UIState {
  // 输入框状态
  activeInputs: Set<string>;
  inputContent: Record<string, string>;
  
  // 弹出层状态
  modals: {
    visible: Record<string, boolean>;
    data: Record<string, any>;
  };
  
  // 滚动位置
  scrollPositions: Record<string, number>;
  
  // 选择状态
  selectedItems: {
    messages: Set<string>;
    chats: Set<string>;
  };
  
  // 多选模式
  selectionMode: boolean;
}

// 连接线相关类型
export interface Connection extends BaseEntity {
  fromId: string;
  toId: string;
  type: 'chat' | 'workflow' | 'user';
  style: ConnectionStyle;
  isVisible: boolean;
}

export interface ConnectionStyle {
  color: string;
  width: number;
  dashArray?: string;
  opacity: number;
}

export interface ConnectionRenderParams {
  svg: {
    width: number;
    height: number;
    viewBox: string;
  };
  connections: Connection[];
  positions: Record<string, { x: number; y: number }>;
}

// 工作流相关类型
export interface WorkflowIcon extends BaseEntity {
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  state: WorkflowIconState;
  config: Record<string, any>;
}

export interface WorkflowIconState {
  isActive: boolean;
  isRunning: boolean;
  isCompleted: boolean;
  hasError: boolean;
  progress?: number;
  status: 'idle' | 'running' | 'success' | 'error' | 'paused';
}

// Store 基础接口
export interface BaseStore {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

// 异步操作状态
export interface AsyncState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

// 分页状态
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// 筛选状态
export interface FilterState {
  query: string;
  tags: string[];
  dateRange?: [number, number];
  type?: string;
}

// 持久化配置
export interface PersistConfig {
  name: string;
  storage: 'localStorage' | 'sessionStorage';
  partialize?: (state: any) => Partial<any>;
  migrate?: (persistedState: unknown, version: number) => any;
  version?: number;
}

// 状态同步事件
export interface StateSync {
  type: string;
  payload: any;
  timestamp: number;
  source: string;
}

// 性能监控
export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  subscriptionCount: number;
}