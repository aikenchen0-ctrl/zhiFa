import React from 'react';
import { motion } from 'framer-motion';
import { MessageBubbleProps } from '@/types/components';
import { Avatar } from './Avatar';
import { cn } from '@/utils/cn';

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  user,
  position = 'right',
  showAvatar = true,
  showTimestamp = true,
  className,
}) => {
  const isLeft = position === 'left';
  
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const bubbleVariants = {
    initial: { opacity: 0, scale: 0.8, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: -10 },
  };

  return (
    <motion.div
      className={cn(
        'flex items-end gap-2 max-w-sm',
        isLeft ? 'flex-row' : 'flex-row-reverse ml-auto',
        className
      )}
      variants={bubbleVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {showAvatar && (
        <div className={cn('flex-shrink-0', !showAvatar && 'invisible')}>
          <Avatar user={user} size="sm" showStatus={false} />
        </div>
      )}
      
      <div className="flex flex-col gap-1 min-w-0">
        <motion.div
          className={cn(
            'relative px-3 py-2 rounded-2xl max-w-xs break-words',
            'backdrop-blur-sm shadow-sm',
            isLeft
              ? 'bg-white/90 text-gray-900 rounded-bl-md'
              : 'bg-blue-500/90 text-white rounded-br-md',
            // Message type specific styles
            message.type === 'system' && 'bg-gray-100/90 text-gray-600 italic text-sm'
          )}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.1 }}
        >
          {/* Message content */}
          <div className="relative z-10">
            {message.type === 'text' && (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
            
            {message.type === 'image' && (
              <div className="space-y-2">
                <img
                  src={message.content}
                  alt="Shared image"
                  className="rounded-lg max-w-full h-auto"
                  loading="lazy"
                />
              </div>
            )}
            
            {message.type === 'file' && (
              <div className="flex items-center gap-2 p-2 bg-black/10 rounded-lg">
                <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center">
                  <span className="text-xs font-mono text-white">
                    {message.content.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                </div>
                <span className="text-sm font-medium truncate">
                  {message.content.split('/').pop() || 'Unknown file'}
                </span>
              </div>
            )}
            
            {message.type === 'system' && (
              <p className="text-xs">{message.content}</p>
            )}
          </div>
          
          {/* Tail */}
          <div
            className={cn(
              'absolute bottom-0 w-3 h-3',
              isLeft
                ? '-left-1 bg-white/90 transform rotate-45 rounded-bl-sm'
                : '-right-1 bg-blue-500/90 transform rotate-45 rounded-br-sm'
            )}
          />
        </motion.div>
        
        {showTimestamp && (
          <motion.div
            className={cn(
              'text-xs text-gray-500 px-1',
              isLeft ? 'text-left' : 'text-right'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {formatTime(message.timestamp)}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};