import React, { useEffect, useRef } from 'react';
import { Message, ActionType } from '../../types/chat';
import { cn } from '../../utils/cn';

interface ActionMenuProps {
  message: Message;
  onActionClick: (action: ActionType) => void;
  onClose: () => void;
  position?: 'left' | 'right';
}

interface ActionButton {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  message,
  onActionClick,
  onClose,
  position = 'right'
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 根据消息类型获取可用的操作
  const getAvailableActions = (): ActionButton[] => {
    const baseActions: ActionButton[] = [
      {
        type: 'aside',
        label: '话外音',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      },
      {
        type: 'quote',
        label: '引用',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        )
      },
      {
        type: 'forward',
        label: '转发',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )
      },
      {
        type: 'collect',
        label: '收藏',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )
      },
      {
        type: 'multi-select',
        label: '多选',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    ];

    // 根据消息类型添加特殊操作
    const additionalActions: ActionButton[] = [];

    // 复制操作 - 文本消息支持
    if (message.type === 'text') {
      additionalActions.push({
        type: 'copy',
        label: '复制',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      });
    }

    // 放大操作 - 图片、视频消息支持
    if (['image', 'video'].includes(message.type)) {
      additionalActions.push({
        type: 'enlarge',
        label: '放大',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        )
      });
    }

    // 删除操作 - 只有自己的消息可以删除
    if (message.sender === 'self') {
      additionalActions.push({
        type: 'delete',
        label: '删除',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        variant: 'danger'
      });
    }

    return [...baseActions, ...additionalActions];
  };

  const actions = getAvailableActions();

  // 处理操作点击
  const handleActionClick = (action: ActionType) => {
    onActionClick(action);
    onClose();
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute z-50 mt-2 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700',
        'backdrop-blur-lg bg-white/95 dark:bg-gray-800/95',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        position === 'left' ? 'left-0' : 'right-0',
        'min-w-[120px]'
      )}
    >
      {/* 操作按钮列表 */}
      <div className="space-y-1 px-1">
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleActionClick(action.type)}
            disabled={action.disabled}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600',
              action.variant === 'danger' 
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                : 'text-gray-700 dark:text-gray-300',
              action.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
            )}
          >
            <span className="flex-shrink-0">
              {action.icon}
            </span>
            <span className="flex-1 text-left">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

      {/* 消息信息 */}
      <div className="px-3 py-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleString('zh-CN')}
        </div>
        {message.sender !== 'self' && message.senderName && (
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {message.senderName}
          </div>
        )}
      </div>
    </div>
  );
};