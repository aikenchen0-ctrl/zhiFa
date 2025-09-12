import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface LocationMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const LocationMessage: React.FC<LocationMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'location') return null;

  const { latitude, longitude, address, name, thumbnail } = message.content;

  const handleLocationClick = (e: React.MouseEvent) => {
    if (isQuoted) return;
    e.stopPropagation();
    
    // 打开地图应用
    const mapUrl = `https://maps.google.com?q=${latitude},${longitude}`;
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  // 生成静态地图缩略图URL (使用谷歌静态地图API)
  const getStaticMapUrl = () => {
    if (thumbnail) return thumbnail;
    
    const size = isQuoted ? '150x100' : '300x200';
    const zoom = isQuoted ? 13 : 15;
    const marker = `color:red%7C${latitude},${longitude}`;
    
    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&markers=${marker}&key=YOUR_API_KEY`;
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all duration-200',
        isQuoted 
          ? 'max-w-48 cursor-default' 
          : 'max-w-sm cursor-pointer hover:shadow-lg hover:scale-[1.02]',
        message.sender === 'self'
          ? 'border-white/30 bg-white/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
      onClick={handleLocationClick}
    >
      {/* 地图缩略图 */}
      <div className={cn(
        'bg-gray-200 dark:bg-gray-700 relative overflow-hidden',
        isQuoted ? 'aspect-[3/2]' : 'aspect-[3/2]'
      )}>
        {/* 使用缩略图或生成静态地图 */}
        <img
          src={getStaticMapUrl()}
          alt="位置地图"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,' + btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" fill="#e5e7eb">
                <rect width="300" height="200" fill="#f3f4f6"/>
                <g fill="#9ca3af" text-anchor="middle" dominant-baseline="central">
                  <text x="150" y="90" font-family="Arial" font-size="14">📍</text>
                  <text x="150" y="110" font-family="Arial" font-size="12">地图预览</text>
                </g>
              </svg>
            `);
          }}
        />

        {/* 位置标记覆盖 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center animate-bounce',
            isQuoted ? 'w-6 h-6' : 'w-8 h-8'
          )}>
            <svg className={cn('fill-current', isQuoted ? 'w-3 h-3' : 'w-4 h-4')} viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>

        {/* 如果不是引用模式，显示打开地图提示 */}
        {!isQuoted && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        )}
      </div>

      {/* 位置信息 */}
      <div className={cn('p-3', isQuoted && 'p-2')}>
        {/* 位置名称 */}
        {name && (
          <div className={cn(
            'font-medium truncate mb-1',
            isQuoted ? 'text-xs' : 'text-sm',
            message.sender === 'self'
              ? 'text-white'
              : 'text-gray-900 dark:text-gray-100'
          )}>
            {name}
          </div>
        )}

        {/* 地址 */}
        <div className={cn(
          'line-clamp-2',
          isQuoted ? 'text-xs' : 'text-sm',
          message.sender === 'self'
            ? 'text-white/80'
            : 'text-gray-600 dark:text-gray-400'
        )}>
          {address}
        </div>

        {/* 坐标信息 - 仅在非引用模式下显示 */}
        {!isQuoted && (
          <div className={cn(
            'text-xs mt-2 font-mono',
            message.sender === 'self'
              ? 'text-white/60'
              : 'text-gray-500 dark:text-gray-400'
          )}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>
        )}
      </div>
    </div>
  );
};