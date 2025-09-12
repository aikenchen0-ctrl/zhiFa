import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface MiniProgramMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const MiniProgramMessage: React.FC<MiniProgramMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'mini-program') return null;

  const { title, description, thumbnail, appId, path } = message.content;

  const handleMiniProgramClick = (e: React.MouseEvent) => {
    if (isQuoted) return;
    e.stopPropagation();
    
    // 触发小程序打开逻辑
    console.log('打开小程序:', { appId, path });
    // 在实际应用中，这里会调用微信小程序的打开API
  };

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all duration-200 max-w-sm',
        isQuoted 
          ? 'cursor-default max-w-full' 
          : 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
        message.sender === 'self'
          ? 'border-white/30 bg-white/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
      onClick={handleMiniProgramClick}
    >
      {/* 小程序标识条 */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 text-xs font-medium',
        message.sender === 'self'
          ? 'bg-white/20 text-white/80'
          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      )}>
        {/* 小程序图标 */}
        <div className={cn(
          'w-4 h-4 rounded-sm flex items-center justify-center text-xs',
          'bg-green-500 text-white'
        )}>
          小
        </div>
        <span>小程序</span>
      </div>

      {/* 内容区域 */}
      <div className="flex gap-3 p-3">
        {/* 缩略图 */}
        <div className={cn(
          'flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700',
          isQuoted ? 'w-12 h-12' : 'w-16 h-16'
        )}>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                target.parentElement!.innerHTML = `
                  <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                `;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
            </div>
          )}
        </div>

        {/* 文字信息 */}
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h3 className={cn(
            'font-medium line-clamp-2 mb-1',
            isQuoted ? 'text-xs' : 'text-sm',
            message.sender === 'self'
              ? 'text-white'
              : 'text-gray-900 dark:text-gray-100'
          )}>
            {title}
          </h3>

          {/* 描述 */}
          {description && (
            <p className={cn(
              'line-clamp-2',
              isQuoted ? 'text-xs' : 'text-sm',
              message.sender === 'self'
                ? 'text-white/70'
                : 'text-gray-600 dark:text-gray-400'
            )}>
              {description}
            </p>
          )}

          {/* 小程序ID - 仅在非引用模式下显示 */}
          {!isQuoted && appId && (
            <div className="mt-2">
              <span className={cn(
                'text-xs font-mono px-2 py-1 rounded',
                message.sender === 'self'
                  ? 'bg-white/20 text-white/60'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              )}>
                {appId}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作提示 */}
      {!isQuoted && (
        <div className={cn(
          'flex items-center justify-between px-3 py-2 text-xs border-t',
          message.sender === 'self'
            ? 'border-white/20 text-white/60'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
        )}>
          <span>点击进入小程序</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};