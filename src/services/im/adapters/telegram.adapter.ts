// Telegram Platform Adapter
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { BaseIMAdapter } from './base.adapter.js';
import { 
  IMMessage, 
  IMUser, 
  IMChat, 
  PlatformType, 
  PlatformCredentials,
  ConnectionStatus,
  MessageType,
  WebhookEvent,
  ProxyRequest
} from '../../../types/im.types.js';

interface TelegramConfig {
  botToken: string;
  webhookSecret?: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_bot: boolean;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: any[];
  document?: any;
  audio?: any;
  video?: any;
}

export class TelegramAdapter extends BaseIMAdapter {
  private httpClient: AxiosInstance;
  private config?: TelegramConfig;
  private botInfo?: any;

  constructor() {
    super(PlatformType.TELEGRAM);
  }

  async authenticate(credentials: PlatformCredentials): Promise<boolean> {
    try {
      this.credentials = credentials;
      this.config = credentials.metadata as TelegramConfig;
      
      this.httpClient = axios.create({
        timeout: 10000,
        baseURL: `https://api.telegram.org/bot${this.config.botToken}`,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Verify bot token by getting bot info
      const response = await this.httpClient.get('/getMe');
      
      if (!response.data.ok) {
        throw new Error(`Telegram auth failed: ${response.data.description}`);
      }

      this.botInfo = response.data.result;
      this.setStatus(ConnectionStatus.CONNECTED);
      return true;
    } catch (error) {
      this.emitError(error as Error);
      return false;
    }
  }

  async connect(): Promise<void> {
    if (!this.credentials) {
      throw new Error('No credentials provided');
    }
    
    this.setStatus(ConnectionStatus.CONNECTING);
    await this.authenticate(this.credentials);
  }

  async disconnect(): Promise<void> {
    this.botInfo = undefined;
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  async sendMessage(message: Omit<IMMessage, 'id' | 'timestamp'>): Promise<IMMessage> {
    const telegramMessage = {
      chat_id: message.receiverId,
      text: message.content,
      parse_mode: 'HTML'
    };

    const response = await this.httpClient.post('/sendMessage', telegramMessage);

    if (!response.data.ok) {
      throw new Error(`Telegram send message failed: ${response.data.description}`);
    }

    const result = response.data.result;
    const sentMessage: IMMessage = {
      id: `telegram_${result.message_id}`,
      platformMessageId: result.message_id.toString(),
      platform: PlatformType.TELEGRAM,
      type: message.type,
      content: message.content,
      senderId: this.botInfo.id.toString(),
      receiverId: message.receiverId,
      chatId: result.chat.id.toString(),
      timestamp: new Date(result.date * 1000),
      metadata: message.metadata
    };

    this.emitMessage(sentMessage);
    return sentMessage;
  }

  async getMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<IMMessage[]> {
    // Telegram doesn't provide message history API for bots
    // Messages are typically stored when received via webhooks
    return [];
  }

  async getChats(): Promise<IMChat[]> {
    // Telegram bots can't get chat list directly
    // Chats are discovered when users interact with the bot
    return [];
  }

  async getUsers(chatId?: string): Promise<IMUser[]> {
    if (!chatId) {
      return [];
    }

    try {
      // For groups, get chat administrators
      const response = await this.httpClient.get('/getChatAdministrators', {
        params: { chat_id: chatId }
      });

      if (!response.data.ok) {
        return [];
      }

      const users: IMUser[] = response.data.result.map((member: any) => ({
        id: member.user.id.toString(),
        platformId: member.user.id.toString(),
        platform: PlatformType.TELEGRAM,
        username: member.user.username || member.user.id.toString(),
        displayName: `${member.user.first_name} ${member.user.last_name || ''}`.trim(),
        status: member.user.is_bot ? 'offline' : 'online'
      }));

      return users;
    } catch (error) {
      console.warn(`Failed to get users for chat ${chatId}:`, error);
      return [];
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    const update = event.data;
    
    // Verify webhook secret if configured
    if (this.config?.webhookSecret && event.signature) {
      if (!this.verifyWebhookSignature(JSON.stringify(update), event.signature)) {
        throw new Error('Invalid webhook signature');
      }
    }

    if (update.message) {
      const telegramMsg: TelegramMessage = update.message;
      
      const message: IMMessage = {
        id: `telegram_${telegramMsg.message_id}`,
        platformMessageId: telegramMsg.message_id.toString(),
        platform: PlatformType.TELEGRAM,
        type: this.determineMessageType(telegramMsg),
        content: this.extractMessageContent(telegramMsg),
        senderId: telegramMsg.from?.id.toString() || 'unknown',
        receiverId: this.botInfo.id.toString(),
        chatId: telegramMsg.chat.id.toString(),
        timestamp: new Date(telegramMsg.date * 1000),
        metadata: {
          chatType: telegramMsg.chat.type,
          chatTitle: telegramMsg.chat.title
        }
      };
      
      this.emitMessage(message);
    }
  }

  protected async handleProxyRequest(request: ProxyRequest): Promise<any> {
    switch (request.action) {
      case 'sendMessage':
        return await this.sendMessage(request.payload);
      case 'getUsers':
        return await this.getUsers(request.payload.chatId);
      case 'getChats':
        return await this.getChats();
      case 'getChatInfo':
        return await this.getChatInfo(request.payload.chatId);
      case 'setWebhook':
        return await this.setWebhook(request.payload.url);
      default:
        throw new Error(`Unsupported proxy action: ${request.action}`);
    }
  }

  protected async ping(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/getMe');
      return response.data.ok;
    } catch {
      return false;
    }
  }

  private async getChatInfo(chatId: string): Promise<any> {
    const response = await this.httpClient.get('/getChat', {
      params: { chat_id: chatId }
    });

    if (!response.data.ok) {
      throw new Error(`Get chat info failed: ${response.data.description}`);
    }

    return response.data.result;
  }

  async setWebhook(url: string): Promise<boolean> {
    const response = await this.httpClient.post('/setWebhook', {
      url: url,
      secret_token: this.config?.webhookSecret
    });

    return response.data.ok;
  }

  private verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.config?.webhookSecret) {
      return true; // No secret configured, skip verification
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  private determineMessageType(message: TelegramMessage): MessageType {
    if (message.photo) return MessageType.IMAGE;
    if (message.document) return MessageType.FILE;
    if (message.audio) return MessageType.AUDIO;
    if (message.video) return MessageType.VIDEO;
    return MessageType.TEXT;
  }

  private extractMessageContent(message: TelegramMessage): string {
    if (message.text) return message.text;
    if (message.photo) return '[Photo]';
    if (message.document) return `[Document: ${message.document.file_name || 'file'}]`;
    if (message.audio) return '[Audio]';
    if (message.video) return '[Video]';
    return '[Unknown message type]';
  }
}