import React, { useState, useEffect } from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface AnimatedEmojiMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const AnimatedEmojiMessage: React.FC<AnimatedEmojiMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'animated-emoji') return null;

  const { emojiId, url, width, height } = message.content;
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(!isQuoted);

  // 计算显示尺寸
  const maxSize = isQuoted ? 40 : 120;
  const aspectRatio = width / height;
  
  let displayWidth = width;
  let displayHeight = height;
  
  if (width > maxSize || height > maxSize) {
    if (aspectRatio >= 1) {
      displayWidth = maxSize;
      displayHeight = maxSize / aspectRatio;
    } else {
      displayHeight = maxSize;
      displayWidth = maxSize * aspectRatio;
    }
  }

  // 处理动画播放控制
  const handleEmojiClick = (e: React.MouseEvent) => {
    if (isQuoted) return;
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  // 自动播放控制
  useEffect(() => {
    if (!isQuoted && isLoaded) {
      const timer = setTimeout(() => {
        setIsPlaying(false);
      }, 3000); // 3秒后暂停动画

      return () => clearTimeout(timer);
    }
  }, [isLoaded, isQuoted]);

  // 错误时的fallback表情
  const getFallbackEmoji = () => {
    const fallbackMap: Record<string, string> = {
      'heart': '❤️',
      'laugh': '😂',
      'cry': '😢',
      'angry': '😠',
      'surprise': '😲',
      'kiss': '😘',
      'thumbs-up': '👍',
      'clap': '👏',
      'fire': '🔥',
      'star': '⭐',
    };
    
    return fallbackMap[emojiId] || '😊';
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center transition-transform duration-200',
          !isQuoted && 'hover:scale-110 cursor-pointer'
        )}
        style={{ width: displayWidth, height: displayHeight }}
        onClick={handleEmojiClick}
      >
        <span 
          className="text-4xl animate-bounce"
          style={{ fontSize: isQuoted ? '1.5rem' : '3rem' }}
        >
          {getFallbackEmoji()}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'relative transition-all duration-300',
        !isQuoted && 'cursor-pointer hover:scale-110 active:scale-95',
        isPlaying && 'animate-pulse'
      )}
      style={{ width: displayWidth, height: displayHeight }}
      onClick={handleEmojiClick}
    >
      {/* 加载状态 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'animate-spin rounded-full border-2 border-gray-300 border-t-blue-500',
            isQuoted ? 'w-6 h-6' : 'w-8 h-8'
          )}></div>
        </div>
      )}

      {/* 动画表情 */}
      <img
        src={url}
        alt={`动画表情 ${emojiId}`}
        className={cn(
          'w-full h-full object-contain transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          // 动画播放控制
          !isPlaying && !isQuoted && 'filter grayscale-[0.3] opacity-60'
        )}
        style={{
          // 如果是GIF，控制播放状态
          animationPlayState: isPlaying ? 'running' : 'paused'
        }}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />

      {/* 播放控制提示 */}
      {!isQuoted && !isPlaying && isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
            <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* 特殊效果 - 点赞、爱心等特殊表情的粒子效果 */}
      {!isQuoted && isPlaying && (emojiId === 'heart' || emojiId === 'thumbs-up') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'absolute w-2 h-2 rounded-full opacity-70 animate-bounce',
                emojiId === 'heart' ? 'bg-red-400' : 'bg-yellow-400'
              )}
              style={{
                left: `${20 + i * 10}%`,
                top: `${20 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};