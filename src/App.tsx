import React, { useEffect } from 'react';
import { useChatStore } from './stores/simpleChatStore';
import { TopBar } from './components/layout/TopBar';
import { BottomBar } from './components/layout/BottomBar';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { RightSidebar } from './components/layout/RightSidebar';
import { ChatArea } from './components/chat/ChatArea';
import { OverlayContainer } from './components/layout/OverlayContainer';
import { ConnectionLayer } from './components/layout/ConnectionLayer';
import { PopupLayer } from './components/layout/PopupLayer';
import { Chat, Message, User } from './types';

function App() {
  const { 
    sidebarCollapsed, 
    rightSidebarVisible,
    onChatSelect
  } = useChatStore();
  
  // Initialize mock data
  useEffect(() => {
    // Create mock users
    const mockUsers: User[] = [
      { id: '1', name: '张三', avatar: 'https://ui-avatars.com/api/?name=张三&background=0066cc&color=fff', status: 'online' },
      { id: '2', name: '李四', avatar: 'https://ui-avatars.com/api/?name=李四&background=ff6b6b&color=fff', status: 'offline' },
      { id: '3', name: '王五', avatar: 'https://ui-avatars.com/api/?name=王五&background=4ecdc4&color=fff', status: 'away' },
      { id: '4', name: '赵六', avatar: 'https://ui-avatars.com/api/?name=赵六&background=45b7d1&color=fff', status: 'online' },
    ];

    // Create mock chats
    const mockChats: Chat[] = [
      {
        id: 'chat_1',
        name: '张三',
        type: 'private',
        participants: [mockUsers[0]],
        unreadCount: 3,
        avatar: mockUsers[0].avatar,
        isOnline: true,
        lastActivity: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        lastMessage: {
          id: 'msg_1',
          chatId: 'chat_1',
          senderId: '1',
          content: '你好，最近怎么样？',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          type: 'text',
          status: 'read'
        }
      },
    ];

    const mockMessages: Message[] = [
      {
        id: 'msg_1_1',
        chatId: 'chat_1',
        senderId: '1',
        content: '嗨！今天天气真不错呢',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        type: 'text',
        status: 'read'
      },
    ];

    // Update store with mock data
    const store = useChatStore.getState();
    store.chats = mockChats;
    store.messages = { 'chat_1': mockMessages };
    onChatSelect('chat_1');
  }, [onChatSelect]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 flex flex-col">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar collapsed={sidebarCollapsed} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatArea className="flex-1" />
          <BottomBar />
        </div>
        {rightSidebarVisible && (
          <RightSidebar visible={rightSidebarVisible} />
        )}
      </div>
      <OverlayContainer />
      <ConnectionLayer />
      <PopupLayer />
    </div>
  );
}

export default App;
