import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface LinkMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const LinkMessage: React.FC<LinkMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'link') return null;

  const { url, title, description, thumbnail, favicon } = message.content;

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const domain = new URL(url).hostname;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all duration-200',
        isQuoted 
          ? 'cursor-default' 
          : 'cursor-pointer hover:shadow-md hover:scale-[1.01]',
        message.sender === 'self'
          ? 'border-white/30 bg-white/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      )}
      onClick={handleLinkClick}
    >
      {/* 缩略图 */}
      {thumbnail && !isQuoted && (
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <img
            src={thumbnail}
            alt={title || '链接预览'}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* 链接内容 */}
      <div className={cn('p-3', isQuoted && 'p-2')}>
        {/* 标题 */}
        {title && (
          <div className={cn(
            'font-medium line-clamp-2 mb-1',
            isQuoted ? 'text-xs' : 'text-sm',
            message.sender === 'self'
              ? 'text-white'
              : 'text-gray-900 dark:text-gray-100'
          )}>
            {title}
          </div>
        )}

        {/* 描述 */}
        {description && !isQuoted && (
          <div className={cn(
            'text-sm line-clamp-2 mb-2',
            message.sender === 'self'
              ? 'text-white/80'
              : 'text-gray-600 dark:text-gray-400'
          )}>
            {description}
          </div>
        )}

        {/* 域名和图标 */}
        <div className="flex items-center gap-2">
          {/* 网站图标 */}
          {favicon && (
            <img
              src={favicon}
              alt=""
              className={cn(
                'rounded-sm',
                isQuoted ? 'w-3 h-3' : 'w-4 h-4'
              )}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )}

          {/* 域名 */}
          <span className={cn(
            'truncate',
            isQuoted ? 'text-xs' : 'text-sm',
            message.sender === 'self'
              ? 'text-white/60'
              : 'text-gray-500 dark:text-gray-400'
          )}>
            {domain}
          </span>

          {/* 外链图标 */}
          {!isQuoted && (
            <svg 
              className={cn(
                'flex-shrink-0 w-3 h-3',
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