import React, { useState } from 'react';
import { BubbleProps } from '../../types/chat';
import { MessageContent } from './MessageTypes/MessageContent';
import { MultiSelectCheckbox } from './MultiSelectMode';
import { ActionMenu } from './ActionMenu';
import { cn } from '../../utils/cn';
import '../../styles/bubble-styles.css';

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

  const handleBubbleClick = () => {
    if (!isMultiSelectMode) {
      setShowActionMenu(!showActionMenu);
    }
  };

  return (
    <div className={cn(
      'flex items-end gap-2 relative max-w-full',
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

        {/* 主气泡 - 基于 bubble-demo.html 标准，带小尾巴 */}
        <div
          className={cn(
            'relative rounded-xl overflow-hidden shadow-sm transition-transform duration-150 cursor-pointer',
            'glass-effect border max-w-full w-fit hover:scale-[1.01]',
            // 玻璃材质效果 - 严格按照 bubble-demo.html 标准
            isSelf ? 'glass-self' : 'glass-other',
            // 小尾巴实现
            isSelf 
              ? [
                  'after:absolute after:bottom-0 after:-right-1 after:w-0 after:h-0',
                  'after:border-l-8 after:border-l-white/25',
                  'after:border-t-8 after:border-t-transparent',
                  'after:border-b-8 after:border-b-transparent'
                ]
              : [
                  'after:absolute after:bottom-0 after:-left-1 after:w-0 after:h-0',
                  'after:border-r-8 after:border-r-transparent',
                  'after:border-t-8 after:border-t-transparent',
                  'after:border-b-8 after:border-b-transparent'
                ],
            // 选中状态
            message.isSelected && 'ring-2 ring-blue-500/50'
          )}
          onClick={handleBubbleClick}
        >
          {/* 背景模糊层 */}
          <div className="absolute inset-0 backdrop-blur-sm opacity-40" />

          {/* 内容区域 */}
          <div className="relative z-10 px-2 py-1">
            <div className="text-white text-shadow-enhanced">
              <MessageContent message={message} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};