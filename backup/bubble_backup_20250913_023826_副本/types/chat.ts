// 消息发送者类型
export type MessageSender = 'self' | 'other' | 'system';

// 消息类型
export type MessageType = 
  | 'text' 
  | 'image' 
  | 'voice' 
  | 'video' 
  | 'file' 
  | 'link' 
  | 'extended-link'
  | 'contact' 
  | 'location' 
  | 'red-envelope'
  | 'transfer'
  | 'mini-program'
  | 'animated-emoji'
  | 'group-management'
  | 'voice-call'
  | 'video-call'
  | 'service-notification'
  | 'quote-notification'
  | 'system';

// 气泡样式类型
export type BubbleStyle = 'detailed' | 'simple';

// 操作按钮类型
export type ActionType = 
  | 'aside'
  | 'copy'
  | 'forward'
  | 'collect'
  | 'multi-select'
  | 'quote'
  | 'enlarge'
  | 'delete';

// 基础消息接口
export interface BaseMessage {
  id: string;
  type: MessageType;
  sender: MessageSender;
  senderName?: string;
  senderAvatar?: string;
  timestamp: number;
  content: any;
  isSelected?: boolean;
  quotedMessage?: BaseMessage;
}

// 文本消息
export interface TextMessage extends BaseMessage {
  type: 'text';
  content: {
    text: string;
  };
}

// 图片消息
export interface ImageMessage extends BaseMessage {
  type: 'image';
  content: {
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    caption?: string;
  };
}

// 语音消息
export interface VoiceMessage extends BaseMessage {
  type: 'voice';
  content: {
    url: string;
    duration: number;
    waveform?: number[];
    isPlaying?: boolean;
  };
}

// 视频消息
export interface VideoMessage extends BaseMessage {
  type: 'video';
  content: {
    url: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
    caption?: string;
  };
}

// 文件消息
export interface FileMessage extends BaseMessage {
  type: 'file';
  content: {
    name: string;
    size: number;
    url: string;
    extension: string;
    icon?: string;
  };
}

// 链接消息
export interface LinkMessage extends BaseMessage {
  type: 'link';
  content: {
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    favicon?: string;
  };
}

// 扩展链接消息
export interface ExtendedLinkMessage extends BaseMessage {
  type: 'extended-link';
  content: {
    url: string;
    title: string;
    description: string;
    thumbnail: string;
    siteName: string;
    author?: string;
    publishTime?: string;
  };
}

// 名片消息
export interface ContactMessage extends BaseMessage {
  type: 'contact';
  content: {
    name: string;
    phone?: string;
    avatar?: string;
    company?: string;
    title?: string;
  };
}

// 定位消息
export interface LocationMessage extends BaseMessage {
  type: 'location';
  content: {
    latitude: number;
    longitude: number;
    address: string;
    name?: string;
    thumbnail?: string;
  };
}

// 红包消息
export interface RedEnvelopeMessage extends BaseMessage {
  type: 'red-envelope';
  content: {
    amount: number;
    message: string;
    isOpened: boolean;
    isExpired: boolean;
  };
}

// 转账消息
export interface TransferMessage extends BaseMessage {
  type: 'transfer';
  content: {
    amount: number;
    message?: string;
    status: 'pending' | 'received' | 'expired';
  };
}

// 小程序消息
export interface MiniProgramMessage extends BaseMessage {
  type: 'mini-program';
  content: {
    title: string;
    description: string;
    thumbnail: string;
    appId: string;
    path: string;
  };
}

// 动画表情消息
export interface AnimatedEmojiMessage extends BaseMessage {
  type: 'animated-emoji';
  content: {
    emojiId: string;
    url: string;
    width: number;
    height: number;
  };
}

// 系统消息
export interface SystemMessage extends BaseMessage {
  type: 'system';
  sender: 'system';
  content: {
    text: string;
    actionType?: 'join' | 'leave' | 'kick' | 'admin' | 'name-change' | 'announcement';
  };
}

// 组合所有消息类型
export type Message = 
  | TextMessage
  | ImageMessage
  | VoiceMessage
  | VideoMessage
  | FileMessage
  | LinkMessage
  | ExtendedLinkMessage
  | ContactMessage
  | LocationMessage
  | RedEnvelopeMessage
  | TransferMessage
  | MiniProgramMessage
  | AnimatedEmojiMessage
  | SystemMessage;

// 操作按钮配置
export interface ActionButton {
  type: ActionType;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}

// 气泡组件属性
export interface BubbleProps {
  message: Message;
  style?: BubbleStyle;
  showActions?: boolean;
  onActionClick?: (action: ActionType, message: Message) => void;
  onBubbleClick?: () => void;
  onBubbleLongPress?: () => void;
  isMultiSelectMode?: boolean;
  className?: string;
}

// 多选模式状态
export interface MultiSelectState {
  isActive: boolean;
  selectedMessages: Set<string>;
  onToggleMessage: (messageId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchAction: (action: ActionType) => void;
}