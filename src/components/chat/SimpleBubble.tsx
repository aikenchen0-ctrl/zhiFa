import React from 'react';
import { BubbleProps } from '../../types/chat';
import { MessageContent } from './MessageTypes/MessageContent';
import { MultiSelectCheckbox } from './MultiSelectMode';
import { cn } from '../../utils/cn';

export const SimpleBubble: React.FC<BubbleProps> = ({
  message,
  isMultiSelectMode = false,
  className
}) => {
  const isSelf = message.sender === 'self';
  const isSystem = message.sender === 'system';
  
  // 系统消息特殊处理
  if (isSystem) {
    return (
      <div className={cn(
        'flex justify-center items-center py-1 px-4',
        className
      )}>
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-1 text-xs text-gray-600 dark:text-gray-300">
          <MessageContent message={message} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-end gap-2 max-w-[75%] group',
      isSelf ? 'flex-row-reverse ml-auto' : 'mr-auto',
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
        {/* 引用消息 */}
        {message.quotedMessage && (
          <div className={cn(
            'mb-1 p-2 rounded-lg border-l-2 text-xs',
            isSelf 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400' 
              : 'bg-gray-100 dark:bg-gray-800 border-gray-400'
          )}>
            <div className="opacity-60 line-clamp-1">
              <MessageContent message={message.quotedMessage} isQuoted={true} />
            </div>
          </div>
        )}

        {/* 主气泡 */}
        <div className={cn(
          'relative rounded-2xl overflow-hidden shadow-sm transition-all duration-150',
          // 自己的消息 - 半透明白色
          isSelf && [
            'bg-blue-500 text-white',
            // 尾巴
            'after:absolute after:bottom-0 after:-right-1 after:w-0 after:h-0',
            'after:border-l-[8px] after:border-l-blue-500',
            'after:border-t-[8px] after:border-t-transparent',
            'after:border-b-[8px] after:border-b-transparent'
          ],
          // 别人的消息 - 灰色背景
          !isSelf && [
            'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            // 尾巴
            'after:absolute after:bottom-0 after:-left-1 after:w-0 after:h-0',
            'after:border-r-[8px] after:border-r-gray-100 dark:after:border-r-gray-800',
            'after:border-t-[8px] after:border-t-transparent',
            'after:border-b-[8px] after:border-b-transparent'
          ],
          // 悬停效果
          'hover:shadow-md hover:scale-[1.02]',
          // 选中状态
          message.isSelected && 'ring-2 ring-blue-500 ring-opacity-50'
        )}>
          {/* 内容区域 */}
          <div className=\"px-3 py-2\">\n            <MessageContent message={message} />\n          </div>\n        </div>\n\n        {/* 消息时间 - 悬停时显示 */}\n        <div className={cn(\n          'absolute -bottom-5 text-xs text-gray-400 dark:text-gray-500',\n          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',\n          isSelf ? 'right-0' : 'left-0'\n        )}>\n          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {\n            hour: '2-digit',\n            minute: '2-digit'\n          })}\n        </div>\n      </div>\n    </div>\n  );\n};