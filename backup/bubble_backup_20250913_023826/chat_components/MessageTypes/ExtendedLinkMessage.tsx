import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface ExtendedLinkMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const ExtendedLinkMessage: React.FC<ExtendedLinkMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'extended-link') return null;

  const { url, title, description, thumbnail, siteName, author, publishTime } = message.content;

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatPublishTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all duration-200 max-w-sm',
        isQuoted 
          ? 'cursor-default max-w-full' 
          : 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
        message.sender === 'self'
          ? 'border-white/30 bg-white/10 backdrop-blur-sm'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
      onClick={handleLinkClick}
    >
      {/* 缩略图 */}
      {thumbnail && (
        <div className={cn(
          'bg-gray-100 dark:bg-gray-800 overflow-hidden',
          isQuoted ? 'aspect-video' : 'aspect-[16/10]'
        )}>
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.parentElement?.classList.add('hidden');
            }}
          />
        </div>
      )}

      {/* 内容区域 */}
      <div className={cn('p-4', isQuoted && 'p-3')}>
        {/* 网站名称 */}
        {siteName && (
          <div className={cn(
            'font-medium text-xs uppercase tracking-wider mb-2',
            message.sender === 'self'
              ? 'text-white/70'
              : 'text-blue-600 dark:text-blue-400'
          )}>
            {siteName}
          </div>
        )}

        {/* 标题 */}
        <h3 className={cn(
          'font-bold line-clamp-2 mb-2',
          isQuoted ? 'text-sm' : 'text-base',
          message.sender === 'self'
            ? 'text-white'
            : 'text-gray-900 dark:text-gray-100'
        )}>
          {title}
        </h3>

        {/* 描述 */}
        {description && !isQuoted && (
          <p className={cn(
            'text-sm line-clamp-3 mb-3',
            message.sender === 'self'
              ? 'text-white/80'
              : 'text-gray-600 dark:text-gray-400'
          )}>
            {description}
          </p>
        )}

        {/* 元信息 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {/* 作者 */}
            {author && (
              <span className={cn(
                message.sender === 'self'
                  ? 'text-white/60'
                  : 'text-gray-500 dark:text-gray-400'
              )}>
                {author}
              </span>
            )}

            {/* 分隔符 */}
            {author && publishTime && (
              <span className={cn(
                message.sender === 'self'
                  ? 'text-white/40'
                  : 'text-gray-300 dark:text-gray-600'
              )}>
                •
              </span>
            )}

            {/* 发布时间 */}
            {publishTime && (
              <span className={cn(
                message.sender === 'self'
                  ? 'text-white/60'
                  : 'text-gray-500 dark:text-gray-400'
              )}>
                {formatPublishTime(publishTime)}
              </span>
            )}
          </div>

          {/* 外链图标 */}
          {!isQuoted && (
            <svg 
              className={cn(
                'w-4 h-4',
                message.sender === 'self'
                  ? 'text-white/60'
                  : 'text-gray-400'
              )} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};