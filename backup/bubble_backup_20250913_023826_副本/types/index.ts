// Global Types for Chat Application
export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  status: MessageStatus;
  reactions?: Reaction[];
  replyTo?: string;
  attachments?: Attachment[];
}

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'file' 
  | 'voice' 
  | 'gif' 
  | 'sticker' 
  | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  name: string;
  size: number;
  thumbnail?: string;
}

export interface Chat {
  id: string;
  name: string;
  type: 'private' | 'group';
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  avatar?: string;
  isOnline: boolean;
  lastActivity: Date;
}

export interface ChatState {
  currentChatId: string | null;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  selectedMessages: string[];
  isMultiSelectMode: boolean;
  searchQuery: string;
  showUserProfile: boolean;
  showChatSettings: boolean;
}

// UI Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export interface PositionProps {
  x: number;
  y: number;
}

export interface SizeProps {
  width?: number | string;
  height?: number | string;
}

// Layout Types
export interface LayoutState {
  sidebarCollapsed: boolean;
  rightSidebarVisible: boolean;
  overlayVisible: boolean;
  popupStack: PopupConfig[];
  connectionLines: ConnectionLine[];
}

export interface PopupConfig {
  id: string;
  type: 'modal' | 'toast' | 'dropdown' | 'context-menu';
  content: React.ReactNode;
  position?: PositionProps;
  size?: SizeProps;
  zIndex: number;
  onClose?: () => void;
}

export interface ConnectionLine {
  id: string;
  from: PositionProps;
  to: PositionProps;
  type: 'straight' | 'curved' | 'bezier';
  color?: string;
  thickness?: number;
}

// Component Events
export interface MessageEvents {
  onMessageSend: (content: string, type: MessageType) => void;
  onMessageSelect: (messageId: string) => void;
  onMessageReact: (messageId: string, emoji: string) => void;
  onMessageDelete: (messageId: string) => void;
  onMessageEdit: (messageId: string, content: string) => void;
}

export interface ChatEvents {
  onChatSelect: (chatId: string) => void;
  onChatDelete: (chatId: string) => void;
  onChatMute: (chatId: string) => void;
  onChatArchive: (chatId: string) => void;
}

export interface UIEvents {
  onSearchChange: (query: string) => void;
  onUserProfileToggle: () => void;
  onSettingsToggle: () => void;
  onMultiSelectToggle: () => void;
}

// Store Types
export type StoreState = ChatState & LayoutState;
export type StoreActions = MessageEvents & ChatEvents & UIEvents;

// Performance Types
export interface VirtualListItem {
  id: string;
  height: number;
  data: any;
}

export interface LazyLoadConfig {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}