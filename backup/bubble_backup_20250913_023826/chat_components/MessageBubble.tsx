import React, { useState, useRef, useEffect } from 'react';
import { Message, BubbleStyle, ActionType, BubbleProps } from '../../types/chat';
import { DetailedBubble } from './DetailedBubble';
import { SimpleBubble } from './SimpleBubble';
import { ActionMenu } from './ActionMenu';
import { cn } from '../../utils/cn';

interface MessageBubbleProps extends BubbleProps {
  onLongPress?: () => void;
  longPressDelay?: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  style,
  showActions = false,
  onActionClick,
  onBubbleClick,
  onBubbleLongPress,
  isMultiSelectMode = false,
  className,
  onLongPress,
  longPressDelay = 800
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // 处理长按开始
  const handlePressStart = () => {
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      setShowActionMenu(true);
      onBubbleLongPress?.();
      onLongPress?.();
    }, longPressDelay);
  };

  // 处理长按结束
  const handlePressEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 处理点击
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showActionMenu) {
      onBubbleClick?.();
    }
  };

  // 处理操作点击
  const handleActionClick = (action: ActionType) => {
    setShowActionMenu(false);
    onActionClick?.(action);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionMenu]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const bubbleComponent = style === 'detailed' ? (
    <DetailedBubble
      message={message}
      style={style}
      showActions={showActions}
      onActionClick={onActionClick}
      onBubbleClick={onBubbleClick}
      onBubbleLongPress={onBubbleLongPress}
      isMultiSelectMode={isMultiSelectMode}
    />
  ) : (
    <SimpleBubble
      message={message}
      style={style}
      showActions={showActions}
      onActionClick={onActionClick}
      onBubbleClick={onBubbleClick}
      onBubbleLongPress={onBubbleLongPress}
      isMultiSelectMode={isMultiSelectMode}
    />
  );

  return (
    <div
      ref={bubbleRef}
      className={cn(
        'relative transition-all duration-200 ease-in-out',
        isPressed && 'scale-95',
        className
      )}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onClick={handleClick}
    >
      {bubbleComponent}
      
      {showActionMenu && (
        <ActionMenu
          message={message}
          onActionClick={handleActionClick}
          onClose={() => setShowActionMenu(false)}
          position={message.sender === 'self' ? 'left' : 'right'}
        />
      )}
    </div>
  );
};