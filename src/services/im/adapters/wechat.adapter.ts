// WeChat Platform Adapter
import axios, { AxiosInstance } from 'axios';
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

interface WeChatConfig {
  appId: string;
  appSecret: string;
  baseURL: string;
}

interface WeChatUser {
  openid: string;
  nickname: string;
  headimgurl?: string;
  unionid?: string;
}

interface WeChatMessage {
  msgid: string;
  content: string;
  msgtype: string;
  fromuser: string;
  touser: string;
  createtime: number;
}

export class WeChatAdapter extends BaseIMAdapter {
  private httpClient: AxiosInstance;
  private config?: WeChatConfig;
  private accessToken?: string;
  private tokenExpiresAt?: Date;

  constructor() {
    super(PlatformType.WECHAT);
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async authenticate(credentials: PlatformCredentials): Promise<boolean> {
    try {
      this.credentials = credentials;
      this.config = credentials.metadata as WeChatConfig;
      
      // Get access token
      const tokenResponse = await this.httpClient.get(
        `${this.config.baseURL}/cgi-bin/token`,
        {
          params: {
            grant_type: 'client_credential',
            appid: this.config.appId,
            secret: this.config.appSecret
          }
        }
      );

      if (tokenResponse.data.errcode) {
        throw new Error(`WeChat auth failed: ${tokenResponse.data.errmsg}`);
      }

      this.accessToken = tokenResponse.data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + tokenResponse.data.expires_in * 1000);
      
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
    this.accessToken = undefined;
    this.tokenExpiresAt = undefined;
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  async sendMessage(message: Omit<IMMessage, 'id' | 'timestamp'>): Promise<IMMessage> {
    await this.ensureValidToken();
    
    const wechatMessage = {
      touser: message.receiverId,
      msgtype: this.mapMessageType(message.type),
      text: {
        content: message.content
      }
    };

    const response = await this.httpClient.post(
      `${this.config!.baseURL}/cgi-bin/message/custom/send`,
      wechatMessage,
      {
        params: { access_token: this.accessToken }
      }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`WeChat send message failed: ${response.data.errmsg}`);
    }

    const sentMessage: IMMessage = {
      id: `wechat_${Date.now()}_${Math.random()}`,
      platformMessageId: response.data.msgid || `${Date.now()}`,
      platform: PlatformType.WECHAT,
      type: message.type,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      chatId: message.chatId,
      timestamp: new Date(),
      metadata: message.metadata
    };

    this.emitMessage(sentMessage);
    return sentMessage;
  }

  async getMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<IMMessage[]> {
    // WeChat doesn't provide direct message history API
    // This would need to be implemented through webhook storage
    return [];
  }

  async getChats(): Promise<IMChat[]> {
    await this.ensureValidToken();
    
    // Get user list as proxy for chats
    const response = await this.httpClient.get(
      `${this.config!.baseURL}/cgi-bin/user/get`,
      {
        params: { access_token: this.accessToken }
      }
    );

    if (response.data.errcode) {
      throw new Error(`WeChat get users failed: ${response.data.errmsg}`);
    }

    const chats: IMChat[] = response.data.data.openid.map((openid: string) => ({
      id: `wechat_chat_${openid}`,
      platformChatId: openid,
      platform: PlatformType.WECHAT,
      type: 'direct' as const,
      participants: [openid],
      isActive: true
    }));

    return chats;
  }

  async getUsers(chatId?: string): Promise<IMUser[]> {
    await this.ensureValidToken();
    
    const response = await this.httpClient.get(
      `${this.config!.baseURL}/cgi-bin/user/get`,
      {
        params: { access_token: this.accessToken }
      }
    );

    if (response.data.errcode) {
      throw new Error(`WeChat get users failed: ${response.data.errmsg}`);
    }

    const users: IMUser[] = [];
    
    // Get user info for each openid
    for (const openid of response.data.data.openid.slice(0, 20)) { // Limit to avoid rate limiting
      try {
        const userInfo = await this.getUserInfo(openid);
        users.push({
          id: openid,
          platformId: openid,
          platform: PlatformType.WECHAT,
          username: openid,
          displayName: userInfo.nickname || openid,
          avatar: userInfo.headimgurl,
          status: 'online'
        });
      } catch (error) {
        console.warn(`Failed to get user info for ${openid}:`, error);
      }
    }

    return users;
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    const data = event.data;
    
    if (data.MsgType === 'text') {
      const message: IMMessage = {
        id: `wechat_${data.MsgId}`,
        platformMessageId: data.MsgId,
        platform: PlatformType.WECHAT,
        type: MessageType.TEXT,
        content: data.Content,
        senderId: data.FromUserName,
        receiverId: data.ToUserName,
        chatId: `wechat_chat_${data.FromUserName}`,
        timestamp: new Date(data.CreateTime * 1000)
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
      default:
        throw new Error(`Unsupported proxy action: ${request.action}`);
    }
  }

  protected async ping(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || this.tokenExpiresAt <= new Date()) {
      if (!this.credentials) {
        throw new Error('No credentials available for token refresh');
      }
      await this.authenticate(this.credentials);
    }
  }

  private async getUserInfo(openid: string): Promise<WeChatUser> {
    const response = await this.httpClient.get(
      `${this.config!.baseURL}/cgi-bin/user/info`,
      {
        params: { 
          access_token: this.accessToken,
          openid: openid
        }
      }
    );

    if (response.data.errcode) {
      throw new Error(`WeChat get user info failed: ${response.data.errmsg}`);
    }

    return response.data;
  }

  private mapMessageType(type: MessageType): string {
    switch (type) {
      case MessageType.TEXT:
        return 'text';
      case MessageType.IMAGE:
        return 'image';
      case MessageType.AUDIO:
        return 'voice';
      case MessageType.VIDEO:
        return 'video';
      default:
        return 'text';
    }
  }
}