import React, { useState } from 'react';
import { 
  MessageBubble, 
  MultiSelectProvider,
  useMultiSelect,
  Message,
  ActionType,
  BubbleStyle 
} from './index';
import { cn } from '../../utils/cn';

// 示例消息数据
const exampleMessages: Message[] = [
  {
    id: '1',
    type: 'text',
    sender: 'other',
    senderName: '张三',
    senderAvatar: 'https://via.placeholder.com/40',
    timestamp: Date.now() - 3600000,
    content: { text: '你好！今天天气真不错 😊' }
  },
  {
    id: '2',
    type: 'text',
    sender: 'self',
    timestamp: Date.now() - 3500000,
    content: { text: '是的，很适合出去走走！' }
  },
  {
    id: '3',
    type: 'image',
    sender: 'other',
    senderName: '张三',
    senderAvatar: 'https://via.placeholder.com/40',
    timestamp: Date.now() - 3000000,
    content: {
      url: 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Beautiful+Landscape',
      width: 300,
      height: 200,
      caption: '公园里的风景真美'
    }
  },
  {
    id: '4',
    type: 'voice',
    sender: 'self',
    timestamp: Date.now() - 2800000,
    content: {
      url: '/audio/sample.mp3',
      duration: 15,
      waveform: [0.2, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.5, 0.3, 0.6, 0.8, 0.2]
    }
  },
  {
    id: '5',
    type: 'red-envelope',
    sender: 'other',
    senderName: '张三',
    senderAvatar: 'https://via.placeholder.com/40',
    timestamp: Date.now() - 2500000,
    content: {
      amount: 88.88,
      message: '恭喜发财！',
      isOpened: false,
      isExpired: false
    }
  },
  {
    id: '6',
    type: 'system',
    sender: 'system',
    timestamp: Date.now() - 2000000,
    content: {
      text: '张三邀请李四加入了群聊',
      actionType: 'join'
    }
  },
  {
    id: '7',
    type: 'link',
    sender: 'other',
    senderName: '李四',
    senderAvatar: 'https://via.placeholder.com/40',
    timestamp: Date.now() - 1500000,
    content: {
      url: 'https://example.com/article',
      title: '这篇文章很有趣',
      description: '介绍了最新的技术发展趋势',
      thumbnail: 'https://via.placeholder.com/300x150/10B981/FFFFFF?text=Tech+News',
      favicon: 'https://via.placeholder.com/16'
    }
  },
  {
    id: '8',
    type: 'file',
    sender: 'self',
    timestamp: Date.now() - 1200000,
    content: {
      name: '项目文档.pdf',
      size: 2048576,
      url: '/files/project.pdf',
      extension: 'pdf'
    }
  },
  {
    id: '9',
    type: 'animated-emoji',
    sender: 'other',
    senderName: '李四',
    senderAvatar: 'https://via.placeholder.com/40',
    timestamp: Date.now() - 900000,
    content: {
      emojiId: 'thumbs-up',
      url: 'https://via.placeholder.com/120x120/F59E0B/FFFFFF?text=👍',
      width: 120,
      height: 120
    }
  },
  {
    id: '10',
    type: 'text',
    sender: 'self',
    timestamp: Date.now() - 600000,
    content: { text: '收到！' },
    quotedMessage: {
      id: '7',
      type: 'text',
      sender: 'other',
      senderName: '李四',
      timestamp: Date.now() - 1500000,
      content: { text: '这篇文章很有趣' }
    }
  }
];

// 聊天界面组件
const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(exampleMessages);
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>('detailed');
  const multiSelect = useMultiSelect();

  // 处理操作点击
  const handleActionClick = (messageId: string, action: ActionType) => {
    console.log('操作:', action, '消息ID:', messageId);
    
    switch (action) {
      case 'multi-select':
        // 进入多选模式
        if (!multiSelect.isActive) {
          // 这里需要设置多选模式为激活状态
          // 实际实现中可能需要通过props或其他方式来控制
        }
        multiSelect.onToggleMessage(messageId);
        break;
      case 'copy':
        // 复制消息内容
        const message = messages.find(m => m.id === messageId);
        if (message && message.type === 'text') {
          navigator.clipboard?.writeText(message.content.text);
          alert('已复制到剪贴板');
        }
        break;
      case 'delete':
        // 删除消息
        setMessages(prev => prev.filter(m => m.id !== messageId));
        break;
      default:
        alert(`执行操作: ${action}`);
    }
  };

  // 处理批量操作
  const handleBatchAction = (action: ActionType, messageIds: string[]) => {
    console.log('批量操作:', action, '消息IDs:', messageIds);
    
    switch (action) {
      case 'delete':
        setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
        break;
      case 'forward':
        alert(`转发 ${messageIds.length} 条消息`);
        break;
      case 'collect':
        alert(`收藏 ${messageIds.length} 条消息`);
        break;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          消息气泡演示
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBubbleStyle(bubbleStyle === 'detailed' ? 'simple' : 'detailed')}
            className={cn(
              'px-3 py-1 rounded-full text-sm transition-colors',
              'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
              'hover:bg-blue-200 dark:hover:bg-blue-800'
            )}
          >
            {bubbleStyle === 'detailed' ? '简洁模式' : '详细模式'}
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            style={bubbleStyle}
            isMultiSelectMode={multiSelect.isActive}
            onActionClick={(action) => handleActionClick(message.id, action)}
            onBubbleClick={() => console.log('点击气泡:', message.id)}
            onBubbleLongPress={() => console.log('长按气泡:', message.id)}
          />
        ))}
      </div>

      {/* 输入区域 */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const newMessage: Message = {
                  id: String(Date.now()),
                  type: 'text',
                  sender: 'self',
                  timestamp: Date.now(),
                  content: { text: e.currentTarget.value.trim() }
                };
                setMessages(prev => [...prev, newMessage]);
                e.currentTarget.value = '';
              }
            }}
          />
          <button className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

// 主示例组件
export const ChatExample: React.FC = () => {
  return (
    <MultiSelectProvider onBatchAction={(action, messageIds) => {
      console.log('批量操作:', action, messageIds);
    }}>
      <ChatInterface />
    </MultiSelectProvider>
  );
};