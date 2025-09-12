import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Chat, Message, User, PopupConfig, ConnectionLine } from '../types';

interface SimpleChatState {
  // Chat State
  currentChatId: string | null;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  selectedMessages: string[];
  isMultiSelectMode: boolean;
  searchQuery: string;
  showUserProfile: boolean;
  showChatSettings: boolean;

  // Layout State
  sidebarCollapsed: boolean;
  rightSidebarVisible: boolean;
  overlayVisible: boolean;
  popupStack: PopupConfig[];
  connectionLines: ConnectionLine[];
}

interface SimpleChatActions {
  // Message Actions
  onMessageSend: (content: string, type?: string) => void;
  onMessageSelect: (messageId: string) => void;
  onMessageReact: (messageId: string, emoji: string) => void;
  onMessageDelete: (messageId: string) => void;
  onMessageEdit: (messageId: string, content: string) => void;

  // Chat Actions
  onChatSelect: (chatId: string) => void;
  onChatDelete: (chatId: string) => void;
  onChatMute: (chatId: string) => void;
  onChatArchive: (chatId: string) => void;

  // UI Actions
  onSearchChange: (query: string) => void;
  onUserProfileToggle: () => void;
  onSettingsToggle: () => void;
  onMultiSelectToggle: () => void;

  // Layout Actions
  toggleSidebar: () => void;
  toggleRightSidebar: () => void;
  setOverlayVisible: (visible: boolean) => void;
  addPopup: (popup: PopupConfig) => void;
  removePopup: (popupId: string) => void;
  addConnectionLine: (line: ConnectionLine) => void;
  removeConnectionLine: (lineId: string) => void;
  clearConnectionLines: () => void;
}

type SimpleChatStore = SimpleChatState & SimpleChatActions;

