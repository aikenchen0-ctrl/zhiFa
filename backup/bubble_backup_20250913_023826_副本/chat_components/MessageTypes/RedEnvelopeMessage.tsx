import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface RedEnvelopeMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const RedEnvelopeMessage: React.FC<RedEnvelopeMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'red-envelope') return null;

  const { amount, message: redEnvelopeMessage, isOpened, isExpired } = message.content;

  const handleRedEnvelopeClick = (e: React.MouseEvent) => {
    if (isQuoted || isOpened || isExpired) return;
    e.stopPropagation();
    
    // 触发红包打开逻辑
    console.log('打开红包:', message.id);
  };

  const getStatusText = () => {
    if (isExpired) return '红包已过期';
    if (isOpened) return '已领取';
    return '点击领取';
  };

  const getStatusColor = () => {
    if (isExpired) return 'text-gray-400';
    if (isOpened) return 'text-green-400';
    return 'text-yellow-300';
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl transition-all duration-300',
        isQuoted ? 'max-w-40' : 'max-w-64',
        !isQuoted && !isOpened && !isExpired && 'cursor-pointer hover:scale-105 active:scale-95',
        (isOpened || isExpired) && 'opacity-75'
      )}
      onClick={handleRedEnvelopeClick}
    >
      {/* 红包背景 */}
      <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-4 text-white">
        {/* 装饰性图案 */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
            <pattern id="redEnvelopePattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" />
              <circle cx="5" cy="15" r="0.5" />
              <circle cx="15" cy="5" r="0.5" />
            </pattern>
            <rect width="100" height="100" fill="url(#redEnvelopePattern)" />
          </svg>
        </div>

        {/* 红包内容 */}
        <div className="relative z-10 text-center">
          {/* 红包图标 */}
          <div className={cn(
            'mx-auto mb-3 flex items-center justify-center',
            isQuoted ? 'w-8 h-8 text-2xl' : 'w-12 h-12 text-4xl'
          )}>
            🧧
          </div>

          {/* 金额 */}
          {!isQuoted && (
            <div className="mb-2">
              <span className="text-lg font-bold">¥{amount.toFixed(2)}</span>
            </div>
          )}

          {/* 红包消息 */}
          <div className={cn(
            'font-medium mb-3',
            isQuoted ? 'text-xs' : 'text-sm'
          )}>
            {redEnvelopeMessage || '恭喜发财，大吉大利'}
          </div>

          {/* 状态 */}
          <div className={cn(
            'text-xs',
            getStatusColor()
          )}>
            {getStatusText()}
          </div>
        </div>

        {/* 闪光效果 - 仅在未打开且未过期时显示 */}
        {!isOpened && !isExpired && !isQuoted && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -inset-2 bg-gradient-to-r from-transparent via-yellow-200 to-transparent skew-x-12 animate-shimmer"></div>
          </div>
        )}
      </div>

      {/* 底部装饰 */}
      {!isQuoted && (
        <div className="h-3 bg-gradient-to-b from-red-700 to-red-800 flex items-center justify-center">
          <div className="w-16 h-0.5 bg-red-500 rounded-full"></div>
        </div>
      )}

      {/* 已领取遮罩 */}
      {(isOpened || isExpired) && !isQuoted && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
            {isExpired ? '已过期' : '已领取'}
          </div>
        </div>
      )}
    </div>
  );
};