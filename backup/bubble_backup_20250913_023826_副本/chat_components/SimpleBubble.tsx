import React, { useState } from 'react';
import { BubbleProps } from '../../types/chat';
import { MessageContent } from './MessageTypes/MessageContent';
import { MultiSelectCheckbox } from './MultiSelectMode';
import { ActionMenu } from './ActionMenu';
import { cn } from '../../utils/cn';

export const SimpleBubble: React.FC<BubbleProps> = ({
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
        'flex justify-center items-center py-1 px-4',
        className
      )}>
        <div className="bg-gray-100/50 dark:bg-gray-700/50 rounded-full px-4 py-1 text-xs text-gray-600 dark:text-gray-300 backdrop-blur-sm border border-gray-200/30">
          <div className="[text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
            <MessageContent message={message} />
          </div>
        </div>
      </div>
    );
  }

  // 计算气泡最大宽度和对齐 - 统一最大宽度
  const maxBubbleWidth = 'max-w-full';
  
  const handleBubbleClick = () => {
    if (!isMultiSelectMode) {
      setShowActionMenu(!showActionMenu);
    }
  };

  return (
    <div className={cn(
      'flex items-end gap-2 relative',
      maxBubbleWidth,
      isSelf ? 'flex-row-reverse ml-auto justify-start' : 'mr-auto justify-start',
      className
    )}>
      {/* 多选复选框 */}
      {isMultiSelectMode && (
        <div className="flex items-end pb-1">
          <MultiSelectCheckbox
            messageId={message.id}
            isSelected={message.isSelected || false}
          />
        </div>
      )}

      {/* 气泡容器 */}
      <div className="relative flex flex-col">
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
            'mb-1 p-2 rounded-lg border-l-2 text-xs backdrop-blur-sm',
            isSelf 
              ? 'bg-blue-50/30 dark:bg-blue-900/20 border-blue-400' 
              : 'bg-gray-100/30 dark:bg-gray-800/30 border-gray-400'
          )}>
            <div className="opacity-60 line-clamp-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
              <MessageContent message={message.quotedMessage} isQuoted={true} />
            </div>
          </div>
        )}

        {/* 主气泡 */}
        <div 
          className={cn(
            'relative rounded-xl overflow-hidden shadow-sm transition-all duration-150 cursor-pointer',
            'backdrop-blur-lg border',
            // 根据内容长度调整宽度，从对应方向扩展
            'max-w-full w-fit',
            // 自己的消息 - 半透明白色玻璃材质
            isSelf && [
              'bg-white/25 dark:bg-white/8',
              'border-white/30 dark:border-white/20',
              'text-white',
              // 尾巴 - 右侧
              'after:absolute after:bottom-0 after:-right-1 after:w-0 after:h-0',
              'after:border-l-[8px] after:border-l-white/25 dark:after:border-l-white/8',
              'after:border-t-[8px] after:border-t-transparent',
              'after:border-b-[8px] after:border-b-transparent'
            ],
            // 别人的消息 - 全透明玻璃质感材质
            !isSelf && [
              'bg-transparent dark:bg-gray-900/20',
              'border-gray-200/40 dark:border-gray-700/40',
              'text-white',
              // 尾巴 - 左侧
              'after:absolute after:bottom-0 after:-left-1 after:w-0 after:h-0',
              'after:border-r-[8px] after:border-r-transparent dark:after:border-r-gray-900/20',
              'after:border-t-[8px] after:border-t-transparent',
              'after:border-b-[8px] after:border-b-transparent'
            ],
            // 悬停效果
            'hover:scale-[1.01] transition-transform',
            // 选中状态
            message.isSelected && 'ring-2 ring-blue-500/50'
          )}
          onClick={handleBubbleClick}
        >
          {/* 强背景模糊层 */}
          <div className="absolute inset-0 backdrop-blur-sm opacity-40" />
          
          {/* 内容区域 */}
          <div className="relative z-10 px-2 py-1">
            <div className="text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_6px_rgba(0,0,0,0.4),0_0_10px_rgba(0,0,0,0.25),0_1px_1px_rgba(0,0,0,0.5)]">
              <MessageContent message={message} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};