export const useChatStore = create<SimpleChatStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial State
      currentChatId: null,
      chats: [],
      messages: {},
      selectedMessages: [],
      isMultiSelectMode: false,
      searchQuery: '',
      showUserProfile: false,
      showChatSettings: false,
      sidebarCollapsed: false,
      rightSidebarVisible: true,
      overlayVisible: false,
      popupStack: [],
      connectionLines: [],

      // Message Actions
      onMessageSend: (content: string, type = 'text') => {
        set((state) => {
          const currentChatId = state.currentChatId;
          if (!currentChatId) return;

          const newMessage: Message = {
            id: `msg_${Date.now()}`,
            chatId: currentChatId,
            senderId: 'current_user',
            content,
            timestamp: new Date(),
            type: type as any,
            status: 'sending',
          };

          if (!state.messages[currentChatId]) {
            state.messages[currentChatId] = [];
          }
          
          state.messages[currentChatId].push(newMessage);

          // Update chat's last message
          const chatIndex = state.chats.findIndex(chat => chat.id === currentChatId);
          if (chatIndex !== -1) {
            state.chats[chatIndex].lastMessage = newMessage;
            state.chats[chatIndex].lastActivity = new Date();
          }

          // Simulate message status updates
          setTimeout(() => {
            set((state) => {
              const messages = state.messages[currentChatId];
              if (messages) {
                const messageIndex = messages.findIndex(m => m.id === newMessage.id);
                if (messageIndex !== -1) {
                  messages[messageIndex].status = 'sent';
                }
              }
            });
          }, 1000);
        });
      },

      onMessageSelect: (messageId: string) => {
        set((state) => {
          if (state.isMultiSelectMode) {
            const index = state.selectedMessages.indexOf(messageId);
            if (index > -1) {
              state.selectedMessages.splice(index, 1);
            } else {
              state.selectedMessages.push(messageId);
            }
          } else {
            state.selectedMessages = [messageId];
            state.isMultiSelectMode = true;
          }
        });
      },

      onMessageReact: (messageId: string, emoji: string) => {
        set((state) => {
          const currentChatId = state.currentChatId;
          if (!currentChatId) return;

          const messages = state.messages[currentChatId];
          if (!messages) return;

          const messageIndex = messages.findIndex(m => m.id === messageId);
          if (messageIndex === -1) return;

          const message = messages[messageIndex];
          if (!message.reactions) {
            message.reactions = [];
          }

          const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
          if (reactionIndex > -1) {
            const reaction = message.reactions[reactionIndex];
            const userIndex = reaction.users.indexOf('current_user');
            if (userIndex > -1) {
              reaction.users.splice(userIndex, 1);
              reaction.count--;
              if (reaction.count === 0) {
                message.reactions.splice(reactionIndex, 1);
              }
            } else {
              reaction.users.push('current_user');
              reaction.count++;
            }
          } else {
            message.reactions.push({
              emoji,
              users: ['current_user'],
              count: 1,
            });
          }
        });
      },

      onMessageDelete: (messageId: string) => {
        set((state) => {
          const currentChatId = state.currentChatId;
          if (!currentChatId) return;

          const messages = state.messages[currentChatId];
          if (!messages) return;

          const messageIndex = messages.findIndex(m => m.id === messageId);
          if (messageIndex > -1) {
            messages.splice(messageIndex, 1);
          }

          const selectedIndex = state.selectedMessages.indexOf(messageId);
          if (selectedIndex > -1) {
            state.selectedMessages.splice(selectedIndex, 1);
          }
        });
      },

      onMessageEdit: (messageId: string, content: string) => {
        set((state) => {
          const currentChatId = state.currentChatId;
          if (!currentChatId) return;

          const messages = state.messages[currentChatId];
          if (!messages) return;

          const messageIndex = messages.findIndex(m => m.id === messageId);
          if (messageIndex > -1) {
            messages[messageIndex].content = content;
          }
        });
      },

      // Chat Actions
      onChatSelect: (chatId: string) => {
        set((state) => {
          state.currentChatId = chatId;
          state.selectedMessages = [];
          state.isMultiSelectMode = false;
          
          const messages = state.messages[chatId];
          if (messages) {
            messages.forEach(message => {
              if (message.senderId !== 'current_user' && message.status !== 'read') {
                message.status = 'read';
              }
            });
          }

          const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
          if (chatIndex !== -1) {
            state.chats[chatIndex].unreadCount = 0;
          }
        });
      },

      onChatDelete: (chatId: string) => {
        set((state) => {
          const chatIndex = state.chats.findIndex(chat => chat.id === chatId);
          if (chatIndex > -1) {
            state.chats.splice(chatIndex, 1);
          }
          
          delete state.messages[chatId];

          if (state.currentChatId === chatId) {
            state.currentChatId = state.chats.length > 0 ? state.chats[0].id : null;
          }
        });
      },

      onChatMute: (chatId: string) => {
        console.log('Mute chat:', chatId);
      },

      onChatArchive: (chatId: string) => {
        console.log('Archive chat:', chatId);
      },

      // UI Actions
      onSearchChange: (query: string) => {
        set((state) => {
          state.searchQuery = query;
        });
      },

      onUserProfileToggle: () => {
        set((state) => {
          state.showUserProfile = !state.showUserProfile;
        });
      },

      onSettingsToggle: () => {
        set((state) => {
          state.showChatSettings = !state.showChatSettings;
        });
      },

      onMultiSelectToggle: () => {
        set((state) => {
          state.isMultiSelectMode = !state.isMultiSelectMode;
          if (!state.isMultiSelectMode) {
            state.selectedMessages = [];
          }
        });
      },

      // Layout Actions
      toggleSidebar: () => {
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        });
      },

      toggleRightSidebar: () => {
        set((state) => {
          state.rightSidebarVisible = !state.rightSidebarVisible;
        });
      },

      setOverlayVisible: (visible: boolean) => {
        set((state) => {
          state.overlayVisible = visible;
        });
      },

      addPopup: (popup: PopupConfig) => {
        set((state) => {
          state.popupStack.push({
            ...popup,
            zIndex: 1000 + state.popupStack.length,
          });
        });
      },

      removePopup: (popupId: string) => {
        set((state) => {
          const index = state.popupStack.findIndex(p => p.id === popupId);
          if (index > -1) {
            state.popupStack.splice(index, 1);
          }
        });
      },

      addConnectionLine: (line: ConnectionLine) => {
        set((state) => {
          state.connectionLines.push(line);
        });
      },

      removeConnectionLine: (lineId: string) => {
        set((state) => {
          const index = state.connectionLines.findIndex(l => l.id === lineId);
          if (index > -1) {
            state.connectionLines.splice(index, 1);
          }
        });
      },

      clearConnectionLines: () => {
        set((state) => {
          state.connectionLines = [];
        });
      },
    }))
  )
);

// Selectors for performance optimization
export const selectCurrentChat = (state: SimpleChatStore) => 
  state.chats.find(chat => chat.id === state.currentChatId);

export const selectCurrentMessages = (state: SimpleChatStore) => 
  state.currentChatId ? state.messages[state.currentChatId] || [] : [];

export const selectUnreadChats = (state: SimpleChatStore) => 
  state.chats.filter(chat => chat.unreadCount > 0);

export const selectFilteredChats = (state: SimpleChatStore) => {
  if (!state.searchQuery) return state.chats;
  
  const query = state.searchQuery.toLowerCase();
  return state.chats.filter(chat => 
    chat.name.toLowerCase().includes(query) ||
    chat.participants.some(user => user.name.toLowerCase().includes(query))
  );
};