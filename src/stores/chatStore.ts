// 会话和消息状态管理
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Chat, Message, BaseStore, AsyncState, PaginationState, FilterState } from './types';
import { createPersistMiddleware } from './utils/persistence';
import { createSyncMiddleware } from './utils/sync';

interface ChatState extends BaseStore {
  // 会话列表
  chats: Chat[];
  
  // 当前活跃会话
  activeChat: Chat | null;
  
  // 消息存储 (chatId -> messages)
  messages: Record<string, Message[]>;
  
  // 选中的消息
  selectedMessages: Set<string>;
  
  // 消息多选模式
  selectionMode: boolean;
  
  // 分页状态
  messagePagination: Record<string, PaginationState>;
  
  // 筛选状态
  chatFilter: FilterState;
  messageFilter: FilterState;
  
  // 异步操作状态
  loadChatsState: AsyncState;
  loadMessagesState: AsyncState;
  sendMessageState: AsyncState;
  
  // 输入状态
  draftMessages: Record<string, string>;
  
  // 未读计数
  totalUnreadCount: number;
}

interface ChatActions {
  // 会话管理
  loadChats: () => Promise<void>;
  createChat: (chatData: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Chat>;
  updateChat: (chatId: string, updates: Partial<Chat>) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string, isPinned: boolean) => Promise<void>;
  
  // 会话切换
  setActiveChat: (chatId: string | null) => void;
  
  // 消息管理
  loadMessages: (chatId: string, page?: number) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: Message['type']) => Promise<void>;
  replyToMessage: (chatId: string, content: string, replyToId: string) => Promise<void>;
  updateMessage: (messageId: string, updates: Partial<Message>) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => void;
  markAllMessagesAsRead: (chatId: string) => void;
  
  // 消息选择
  toggleMessageSelection: (messageId: string) => void;
  selectAllMessages: (chatId: string) => void;
  clearMessageSelection: () => void;
  setSelectionMode: (enabled: boolean) => void;
  deleteSelectedMessages: () => Promise<void>;
  
  // 草稿管理
  updateDraft: (chatId: string, content: string) => void;
  clearDraft: (chatId: string) => void;
  
  // 筛选和搜索
  setChatFilter: (filter: Partial<FilterState>) => void;
  setMessageFilter: (filter: Partial<FilterState>) => void;
  searchMessages: (query: string, chatId?: string) => Promise<Message[]>;
  
  // 状态重置
  resetChatState: () => void;
  
  // 选择器
  getChat: (chatId: string) => Chat | undefined;
  getChatMessages: (chatId: string) => Message[];
  getUnreadCount: (chatId?: string) => number;
  getSelectedMessages: () => Message[];
}

type ChatStore = ChatState & ChatActions;

// 初始状态
const initialState: ChatState = {
  chats: [],
  activeChat: null,
  messages: {},
  selectedMessages: new Set(),
  selectionMode: false,
  messagePagination: {},
  chatFilter: { query: '', tags: [] },
  messageFilter: { query: '', tags: [] },
  loadChatsState: { loading: false, error: null, success: false },
  loadMessagesState: { loading: false, error: null, success: false },
  sendMessageState: { loading: false, error: null, success: false },
  draftMessages: {},
  totalUnreadCount: 0,
  isLoading: false,
  error: null,
  lastUpdated: 0,
};

// API 模拟服务
class ChatApiService {
  static async fetchChats(): Promise<Chat[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return [
      {
        id: 'chat_1',
        name: '团队讨论组',
        type: 'group',
        participants: ['user_1', 'user_2', 'user_3'],
        lastMessageId: 'msg_3',
        unreadCount: 5,
        isArchived: false,
        isPinned: true,
        settings: { notifications: true },
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
      },
      {
        id: 'chat_2',
        name: '客户支持',
        type: 'private',
        participants: ['user_1', 'customer_1'],
        lastMessageId: 'msg_6',
        unreadCount: 0,
        isArchived: false,
        isPinned: false,
        settings: { notifications: true },
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 7200000,
      },
    ];
  }

