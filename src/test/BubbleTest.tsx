import React from 'react';
import { SimpleBubble } from '../components/chat/SimpleBubble';
import { DetailedBubble } from '../components/chat/DetailedBubble';
import { ActionType, Message } from '../types/chat';

// 测试用例：验证气泡组件的操作菜单功能
export const BubbleTest: React.FC = () => {
  // 模拟消息数据
  const testMessage: Message = {
    id: 'test-1',
    type: 'text',
    sender: 'other',
    senderName: '张三',
    timestamp: Date.now(),
    content: '这是一个测试消息，点击我应该能看到操作菜单'
  };

  const testMessageSelf: Message = {
    id: 'test-2', 
    type: 'text',
    sender: 'self',
    timestamp: Date.now(),
    content: '这是我发送的消息'
  };

  // 处理操作菜单点击
  const handleActionClick = (action: ActionType, message: Message) => {
    console.log('🎯 操作菜单点击:', { action, messageId: message.id, content: message.content });
    
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(message.content);
        alert(`✅ 已复制消息: ${message.content}`);
        break;
      case 'delete':
        alert(`🗑️ 删除消息: ${message.id}`);
        break;
      case 'forward':
        alert(`📤 转发消息: ${message.content}`);
        break;
      case 'collect':
        alert(`⭐ 收藏消息: ${message.content}`);
        break;
      case 'quote':
        alert(`💬 引用消息: ${message.content}`);
        break;
      case 'aside':
        alert(`💭 话外音: ${message.content}`);
        break;
      case 'enlarge':
        alert(`🔍 放大消息: ${message.content}`);
        break;
      case 'multi-select':
        alert(`✅ 多选模式`);
        break;
      default:
        alert(`❓ 未知操作: ${action}`);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-blue-100 to-purple-100 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-8">🧪 气泡组件操作菜单测试</h1>
      
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-lg font-semibold">📱 简单气泡测试</h2>
        
        {/* 别人发送的简单气泡 */}
        <SimpleBubble
          message={testMessage}
          onActionClick={handleActionClick}
          isMultiSelectMode={false}
        />
        
        {/* 自己发送的简单气泡 */}
        <SimpleBubble
          message={testMessageSelf}
          onActionClick={handleActionClick}
          isMultiSelectMode={false}
        />
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-lg font-semibold">👤 详细气泡测试</h2>
        
        {/* 别人发送的详细气泡 */}
        <DetailedBubble
          message={testMessage}
          onActionClick={handleActionClick}
          isMultiSelectMode={false}
        />
        
        {/* 自己发送的详细气泡 */}
        <DetailedBubble
          message={testMessageSelf}
          onActionClick={handleActionClick}
          isMultiSelectMode={false}
        />
      </div>

      <div className="text-center text-sm text-gray-600 mt-8">
        <p>✅ 如果你能看到操作菜单并且点击有响应，说明组件工作正常</p>
        <p>❌ 如果点击气泡没有反应，说明还有问题需要修复</p>
      </div>
    </div>
  );
};

export default BubbleTest;