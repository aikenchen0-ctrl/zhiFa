import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface FileMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const FileMessage: React.FC<FileMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'file') return null;

  const { name, size, url, extension, icon } = message.content;

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 根据文件扩展名获取图标
  const getFileIcon = () => {
    if (icon) return icon;
    
    const ext = extension.toLowerCase();
    const iconMap: Record<string, string> = {
      // 文档
      pdf: '📄', doc: '📝', docx: '📝', txt: '📄', rtf: '📄',
      // 表格
      xls: '📊', xlsx: '📊', csv: '📊',
      // 演示文稿
      ppt: '📽️', pptx: '📽️',
      // 图片
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', svg: '🖼️',
      // 音频
      mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
      // 视频
      mp4: '🎬', avi: '🎬', mov: '🎬', wmv: '🎬',
      // 压缩文件
      zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️',
      // 代码
      js: '⚡', ts: '🔷', html: '🌐', css: '🎨', py: '🐍', java: '☕',
    };
    
    return iconMap[ext] || '📎';
  };

  // 下载文件
  const handleDownload = (e: React.MouseEvent) => {
    if (isQuoted) return;
    e.stopPropagation();
    
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
        isQuoted 
          ? 'p-2 gap-2' 
          : 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        message.sender === 'self'
          ? 'bg-white/10 border-white/20 hover:bg-white/20'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
      )}
      onClick={handleDownload}
    >
      {/* 文件图标 */}
      <div className={cn(
        'flex-shrink-0 flex items-center justify-center rounded-lg',
        isQuoted ? 'w-8 h-8 text-lg' : 'w-12 h-12 text-2xl',
        message.sender === 'self'
          ? 'bg-white/20'
          : 'bg-blue-50 dark:bg-blue-900/30'
      )}>
        <span>{getFileIcon()}</span>
      </div>

      {/* 文件信息 */}
      <div className="flex-1 min-w-0">
        {/* 文件名 */}
        <div className={cn(
          'font-medium truncate',
          isQuoted ? 'text-xs' : 'text-sm',
          message.sender === 'self'
            ? 'text-white'
            : 'text-gray-900 dark:text-gray-100'
        )}>
          {name}
        </div>

        {/* 文件详情 */}
        {!isQuoted && (
          <div className="flex items-center gap-2 mt-1">
            {/* 文件大小 */}
            <span className={cn(
              'text-xs',
              message.sender === 'self'
                ? 'text-white/70'
                : 'text-gray-500 dark:text-gray-400'
            )}>
              {formatFileSize(size)}
            </span>

            {/* 文件扩展名 */}
            {extension && (
              <>
                <span className={cn(
                  'text-xs',
                  message.sender === 'self'
                    ? 'text-white/50'
                    : 'text-gray-400 dark:text-gray-500'
                )}>
                  •
                </span>
                <span className={cn(
                  'text-xs uppercase font-mono',
                  message.sender === 'self'
                    ? 'text-white/70'
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  {extension}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 下载图标 */}
      {!isQuoted && (
        <div className={cn(
          'flex-shrink-0',
          message.sender === 'self'
            ? 'text-white/50'
            : 'text-gray-400 dark:text-gray-500'
        )}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
    </div>
  );
};