  static async fetchMessages(chatId: string, page: number = 1, pageSize: number = 50): Promise<{
    messages: Message[];
    total: number;
    hasMore: boolean;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockMessages: Message[] = [
      {
        id: 'msg_1',
        chatId,
        senderId: 'user_2',
        content: '大家好，今天的会议准备得怎么样了？',
        type: 'text',
        isRead: true,
        isSelected: false,
        createdAt: Date.now() - 7200000,
        updatedAt: Date.now() - 7200000,
      },
      {
        id: 'msg_2',
        chatId,
        senderId: 'user_1',
        content: '我这边已经准备好了PPT，等下发给大家看看',
        type: 'text',
        isRead: true,
        isSelected: false,
        createdAt: Date.now() - 6000000,
        updatedAt: Date.now() - 6000000,
      },
      {
        id: 'msg_3',
        chatId,
        senderId: 'user_3',
        content: '收到，我负责的数据分析报告也完成了',
        type: 'text',
        replyToId: 'msg_2',
        isRead: false,
        isSelected: false,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
    ];

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMessages = mockMessages.slice(startIndex, endIndex);

    return {
      messages: paginatedMessages,
      total: mockMessages.length,
      hasMore: endIndex < mockMessages.length,
    };
  }

  static async sendMessage(chatId: string, content: string, type: Message['type'] = 'text'): Promise<Message> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      chatId,
      senderId: 'current_user',
      content,
      type,
      isRead: true,
      isSelected: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  static async searchMessages(query: string, chatId?: string): Promise<Message[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return []; // 返回搜索结果
  }
}

// 创建store
export const useChatStore = create<ChatStore>()(
  subscribeWithSelector(
    createSyncMiddleware('chatStore', ['chats', 'activeChat', 'messages'])(
      createPersistMiddleware(
        {
          name: 'im-chat-store',
          storage: 'localStorage',
          version: 2,
          partialize: (state) => ({
            chats: state.chats,
            activeChat: state.activeChat,
            messages: state.messages,
            draftMessages: state.draftMessages,
          }),
        },
        (set, get) => ({
          ...initialState,

          // 会话管理
          loadChats: async () => {
            set((state) => ({
              ...state,
              loadChatsState: { loading: true, error: null, success: false },
              isLoading: true,
            }));

            try {
              const chats = await ChatApiService.fetchChats();
              const totalUnreadCount = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
              
              set((state) => ({
                ...state,
                chats,
                totalUnreadCount,
                loadChatsState: { loading: false, error: null, success: true },
                isLoading: false,
                lastUpdated: Date.now(),
              }));
            } catch (error) {
              set((state) => ({
                ...state,
                loadChatsState: { 
                  loading: false, 
                  error: error instanceof Error ? error.message : 'Failed to load chats', 
                  success: false 
                },
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to load chats',
              }));
            }
          },

          createChat: async (chatData) => {
            const newChat: Chat = {
              ...chatData,
              id: 'chat_' + Math.random().toString(36).substr(2, 9),
              unreadCount: 0,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            set((state) => ({
              ...state,
              chats: [newChat, ...state.chats],
              lastUpdated: Date.now(),
            }));

            return newChat;
          },

          updateChat: async (chatId, updates) => {
            set((state) => ({
              ...state,
              chats: state.chats.map(chat => 
                chat.id === chatId 
                  ? { ...chat, ...updates, updatedAt: Date.now() }
                  : chat
              ),
              activeChat: state.activeChat?.id === chatId
                ? { ...state.activeChat, ...updates, updatedAt: Date.now() }
                : state.activeChat,
              lastUpdated: Date.now(),
            }));
          },

          deleteChat: async (chatId) => {
            set((state) => ({
              ...state,
              chats: state.chats.filter(chat => chat.id !== chatId),
              activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
              messages: Object.fromEntries(
                Object.entries(state.messages).filter(([id]) => id !== chatId)
              ),
              lastUpdated: Date.now(),
            }));
          },

          archiveChat: async (chatId) => {
            await get().updateChat(chatId, { isArchived: true });
          },

          pinChat: async (chatId, isPinned) => {
            await get().updateChat(chatId, { isPinned });
          },

          // 会话切换
          setActiveChat: (chatId) => {
            const chat = chatId ? get().chats.find(c => c.id === chatId) : null;
            set((state) => ({
              ...state,
              activeChat: chat || null,
              selectionMode: false,
              selectedMessages: new Set(),
              lastUpdated: Date.now(),
            }));
          },

          // 消息管理
          loadMessages: async (chatId, page = 1) => {
            set((state) => ({
              ...state,
              loadMessagesState: { loading: true, error: null, success: false },
            }));

            try {
              const { messages, total, hasMore } = await ChatApiService.fetchMessages(chatId, page);
              
              set((state) => ({
                ...state,
                messages: {
                  ...state.messages,
                  [chatId]: page === 1 ? messages : [...(state.messages[chatId] || []), ...messages]
                },
                messagePagination: {
                  ...state.messagePagination,
                  [chatId]: {
                    page,
                    pageSize: 50,
                    total,
                    hasMore,
                  }
                },
                loadMessagesState: { loading: false, error: null, success: true },
                lastUpdated: Date.now(),
              }));
            } catch (error) {
              set((state) => ({
                ...state,
                loadMessagesState: { 
                  loading: false, 
                  error: error instanceof Error ? error.message : 'Failed to load messages', 
                  success: false 
                },
                error: error instanceof Error ? error.message : 'Failed to load messages',
              }));
            }
          },

          sendMessage: async (chatId, content, type = 'text') => {
            set((state) => ({
              ...state,
              sendMessageState: { loading: true, error: null, success: false },
            }));

            try {
              const newMessage = await ChatApiService.sendMessage(chatId, content, type);
              
              set((state) => ({
                ...state,
                messages: {
                  ...state.messages,
                  [chatId]: [...(state.messages[chatId] || []), newMessage]
                },
                chats: state.chats.map(chat => 
                  chat.id === chatId
                    ? { ...chat, lastMessageId: newMessage.id, updatedAt: Date.now() }
                    : chat
                ),
                draftMessages: {
                  ...state.draftMessages,
                  [chatId]: '', // 清空草稿
                },
                sendMessageState: { loading: false, error: null, success: true },
                lastUpdated: Date.now(),
              }));
            } catch (error) {
              set((state) => ({
                ...state,
                sendMessageState: { 
                  loading: false, 
                  error: error instanceof Error ? error.message : 'Failed to send message', 
                  success: false 
                },
                error: error instanceof Error ? error.message : 'Failed to send message',
              }));
            }
          },

          replyToMessage: async (chatId, content, replyToId) => {
            const newMessage = await ChatApiService.sendMessage(chatId, content, 'text');
            newMessage.replyToId = replyToId;

            set((state) => ({
              ...state,
              messages: {
                ...state.messages,
                [chatId]: [...(state.messages[chatId] || []), newMessage]
              },
              lastUpdated: Date.now(),
            }));
          },

          updateMessage: async (messageId, updates) => {
            set((state) => {
              const newMessages = { ...state.messages };
              
              Object.keys(newMessages).forEach(chatId => {
                newMessages[chatId] = newMessages[chatId].map(msg =>
                  msg.id === messageId 
                    ? { ...msg, ...updates, updatedAt: Date.now() }
                    : msg
                );
              });

              return {
                ...state,
                messages: newMessages,
                lastUpdated: Date.now(),
              };
            });
          },

          deleteMessage: async (messageId) => {
            set((state) => {
              const newMessages = { ...state.messages };
              
              Object.keys(newMessages).forEach(chatId => {
                newMessages[chatId] = newMessages[chatId].filter(msg => msg.id !== messageId);
              });

              return {
                ...state,
                messages: newMessages,
                selectedMessages: new Set([...state.selectedMessages].filter(id => id !== messageId)),
                lastUpdated: Date.now(),
              };
            });
          },

          markMessageAsRead: (messageId) => {
            get().updateMessage(messageId, { isRead: true });
          },

          markAllMessagesAsRead: (chatId) => {
            const chatMessages = get().messages[chatId] || [];
            const unreadMessages = chatMessages.filter(msg => !msg.isRead);
            
            unreadMessages.forEach(msg => {
              get().updateMessage(msg.id, { isRead: true });
            });

            // 更新会话未读计数
            get().updateChat(chatId, { unreadCount: 0 });
          },

          // 消息选择
          toggleMessageSelection: (messageId) => {
            set((state) => {
              const newSelection = new Set(state.selectedMessages);
              if (newSelection.has(messageId)) {
                newSelection.delete(messageId);
              } else {
                newSelection.add(messageId);
              }
              
              return {
                ...state,
                selectedMessages: newSelection,
                lastUpdated: Date.now(),
              };
            });
          },

          selectAllMessages: (chatId) => {
            const chatMessages = get().messages[chatId] || [];
            const messageIds = chatMessages.map(msg => msg.id);
            
            set((state) => ({
              ...state,
              selectedMessages: new Set(messageIds),
              lastUpdated: Date.now(),
            }));
          },

          clearMessageSelection: () => {
            set((state) => ({
              ...state,
              selectedMessages: new Set(),
              selectionMode: false,
              lastUpdated: Date.now(),
            }));
          },

          setSelectionMode: (enabled) => {
            set((state) => ({
              ...state,
              selectionMode: enabled,
              selectedMessages: enabled ? state.selectedMessages : new Set(),
              lastUpdated: Date.now(),
            }));
          },

          deleteSelectedMessages: async () => {
            const selectedIds = Array.from(get().selectedMessages);
            await Promise.all(selectedIds.map(id => get().deleteMessage(id)));
            get().clearMessageSelection();
          },

          // 草稿管理
          updateDraft: (chatId, content) => {
            set((state) => ({
              ...state,
              draftMessages: {
                ...state.draftMessages,
                [chatId]: content,
              },
              lastUpdated: Date.now(),
            }));
          },

          clearDraft: (chatId) => {
            set((state) => ({
              ...state,
              draftMessages: {
                ...state.draftMessages,
                [chatId]: '',
              },
              lastUpdated: Date.now(),
            }));
          },

          // 筛选和搜索
          setChatFilter: (filter) => {
            set((state) => ({
              ...state,
              chatFilter: { ...state.chatFilter, ...filter },
              lastUpdated: Date.now(),
            }));
          },

          setMessageFilter: (filter) => {
            set((state) => ({
              ...state,
              messageFilter: { ...state.messageFilter, ...filter },
              lastUpdated: Date.now(),
            }));
          },

          searchMessages: async (query, chatId) => {
            return await ChatApiService.searchMessages(query, chatId);
          },

          // 状态重置
          resetChatState: () => {
            set(() => ({
              ...initialState,
              lastUpdated: Date.now(),
            }));
          },

          // 选择器
          getChat: (chatId) => {
            return get().chats.find(chat => chat.id === chatId);
          },

          getChatMessages: (chatId) => {
            return get().messages[chatId] || [];
          },

          getUnreadCount: (chatId) => {
            if (chatId) {
              const chat = get().getChat(chatId);
              return chat?.unreadCount || 0;
            }
            return get().totalUnreadCount;
          },

          getSelectedMessages: () => {
            const { messages, selectedMessages } = get();
            const allMessages = Object.values(messages).flat();
            return allMessages.filter(msg => selectedMessages.has(msg.id));
          },
        })
      )
    )
  )
);

// 性能优化的选择器
export const chatSelectors = {
  // 基础选择器
  chats: (state: ChatStore) => state.chats,
  activeChat: (state: ChatStore) => state.activeChat,
  messages: (state: ChatStore) => state.messages,
  selectedMessages: (state: ChatStore) => state.selectedMessages,
  
  // 计算选择器
  activeChatMessages: (state: ChatStore) => {
    return state.activeChat ? state.messages[state.activeChat.id] || [] : [];
  },
  
  unreadChats: (state: ChatStore) => {
    return state.chats.filter(chat => chat.unreadCount > 0);
  },
  
  pinnedChats: (state: ChatStore) => {
    return state.chats.filter(chat => chat.isPinned);
  },
  
  archivedChats: (state: ChatStore) => {
    return state.chats.filter(chat => chat.isArchived);
  },
  
  // 状态选择器
  isLoading: (state: ChatStore) => state.isLoading || state.loadChatsState.loading || state.loadMessagesState.loading,
  isSendingMessage: (state: ChatStore) => state.sendMessageState.loading,
  hasError: (state: ChatStore) => !!state.error,
  
  // 筛选选择器
  filteredChats: (state: ChatStore) => {
    let filtered = state.chats;
    
    if (state.chatFilter.query) {
      filtered = filtered.filter(chat => 
        chat.name.toLowerCase().includes(state.chatFilter.query.toLowerCase())
      );
    }
    
    if (state.chatFilter.tags.length > 0) {
      // 根据标签筛选逻辑
    }
    
    return filtered;
  },
};

// 导出 hooks
export const useChats = () => useChatStore(chatSelectors.chats);
export const useActiveChat = () => useChatStore(chatSelectors.activeChat);
export const useActiveChatMessages = () => useChatStore(chatSelectors.activeChatMessages);
export const useUnreadChats = () => useChatStore(chatSelectors.unreadChats);
export const useSelectedMessages = () => useChatStore(chatSelectors.selectedMessages);