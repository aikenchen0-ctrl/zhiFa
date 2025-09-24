import React, { useState, useRef } from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface VideoMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'video') return null;

  const { url, thumbnailUrl, duration, width, height, caption } = message.content;
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 计算显示尺寸
  const maxWidth = isQuoted ? 80 : 280;
  const maxHeight = isQuoted ? 60 : 200;
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

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 播放控制
  const togglePlay = async () => {
    if (isQuoted) return;
    
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      try {
        await video.play();
      } catch (error) {
        console.error('视频播放失败:', error);
      }
    }
  };

  // 点击视频区域
  const handleVideoClick = (e: React.MouseEvent) => {
    if (isQuoted) {
      e.stopPropagation();
      return;
    }
    togglePlay();
  };

  return (
    <div className="space-y-2">
      {/* 视频容器 */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden bg-black transition-all duration-200',
          !isQuoted && 'cursor-pointer hover:shadow-lg'
        )}
        style={{ width: displayWidth, height: displayHeight }}
        onMouseEnter={() => !isQuoted && setShowControls(true)}
        onMouseLeave={() => !isQuoted && setShowControls(false)}
        onClick={handleVideoClick}
      >
        {/* 视频元素 */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster={thumbnailUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          muted={isQuoted}
          controls={false}
        >
          <source src={url} type="video/mp4" />
          您的浏览器不支持视频播放
        </video>

        {/* 播放按钮覆盖层 */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className={cn(
              'rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-200',
              isQuoted ? 'w-8 h-8' : 'w-16 h-16 hover:scale-110'
            )}>
              <svg 
                className={cn(
                  'text-white fill-current ml-1',
                  isQuoted ? 'w-4 h-4' : 'w-8 h-8'
                )} 
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* 视频控制条 - 仅在非引用模式下显示 */}
        {!isQuoted && showControls && isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="flex items-center gap-2 text-white text-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 时长标签 */}
        {duration && !isPlaying && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* 视频说明文字 */}
      {caption && !isQuoted && (
        <div className="text-sm opacity-75 px-1">
          {caption}
        </div>
      )}
    </div>
  );
};