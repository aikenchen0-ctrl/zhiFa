import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface SystemMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (!['system', 'group-management', 'voice-call', 'video-call', 'service-notification', 'quote-notification'].includes(message.type)) {
    return null;
  }

  const { text, actionType } = message.content;

  // 根据消息类型和操作类型获取图标
  const getMessageIcon = () => {
    switch (message.type) {
      case 'voice-call':
        return '📞';
      case 'video-call':
        return '📹';
      case 'service-notification':
        return '🔔';
      case 'quote-notification':
        return '💬';
      case 'group-management':
      case 'system':
        switch (actionType) {
          case 'join':
            return '👋';
          case 'leave':
            return '👋';
          case 'kick':
            return '❌';
          case 'admin':
            return '👑';
          case 'name-change':
            return '✏️';
          case 'announcement':
            return '📢';
          default:
            return '💬';
        }
      default:
        return '💬';
    }
  };

  // 根据消息类型获取样式配置
  const getStyleConfig = () => {
    switch (message.type) {
      case 'voice-call':
      case 'video-call':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-200 dark:border-blue-800'
        };
      case 'service-notification':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-200 dark:border-green-800'
        };
      case 'quote-notification':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-200 dark:border-purple-800'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          text: 'text-gray-600 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-700'
        };
    }
  };

  const styleConfig = getStyleConfig();

  if (isQuoted) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs">{getMessageIcon()}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2 px-4">
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-full border text-sm max-w-xs',
        styleConfig.bg,
        styleConfig.text,
        styleConfig.border,
        // 特殊消息类型的额外样式
        message.type === 'voice-call' && 'shadow-sm',
        message.type === 'video-call' && 'shadow-sm',
        message.type === 'service-notification' && 'shadow-sm',
      )}>
        {/* 图标 */}
        <span className="flex-shrink-0">
          {getMessageIcon()}
        </span>

        {/* 消息文本 */}
        <span className="text-center flex-1">
          {text}
        </span>

        {/* 特殊操作按钮 - 通话消息 */}
        {(message.type === 'voice-call' || message.type === 'video-call') && (
          <button 
            className={cn(
              'flex-shrink-0 p-1 rounded-full transition-colors',
              'hover:bg-white/20 active:bg-white/30'
            )}
            onClick={(e) => {
              e.stopPropagation();
              console.log('重新拨打:', message.type);
            }}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};