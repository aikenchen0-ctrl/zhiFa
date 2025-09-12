// IM Platform Integration Types
export enum PlatformType {
  WECHAT = 'wechat',
  DINGTALK = 'dingtalk', 
  TELEGRAM = 'telegram',
  SLACK = 'slack',
  DISCORD = 'discord'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video',
  EMOJI = 'emoji',
  SYSTEM = 'system'
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface IMUser {
  id: string;
  platformId: string;
  platform: PlatformType;
  username: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

export interface IMMessage {
  id: string;
  platformMessageId: string;
  platform: PlatformType;
  type: MessageType;
  content: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  attachments?: IMAttachment[];
}

export interface IMAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface IMChat {
  id: string;
  platformChatId: string;
  platform: PlatformType;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  isActive: boolean;
  lastMessage?: IMMessage;
  metadata?: Record<string, any>;
}

export interface PlatformCredentials {
  platform: PlatformType;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  userId: string;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  platform: PlatformType;
  type: 'message' | 'user_status' | 'chat_update' | 'error';
  data: any;
  timestamp: Date;
  signature?: string;
}

export interface RateLimitConfig {
  platform: PlatformType;
  requests: number;
  windowMs: number;
  burst?: number;
}

export interface ProxyRequest {
  userId: string;
  platform: PlatformType;
  action: string;
  payload: any;
  metadata?: Record<string, any>;
}

export interface ProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
  rateLimitRemaining?: number;
}