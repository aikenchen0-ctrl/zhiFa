// Base IM Platform Adapter
import { EventEmitter } from 'events';
import { 
  IMMessage, 
  IMUser, 
  IMChat, 
  PlatformType, 
  PlatformCredentials,
  ConnectionStatus,
  WebhookEvent,
  ProxyRequest,
  ProxyResponse
} from '../../../types/im.types.js';

export abstract class BaseIMAdapter extends EventEmitter {
  protected platform: PlatformType;
  protected credentials?: PlatformCredentials;
  protected status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  protected rateLimitRemaining: number = 0;

  constructor(platform: PlatformType) {
    super();
    this.platform = platform;
  }

  // Abstract methods that each platform must implement
  abstract authenticate(credentials: PlatformCredentials): Promise<boolean>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendMessage(message: Omit<IMMessage, 'id' | 'timestamp'>): Promise<IMMessage>;
  abstract getMessages(chatId: string, limit?: number, offset?: number): Promise<IMMessage[]>;
  abstract getChats(): Promise<IMChat[]>;
  abstract getUsers(chatId?: string): Promise<IMUser[]>;
  abstract handleWebhook(event: WebhookEvent): Promise<void>;
  
  // Common functionality
  getPlatform(): PlatformType {
    return this.platform;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  getRateLimitRemaining(): number {
    return this.rateLimitRemaining;
  }

  protected setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('statusChange', status);
    }
  }

  protected updateRateLimit(remaining: number): void {
    this.rateLimitRemaining = remaining;
    this.emit('rateLimitUpdate', remaining);
  }

  protected emitMessage(message: IMMessage): void {
    this.emit('message', message);
  }

  protected emitError(error: Error): void {
    this.emit('error', error);
    this.setStatus(ConnectionStatus.ERROR);
  }

  // Proxy request handler for account masquerading
  async executeProxyRequest(request: ProxyRequest): Promise<ProxyResponse> {
    try {
      const result = await this.handleProxyRequest(request);
      return {
        success: true,
        data: result,
        timestamp: new Date(),
        rateLimitRemaining: this.rateLimitRemaining
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        rateLimitRemaining: this.rateLimitRemaining
      };
    }
  }

  protected abstract handleProxyRequest(request: ProxyRequest): Promise<any>;

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      return await this.ping();
    } catch (error) {
      return false;
    }
  }

  protected abstract ping(): Promise<boolean>;

  // Cleanup resources
  async cleanup(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }
}

// Adapter Factory
export class AdapterFactory {
  private static adapters = new Map<PlatformType, new() => BaseIMAdapter>();

  static register(platform: PlatformType, adapterClass: new() => BaseIMAdapter): void {
    this.adapters.set(platform, adapterClass);
  }

  static create(platform: PlatformType): BaseIMAdapter {
    const AdapterClass = this.adapters.get(platform);
    if (!AdapterClass) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }
    return new AdapterClass();
  }

  static getSupportedPlatforms(): PlatformType[] {
    return Array.from(this.adapters.keys());
  }
}