import React, { useState } from 'react';
import { BubbleProps } from '../../types/chat';
import { MessageContent } from './MessageTypes/MessageContent';
import { MultiSelectCheckbox } from './MultiSelectMode';
import { ActionMenu } from './ActionMenu';
import { cn } from '../../utils/cn';
import '../../styles/bubble-styles.css';

export const DetailedBubble: React.FC<BubbleProps> = ({
  message,
  isMultiSelectMode = false,
  className,
  onActionClick
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const isSelf = message.sender === 'self';
  const isSystem = message.sender === 'system';
  
  // 系统消息特殊处理
  if (isSystem) {
    return (
      <div className={cn(
        'flex justify-center items-center py-2 px-4',
        className
      )}>
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 max-w-sm backdrop-blur-sm border border-gray-200/30">
          <div className="text-gray-600 dark:text-gray-300 text-sm text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
            <MessageContent message={message} />
          </div>
        </div>
      </div>
    );
  }

  // 计算气泡最大宽度和对齐
  const maxBubbleWidth = 'max-w-full'; // 统一最大宽度
  
  const handleBubbleClick = () => {
    if (!isMultiSelectMode) {
      setShowActionMenu(!showActionMenu);
    }
  };

  return (
    <div className={cn(
      'flex items-start gap-3 relative',
      maxBubbleWidth,
      isSelf ? 'flex-row-reverse ml-auto justify-start' : 'mr-auto justify-start',
      className
    )}>
      {/* 多选复选框 */}
      {isMultiSelectMode && (
        <div className="flex items-end pb-2">
          <MultiSelectCheckbox
            messageId={message.id}
            isSelected={message.isSelected || false}
          />
        </div>
      )}


      {/* 头像 - 只在非自己消息时显示 */}
      {!isSelf && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
            {message.senderAvatar ? (
              <img
                src={message.senderAvatar}
                alt={message.senderName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-sm [text-shadow:0_2px_6px_rgba(0,0,0,0.8),0_0_12px_rgba(0,0,0,0.6)]">
                {message.senderName?.[0] || '?'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 消息内容区域 */}
      <div className={cn(
        'flex flex-col relative',
        isSelf ? 'items-end' : 'items-start'
      )}>
        {/* 操作按钮菜单 */}
        {showActionMenu && (
          <ActionMenu
            onAction={(action) => {
              onActionClick?.(action, message);
              setShowActionMenu(false);
            }}
            position={isSelf ? 'right' : 'left'}
          />
        )}

        {/* 引用消息 */}
        {message.quotedMessage && (
          <div className={cn(
            'mb-2 p-2 rounded-lg border-l-4 backdrop-blur-sm',
            isSelf 
              ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/20' 
              : 'border-gray-400 bg-gray-50/30 dark:bg-gray-800/30'
          )}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
              {message.quotedMessage.senderName || '引用消息'}
            </div>
            <div className="text-sm opacity-75 line-clamp-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
              <MessageContent message={message.quotedMessage} isQuoted={true} />
            </div>
          </div>
        )}

        {/* 气泡和发送者名字容器 - 基于 bubble-demo.html 标准 */}
        <div className="relative">
          {/* 发送者名字 - 只有文本阴影，无背景矩形 */}
          {!isSelf && message.senderName && (
            <span className={cn(
              'absolute left-3 top-0 transform -translate-y-1/2 z-30',
              'text-xs leading-none text-white sender-name-shadow'
            )}
            style={{ backdropFilter: 'blur(24px)' }}>
              {message.senderName}
            </span>
          )}

          {/* 主气泡 */}
          <div 
            className={cn(
              'relative glass-effect rounded-xl overflow-hidden shadow-lg max-w-full w-fit cursor-pointer',
              'hover:scale-[1.01] transition-transform duration-200',
              // 玻璃材质效果 - 严格按照 bubble-demo.html 标准
              isSelf ? 'glass-self' : 'glass-other',
              // 选中状态
              message.isSelected && 'ring-2 ring-blue-500/50'
            )}
            onClick={handleBubbleClick}
          >
            {/* 背景模糊层 */}
            <div className="absolute inset-0 glass-effect opacity-50 overflow-hidden rounded-xl" />
            
            {/* 内容区域 */}
            <div className="relative z-10 px-2 py-1.5">
              <div className="text-white text-shadow-enhanced">
                <MessageContent message={message} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};