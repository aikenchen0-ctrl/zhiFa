import React, { useEffect, useRef } from 'react';
import { ActionType } from '../../types/chat';
import { cn } from '../../utils/cn';

interface ActionMenuProps {
  onAction: (action: ActionType) => void;
  position?: 'left' | 'right';
  onClose?: () => void;
}

interface ActionButton {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  onAction,
  position = 'right',
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 获取所有可用操作（按你要求的8种操作）
  const getAvailableActions = (): ActionButton[] => {
    return [
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
        type: 'copy',
        label: '复制',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
        type: 'enlarge',
        label: '放大',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        )
      },
      {
        type: 'delete',
        label: '删除',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        variant: 'danger'
      }
    ];
  };

  const actions = getAvailableActions();

  // 处理操作点击
  const handleActionClick = (actionType: ActionType) => {
    onAction(actionType);
    onClose?.();
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    if (onClose) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute z-50 -top-2 transform -translate-y-full',
        'py-2 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-xl border border-white/30 dark:border-gray-700/50',
        'backdrop-blur-lg',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        position === 'left' ? 'left-0' : 'right-0',
        'min-w-[280px]'
      )}
    >
      {/* 操作按钮网格 - 2行4列布局 */}
      <div className="grid grid-cols-4 grid-rows-2 gap-1 px-2">
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleActionClick(action.type)}
            disabled={action.disabled}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-2 text-xs rounded-lg transition-all duration-150',
              'hover:bg-white/80 dark:hover:bg-gray-700/80 active:bg-white/90 dark:active:bg-gray-600/80',
              'hover:scale-105 active:scale-95',
              'backdrop-blur-sm border border-transparent hover:border-white/40 dark:hover:border-gray-600/40',
              action.variant === 'danger' 
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/30 hover:border-red-200 dark:hover:border-red-800' 
                : 'text-gray-700 dark:text-gray-300',
              action.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:scale-100'
            )}
          >
            <span className="flex-shrink-0 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
              {action.icon}
            </span>
            <span className="text-center font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* 小三角箭头指示器 */}
      <div className={cn(
        'absolute top-full w-0 h-0',
        'border-l-[8px] border-r-[8px] border-t-[8px]',
        'border-l-transparent border-r-transparent border-t-white/95 dark:border-t-gray-800/95',
        position === 'left' ? 'left-4' : 'right-4'
      )} />
    </div>
  );
};