import React from 'react';
import { motion } from 'framer-motion';
import { AvatarProps } from '@/types/components';
import { cn } from '@/utils/cn';

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
} as const;

const statusColorMap = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
} as const;

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  showStatus = true,
  onClick,
  className,
}) => {
  const initials = user.name
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <motion.div
      className={cn(
        'relative inline-block',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-full ring-2 ring-white shadow-lg',
          sizeMap[size]
        )}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
            {initials}
          </div>
        )}
      </div>
      
      {showStatus && (
        <motion.div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white',
            statusColorMap[user.status],
            size === 'sm' ? 'w-2.5 h-2.5' : 
            size === 'md' ? 'w-3 h-3' :
            size === 'lg' ? 'w-3.5 h-3.5' : 'w-4 h-4'
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        />
      )}
    </motion.div>
  );
};