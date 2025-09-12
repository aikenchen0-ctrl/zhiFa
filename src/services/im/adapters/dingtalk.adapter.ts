// DingTalk Platform Adapter
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

interface DingTalkConfig {
  corpId: string;
  corpSecret: string;
  agentId: string;
  baseURL: string;
}

interface DingTalkUser {
  userid: string;
  name: string;
  avatar?: string;
  mobile?: string;
  email?: string;
}

export class DingTalkAdapter extends BaseIMAdapter {
  private httpClient: AxiosInstance;
  private config?: DingTalkConfig;
  private accessToken?: string;
  private tokenExpiresAt?: Date;

  constructor() {
    super(PlatformType.DINGTALK);
    this.httpClient = axios.create({
      timeout: 10000,
      baseURL: 'https://oapi.dingtalk.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async authenticate(credentials: PlatformCredentials): Promise<boolean> {
    try {
      this.credentials = credentials;
      this.config = credentials.metadata as DingTalkConfig;
      
      // Get access token
      const tokenResponse = await this.httpClient.get('/gettoken', {
        params: {
          corpid: this.config.corpId,
          corpsecret: this.config.corpSecret
        }
      });

      if (tokenResponse.data.errcode !== 0) {
        throw new Error(`DingTalk auth failed: ${tokenResponse.data.errmsg}`);
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
    
    const dingMessage = {
      agent_id: this.config!.agentId,
      userid_list: message.receiverId,
      msg: {
        msgtype: this.mapMessageType(message.type),
        text: {
          content: message.content
        }
      }
    };

    const response = await this.httpClient.post(
      '/topapi/message/corpconversation/asyncsend_v2',
      dingMessage,
      {
        params: { access_token: this.accessToken }
      }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`DingTalk send message failed: ${response.data.errmsg}`);
    }

    const sentMessage: IMMessage = {
      id: `dingtalk_${Date.now()}_${Math.random()}`,
      platformMessageId: response.data.task_id || `${Date.now()}`,
      platform: PlatformType.DINGTALK,
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
    // DingTalk doesn't provide direct message history API for most apps
    // This would need to be implemented through callback storage
    return [];
  }

  async getChats(): Promise<IMChat[]> {
    await this.ensureValidToken();
    
    // Get department users as proxy for chats
    const departments = await this.getDepartments();
    const chats: IMChat[] = [];

    for (const dept of departments.slice(0, 10)) { // Limit departments
      const users = await this.getDepartmentUsers(dept.id);
      if (users.length > 0) {
        chats.push({
          id: `dingtalk_dept_${dept.id}`,
          platformChatId: dept.id,
          platform: PlatformType.DINGTALK,
          type: 'group',
          name: dept.name,
          participants: users.map(u => u.userid),
          isActive: true
        });
      }
    }

    return chats;
  }

  async getUsers(chatId?: string): Promise<IMUser[]> {
    await this.ensureValidToken();
    
    if (chatId && chatId.startsWith('dingtalk_dept_')) {
      const deptId = chatId.replace('dingtalk_dept_', '');
      const dingUsers = await this.getDepartmentUsers(deptId);
      
      return dingUsers.map(user => ({
        id: user.userid,
        platformId: user.userid,
        platform: PlatformType.DINGTALK,
        username: user.userid,
        displayName: user.name,
        avatar: user.avatar,
        status: 'online'
      }));
    }

    // Get all users from root department
    const dingUsers = await this.getDepartmentUsers('1');
    
    return dingUsers.map(user => ({
      id: user.userid,
      platformId: user.userid,
      platform: PlatformType.DINGTALK,
      username: user.userid,
      displayName: user.name,
      avatar: user.avatar,
      status: 'online'
    }));
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    const data = event.data;
    
    // Verify signature
    if (event.signature && !this.verifySignature(data, event.signature)) {
      throw new Error('Invalid webhook signature');
    }

    if (data.msgtype === 'text') {
      const message: IMMessage = {
        id: `dingtalk_${data.msgId || Date.now()}`,
        platformMessageId: data.msgId || `${Date.now()}`,
        platform: PlatformType.DINGTALK,
        type: MessageType.TEXT,
        content: data.text?.content || data.content,
        senderId: data.senderStaffId || data.senderId,
        receiverId: data.chatbotUserId || 'bot',
        chatId: `dingtalk_conversation_${data.conversationId || data.chatId}`,
        timestamp: new Date(data.createAt || Date.now())
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
      case 'getUserInfo':
        return await this.getUserInfo(request.payload.userId);
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

  private async getDepartments(): Promise<any[]> {
    const response = await this.httpClient.post(
      '/topapi/v2/department/listsub',
      { dept_id: 1 },
      { params: { access_token: this.accessToken } }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`Get departments failed: ${response.data.errmsg}`);
    }

    return response.data.result || [];
  }

  private async getDepartmentUsers(deptId: string): Promise<DingTalkUser[]> {
    const response = await this.httpClient.post(
      '/topapi/user/simplelist',
      { 
        dept_id: parseInt(deptId),
        cursor: 0,
        size: 100
      },
      { params: { access_token: this.accessToken } }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`Get department users failed: ${response.data.errmsg}`);
    }

    return response.data.result?.list || [];
  }

  private async getUserInfo(userId: string): Promise<DingTalkUser> {
    const response = await this.httpClient.post(
      '/topapi/v2/user/get',
      { userid: userId },
      { params: { access_token: this.accessToken } }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`Get user info failed: ${response.data.errmsg}`);
    }

    return response.data.result;
  }

  private verifySignature(data: any, signature: string): boolean {
    // DingTalk signature verification logic
    const timestamp = data.timestamp || Date.now();
    const secret = this.config?.corpSecret || '';
    
    const stringToSign = `${timestamp}\n${secret}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(stringToSign)
      .digest('base64');
    
    return computedSignature === signature;
  }

  private mapMessageType(type: MessageType): string {
    switch (type) {
      case MessageType.TEXT:
        return 'text';
      case MessageType.IMAGE:
        return 'image';
      case MessageType.FILE:
        return 'file';
      case MessageType.AUDIO:
        return 'voice';
      case MessageType.VIDEO:
        return 'video';
      default:
        return 'text';
    }
  }
}