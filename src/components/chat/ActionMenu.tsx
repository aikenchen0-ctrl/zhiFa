import React, { useEffect, useRef } from 'react';
import { ActionType } from '../../types/chat';
import { cn } from '../../utils/cn';
import '../../styles/bubble-styles.css';

interface ActionMenuProps {
  onAction: (action: ActionType) => void;
  position?: 'left' | 'right';
  onClose?: () => void;
}

interface ActionButton {
  type: ActionType;
  label: string;
  icon: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  onAction,
  position = 'right',
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 8个操作按钮 - 严格按照 bubble-demo.html 标准顺序，仅文字无图标
  const getAvailableActions = (): ActionButton[] => {
    return [
      {
        type: 'aside',
        label: '话外音',
        icon: ''
      },
      {
        type: 'copy',
        label: '复制',
        icon: ''
      },
      {
        type: 'forward',
        label: '转发',
        icon: ''
      },
      {
        type: 'collect',
        label: '收藏',
        icon: ''
      },
      {
        type: 'multi-select',
        label: '多选',
        icon: ''
      },
      {
        type: 'quote',
        label: '引用',
        icon: ''
      },
      {
        type: 'enlarge',
        label: '放大',
        icon: ''
      },
      {
        type: 'delete',
        label: '删除',
        icon: '',
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
        'action-menu rounded-xl shadow-xl min-w-[280px]',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        position === 'left' ? 'left-0' : 'right-0'
      )}
    >
      {/* 操作按钮网格 - 2行4列布局，严格按照 bubble-demo.html 标准 */}
      <div className="grid grid-cols-4 grid-rows-2 gap-1 px-2 py-2">
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleActionClick(action.type)}
            disabled={action.disabled}
            className={cn(
              'flex items-center justify-center p-2 text-xs rounded-lg transition-all duration-150',
              action.variant === 'danger' 
                ? 'text-red-600 hover:bg-red-50/80' 
                : 'text-gray-700 hover:bg-white/80',
              action.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* 小三角箭头指示器 - 基于 bubble-demo.html 标准 */}
      <div className={cn(
        'absolute top-full w-0 h-0',
        'border-l-[8px] border-r-[8px] border-t-[8px]',
        'border-l-transparent border-r-transparent border-t-white/95',
        position === 'left' ? 'left-4' : 'right-4'
      )} />
    </div>
  );
};