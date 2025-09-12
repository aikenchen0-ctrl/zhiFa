import React from 'react';
import { BubbleProps } from '../../types/chat';
import { MessageContent } from './MessageTypes/MessageContent';
import { MultiSelectCheckbox } from './MultiSelectMode';
import { cn } from '../../utils/cn';

export const DetailedBubble: React.FC<BubbleProps> = ({
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
        'flex justify-center items-center py-2 px-4',
        className
      )}>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 max-w-sm">
          <MessageContent message={message} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-start gap-3 max-w-[85%] group',
      isSelf ? 'flex-row-reverse ml-auto' : 'mr-auto',
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
            {message.senderAvatar ? (
              <img
                src={message.senderAvatar}
                alt={message.senderName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-medium">
                {message.senderName?.[0] || '?'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 消息内容区域 */}
      <div className={cn(
        'flex flex-col',
        isSelf ? 'items-end' : 'items-start'
      )}>
        {/* 发送者名字 - 只在非自己消息时显示 */}
        {!isSelf && message.senderName && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
            {message.senderName}
          </div>
        )}

        {/* 气泡容器 */}
        <div className="relative">
          {/* 引用消息 */}
          {message.quotedMessage && (
            <div className={cn(
              'mb-2 p-2 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-800/50',
              isSelf 
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' 
                : 'border-gray-400'
            )}>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {message.quotedMessage.senderName || '引用消息'}
              </div>
              <div className="text-sm opacity-75 line-clamp-2">
                <MessageContent message={message.quotedMessage} isQuoted={true} />
              </div>
            </div>
          )}

          {/* 主气泡 */}
          <div className={cn(
            'relative backdrop-blur-lg border rounded-2xl overflow-hidden',
            'shadow-lg shadow-black/10 transition-all duration-200',
            // 自己的消息 - 半透明白色
            isSelf && [\n              'bg-white/80 dark:bg-white/10',\n              'border-white/30 dark:border-white/20',\n              'text-gray-900 dark:text-white'\n            ],\n            // 别人的消息 - 全透明\n            !isSelf && [\n              'bg-transparent dark:bg-gray-900/30',\n              'border-gray-200/50 dark:border-gray-700/50',\n              'text-gray-900 dark:text-gray-100'\n            ],\n            // 悬停效果\n            'hover:shadow-xl hover:shadow-black/20 hover:scale-[1.02]',\n            // 选中状态\n            message.isSelected && 'ring-2 ring-blue-500 ring-opacity-50'\n          )}>\n            {/* 强背景模糊效果 */}\n            <div className=\"absolute inset-0 backdrop-blur-xl opacity-60\" />\n            \n            {/* 内容区域 */}\n            <div className=\"relative z-10 p-3\">\n              <MessageContent message={message} />\n            </div>\n          </div>\n\n          {/* 消息状态和时间 */}\n          <div className={cn(\n            'flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500',\n            isSelf ? 'justify-end' : 'justify-start'\n          )}>\n            <span>\n              {new Date(message.timestamp).toLocaleTimeString('zh-CN', {\n                hour: '2-digit',\n                minute: '2-digit'\n              })}\n            </span>\n            {isSelf && (\n              <div className=\"flex items-center gap-0.5\">\n                {/* 发送状态图标 */}\n                <svg className=\"w-3 h-3\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n                  <path fillRule=\"evenodd\" d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\" clipRule=\"evenodd\" />\n                </svg>\n              </div>\n            )}\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};