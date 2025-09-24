import React, { createContext, useContext, useState } from 'react';
import { ActionType, MultiSelectState } from '../../types/chat';
import { cn } from '../../utils/cn';

// 多选模式上下文
const MultiSelectContext = createContext<MultiSelectState | null>(null);

// 多选模式提供者
interface MultiSelectProviderProps {
  children: React.ReactNode;
  onBatchAction?: (action: ActionType, messageIds: string[]) => void;
}

export const MultiSelectProvider: React.FC<MultiSelectProviderProps> = ({
  children,
  onBatchAction
}) => {
  const [isActive, setIsActive] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const toggleMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    // 这里需要从外部传入所有消息ID或通过其他方式获取
    console.log('全选功能需要消息列表数据');
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
    setIsActive(false);
  };

  const handleBatchAction = (action: ActionType) => {
    if (selectedMessages.size === 0) return;
    
    const messageIds = Array.from(selectedMessages);
    onBatchAction?.(action, messageIds);
    
    // 执行批量操作后清空选择
    if (action !== 'multi-select') {
      clearSelection();
    }
  };

  const multiSelectState: MultiSelectState = {
    isActive,
    selectedMessages,
    onToggleMessage: toggleMessage,
    onSelectAll: selectAll,
    onClearSelection: clearSelection,
    onBatchAction: handleBatchAction
  };

  return (
    <MultiSelectContext.Provider value={multiSelectState}>
      <div className="relative">
        {children}
        {isActive && (
          <MultiSelectToolbar
            selectedCount={selectedMessages.size}
            onAction={handleBatchAction}
            onCancel={clearSelection}
            onSelectAll={selectAll}
          />
        )}
      </div>
    </MultiSelectContext.Provider>
  );
};

// 多选模式工具栏
interface MultiSelectToolbarProps {
  selectedCount: number;
  onAction: (action: ActionType) => void;
  onCancel: () => void;
  onSelectAll: () => void;
}

const MultiSelectToolbar: React.FC<MultiSelectToolbarProps> = ({
  selectedCount,
  onAction,
  onCancel,
  onSelectAll
}) => {
  const actions = [
    {
      type: 'forward' as ActionType,
      label: '转发',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    },
    {
      type: 'collect' as ActionType,
      label: '收藏',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )
    },
    {
      type: 'delete' as ActionType,
      label: '删除',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: 'danger'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* 左侧：取消和全选 */}
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            取消
          </button>
          
          <button
            onClick={onSelectAll}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm"
          >
            全选
          </button>
        </div>

        {/* 中间：选择计数 */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          已选择 {selectedCount} 条
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.type}
              onClick={() => onAction(action.type)}
              disabled={selectedCount === 0}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-[60px]',
                selectedCount === 0 
                  ? 'opacity-50 cursor-not-allowed'
                  : action.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {action.icon}
              <span className="text-xs mt-1">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 复选框组件
interface MultiSelectCheckboxProps {
  messageId: string;
  isSelected: boolean;
}

export const MultiSelectCheckbox: React.FC<MultiSelectCheckboxProps> = ({
  messageId,
  isSelected
}) => {
  const multiSelectState = useContext(MultiSelectContext);

  if (!multiSelectState?.isActive) {
    return null;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        multiSelectState.onToggleMessage(messageId);
      }}
      className={cn(
        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
        'hover:scale-110 active:scale-95',
        isSelected
          ? 'bg-blue-500 border-blue-500 text-white'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
      )}
    >
      {isSelected && (
        <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};

// Hook来使用多选状态
export const useMultiSelect = () => {
  const context = useContext(MultiSelectContext);
  if (!context) {
    throw new Error('useMultiSelect must be used within a MultiSelectProvider');
  }
  return context;
};