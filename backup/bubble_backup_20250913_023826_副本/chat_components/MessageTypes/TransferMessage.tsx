import React from 'react';
import { Message } from '../../../types/chat';
import { cn } from '../../../utils/cn';

interface TransferMessageProps {
  message: Message;
  isQuoted?: boolean;
}

export const TransferMessage: React.FC<TransferMessageProps> = ({
  message,
  isQuoted = false
}) => {
  if (message.type !== 'transfer') return null;

  const { amount, message: transferMessage, status } = message.content;

  const handleTransferClick = (e: React.MouseEvent) => {
    if (isQuoted) return;
    e.stopPropagation();
    
    // 根据状态处理不同的点击逻辑
    if (status === 'pending') {
      console.log('确认收款:', message.id);
    } else if (status === 'received') {
      console.log('查看转账详情:', message.id);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          text: '待确认收款',
          color: 'text-orange-400',
          bgColor: 'from-orange-500 to-orange-600',
          icon: '⏳',
          clickable: true
        };
      case 'received':
        return {
          text: '已收款',
          color: 'text-green-400',
          bgColor: 'from-green-500 to-green-600',
          icon: '✅',
          clickable: false
        };
      case 'expired':
        return {
          text: '转账已过期',
          color: 'text-gray-400',
          bgColor: 'from-gray-500 to-gray-600',
          icon: '⏰',
          clickable: false
        };
      default:
        return {
          text: '转账',
          color: 'text-blue-400',
          bgColor: 'from-blue-500 to-blue-600',
          icon: '💰',
          clickable: false
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl transition-all duration-300',
        isQuoted ? 'max-w-40' : 'max-w-64',
        !isQuoted && statusConfig.clickable && 'cursor-pointer hover:scale-105 active:scale-95',
        status === 'expired' && 'opacity-75'
      )}
      onClick={handleTransferClick}
    >
      {/* 转账卡片背景 */}
      <div className={cn(
        'relative text-white p-4',
        `bg-gradient-to-br ${statusConfig.bgColor}`
      )}>
        {/* 装饰性网格 */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%),
              linear-gradient(-45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%)
            `,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* 转账内容 */}
        <div className="relative z-10">
          {/* 标题栏 */}
          <div className="flex items-center gap-2 mb-3">
            <span className={isQuoted ? 'text-lg' : 'text-2xl'}>
              {statusConfig.icon}
            </span>
            <span className={cn(
              'font-medium',
              isQuoted ? 'text-xs' : 'text-sm'
            )}>
              转账
            </span>
          </div>

          {/* 金额 */}
          <div className="text-center mb-3">
            <div className={cn(
              'font-bold',
              isQuoted ? 'text-lg' : 'text-2xl'
            )}>
              ¥{amount.toFixed(2)}
            </div>
          </div>

          {/* 转账消息 */}
          {transferMessage && !isQuoted && (
            <div className="text-center mb-3 text-sm opacity-90">
              "{transferMessage}"
            </div>
          )}

          {/* 状态 */}
          <div className="text-center">
            <div className={cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs',
              'bg-white/20 backdrop-blur-sm'
            )}>
              <span>{statusConfig.text}</span>
            </div>
          </div>
        </div>

        {/* 波纹动画效果 - 仅在待确认状态下显示 */}
        {status === 'pending' && !isQuoted && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -inset-2 opacity-20">
              <div className="w-full h-full animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
          </div>
        )}
      </div>

      {/* 底部信息条 */}
      {!isQuoted && (
        <div className={cn(
          'px-4 py-2 text-xs',
          status === 'received' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : status === 'expired'
            ? 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
        )}>
          <div className="flex items-center justify-between">
            <span>微信转账</span>
            <span>
              {status === 'received' && '已到账'}
              {status === 'pending' && '请确认收款'}
              {status === 'expired' && '24小时内有效'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};