import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface VoiceMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'voice') return null;

  const { url, duration, waveform, isPlaying } = message.content;
  const [currentTime, setCurrentTime] = useState(0);
  const [isLocalPlaying, setIsLocalPlaying] = useState(isPlaying || false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 播放/暂停控制
  const togglePlayback = async () => {
    if (!audioRef.current) return;

    if (isLocalPlaying) {
      audioRef.current.pause();
      setIsLocalPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsLocalPlaying(true);
      } catch (error) {
        console.error('播放语音失败:', error);
      }
    }
  };

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsLocalPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadedMetadata = () => {
      // 音频元数据加载完成
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // 进度条点击跳转
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || isQuoted) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      'flex items-center gap-3',
      isQuoted ? 'py-1' : 'py-2'
    )}>
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* 播放按钮 */}
      <button
        onClick={togglePlayback}
        disabled={isQuoted}
        className={cn(
          'flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-200',
          isQuoted 
            ? 'w-6 h-6' 
            : 'w-10 h-10 hover:scale-105 active:scale-95',
          message.sender === 'self'
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white',
          isQuoted && 'opacity-60 cursor-default'
        )}
      >
        {isLocalPlaying ? (
          <svg className={cn('fill-current', isQuoted ? 'w-3 h-3' : 'w-5 h-5')} viewBox=\"0 0 24 24\">\n            <rect x=\"6\" y=\"4\" width=\"4\" height=\"16\" />\n            <rect x=\"14\" y=\"4\" width=\"4\" height=\"16\" />\n          </svg>\n        ) : (\n          <svg className={cn('fill-current ml-0.5', isQuoted ? 'w-3 h-3' : 'w-5 h-5')} viewBox=\"0 0 24 24\">\n            <path d=\"M8 5v14l11-7z\" />\n          </svg>\n        )}\n      </button>\n\n      {/* 波形或进度条 */}\n      <div className=\"flex-1 space-y-1\">\n        {waveform && waveform.length > 0 && !isQuoted ? (\n          /* 波形显示 */\n          <div \n            className=\"flex items-center gap-0.5 h-8 cursor-pointer\"\n            onClick={handleProgressClick}\n          >\n            {waveform.map((amplitude, index) => {\n              const isActive = (index / waveform.length) * 100 <= progress;\n              return (\n                <div\n                  key={index}\n                  className={cn(\n                    'w-0.5 rounded-full transition-all duration-150',\n                    isActive \n                      ? message.sender === 'self'\n                        ? 'bg-white'\n                        : 'bg-blue-600'\n                      : message.sender === 'self'\n                        ? 'bg-white/30'\n                        : 'bg-gray-300 dark:bg-gray-600'\n                  )}\n                  style={{\n                    height: `${Math.max(4, Math.min(32, amplitude * 32))}px`\n                  }}\n                />\n              );\n            })}\n          </div>\n        ) : (\n          /* 简单进度条 */\n          <div \n            className={cn(\n              'relative rounded-full transition-all duration-200',\n              isQuoted ? 'h-1' : 'h-2 cursor-pointer hover:h-2.5',\n              message.sender === 'self'\n                ? 'bg-white/20'\n                : 'bg-gray-200 dark:bg-gray-700'\n            )}\n            onClick={handleProgressClick}\n          >\n            <div \n              className={cn(\n                'h-full rounded-full transition-all duration-300',\n                message.sender === 'self'\n                  ? 'bg-white'\n                  : 'bg-blue-500'\n              )}\n              style={{ width: `${progress}%` }}\n            />\n          </div>\n        )}\n\n        {/* 时间显示 */}\n        <div className={cn(\n          'flex justify-between text-xs',\n          isQuoted ? 'text-xs' : '',\n          message.sender === 'self'\n            ? 'text-white/70'\n            : 'text-gray-500 dark:text-gray-400'\n        )}>\n          <span>{formatTime(currentTime)}</span>\n          <span>{formatTime(duration)}</span>\n        </div>\n      </div>\n    </div>\n  );\n};