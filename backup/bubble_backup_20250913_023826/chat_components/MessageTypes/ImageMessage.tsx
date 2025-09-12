import React, { useState } from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface ImageMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const ImageMessage: React.FC<ImageMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'image') return null;

  const { url, thumbnailUrl, width, height, caption } = message.content;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 计算显示尺寸
  const maxWidth = isQuoted ? 60 : 240;
  const maxHeight = isQuoted ? 40 : 320;
  const aspectRatio = width / height;
  
  let displayWidth = width;
  let displayHeight = height;
  
  if (width > maxWidth) {
    displayWidth = maxWidth;
    displayHeight = displayWidth / aspectRatio;
  }
  
  if (displayHeight > maxHeight) {
    displayHeight = maxHeight;
    displayWidth = displayHeight * aspectRatio;
  }

  const handleImageClick = (e: React.MouseEvent) => {
    if (isQuoted) return;
    e.stopPropagation();
    // 触发图片放大预览
    window.open(url, '_blank');
  };

  if (imageError) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg',
        isQuoted ? 'w-12 h-8' : 'w-48 h-32'
      )}>
        <div className="text-gray-400 text-center">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">图片加载失败</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 图片容器 */}
      <div 
        className={cn(
          'relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 transition-all duration-200',
          !isQuoted && 'cursor-pointer hover:shadow-lg'
        )}
        style={{ width: displayWidth, height: displayHeight }}
        onClick={handleImageClick}
      >
        {/* 加载中占位 */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 实际图片 */}
        <img
          src={thumbnailUrl || url}
          alt={caption || '图片'}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />

        {/* 悬停效果 */}
        {!isQuoted && imageLoaded && (
          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* 图片说明文字 */}
      {caption && !isQuoted && (
        <div className="text-sm opacity-75 px-1">
          {caption}
        </div>
      )}
    </div>
  );
};