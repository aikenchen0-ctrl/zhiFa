import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface ContactMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const ContactMessage: React.FC<ContactMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'contact') return null;

  const { name, phone, avatar, company, title } = message.content;

  const handleContactClick = (e: React.MouseEvent) => {
    if (isQuoted) return;
    e.stopPropagation();
    // 这里可以触发联系人详情或添加联系人的操作
    console.log('打开联系人:', name);
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    if (!phone) return;
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg transition-all duration-200',
        isQuoted 
          ? 'p-2 gap-2 cursor-default' 
          : 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        message.sender === 'self'
          ? 'border-white/30 bg-white/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      )}
      onClick={handleContactClick}
    >
      {/* 头像 */}
      <div className={cn(
        'flex-shrink-0 rounded-full overflow-hidden',
        isQuoted ? 'w-8 h-8' : 'w-12 h-12'
      )}>
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn(
            'w-full h-full flex items-center justify-center text-white font-medium',
            'bg-gradient-to-br from-blue-500 to-purple-600',
            isQuoted ? 'text-xs' : 'text-lg'
          )}>
            {name[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* 联系人信息 */}
      <div className="flex-1 min-w-0">
        {/* 姓名 */}
        <div className={cn(
          'font-medium truncate',
          isQuoted ? 'text-xs' : 'text-sm',
          message.sender === 'self'
            ? 'text-white'
            : 'text-gray-900 dark:text-gray-100'
        )}>
          {name}
        </div>

        {/* 职位和公司 */}
        {(title || company) && !isQuoted && (
          <div className={cn(
            'text-xs truncate mt-0.5',
            message.sender === 'self'
              ? 'text-white/70'
              : 'text-gray-600 dark:text-gray-400'
          )}>
            {[title, company].filter(Boolean).join(' • ')}
          </div>
        )}

        {/* 电话号码 */}
        {phone && (
          <div className="flex items-center gap-1 mt-1">
            <svg className={cn(
              'flex-shrink-0',
              isQuoted ? 'w-3 h-3' : 'w-4 h-4',
              message.sender === 'self'
                ? 'text-white/60'
                : 'text-gray-500 dark:text-gray-400'
            )} fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span 
              className={cn(
                'truncate',
                isQuoted ? 'text-xs' : 'text-sm',
                !isQuoted && 'cursor-pointer hover:underline',
                message.sender === 'self'
                  ? 'text-white/80 hover:text-white'
                  : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
              )}
              onClick={handlePhoneClick}
            >
              {phone}
            </span>
          </div>
        )}
      </div>

      {/* 联系人图标 */}
      {!isQuoted && (
        <div className={cn(
          'flex-shrink-0',
          message.sender === 'self'
            ? 'text-white/60'
            : 'text-gray-400'
        )}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};