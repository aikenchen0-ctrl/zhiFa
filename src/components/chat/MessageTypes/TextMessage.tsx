import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface TextMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const TextMessage: React.FC<TextMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'text') return null;

  const { text } = message.content;

  // URL检测和链接化
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <div className={cn(
      'whitespace-pre-wrap break-words',
      isQuoted ? 'text-xs' : 'text-sm',
      // 表情符号放大
      /^[\p{Emoji}\s]*$/u.test(text) && !isQuoted && 'text-3xl leading-relaxed'
    )}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'underline hover:no-underline transition-colors',
                message.sender === 'self' 
                  ? 'text-blue-100 hover:text-white' 
                  : 'text-blue-500 hover:text-blue-600'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};