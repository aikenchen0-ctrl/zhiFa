import React, { memo, useCallback } from 'react';
import { useChatStore, selectCurrentChat, selectUnreadChats } from '../../../stores/simpleChatStore';
import { Avatar } from '../../shared/Avatar';
import { Badge } from '../../shared/Badge';
import { Button } from '../../shared/Button';
import { BaseComponentProps } from '../../../types';

export interface TopBarProps extends BaseComponentProps {}

export const TopBar = memo<TopBarProps>(({ className = '', ...props }) => {
  const { 
    onSearchChange, 
    onUserProfileToggle, 
    searchQuery,
    showUserProfile
  } = useChatStore();
  
  const currentChat = useChatStore(selectCurrentChat);
  const unreadChats = useChatStore(selectUnreadChats);

  const handleSearchIconClick = useCallback(() => {
    // Toggle search functionality or focus search input
    const searchInput = document.querySelector('#chat-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  const handleEditClick = useCallback(() => {
    if (currentChat) {
      // Handle chat edit functionality
      console.log('Edit chat:', currentChat.id);
    }
  }, [currentChat]);

  const renderUnreadBadge = () => {
    const unreadCount = unreadChats.reduce((total, chat) => total + chat.unreadCount, 0);
    
    if (unreadCount === 0) return null;

    return (
      <div className=\"flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-full\">
        <div className=\"w-2 h-2 bg-red-500 rounded-full animate-pulse\" />
        <span className=\"text-red-600 text-xs font-medium\">
          {unreadCount > 99 ? '99+' : unreadCount} 条新消息
        </span>
      </div>
    );
  };

  const renderCurrentChatInfo = () => {
    if (!currentChat) {
      return (
        <div className=\"flex items-center space-x-3\">
          <div className=\"w-8 h-8 bg-gray-200 rounded-full animate-pulse\" />
          <span className=\"text-gray-500\">选择一个会话</span>
        </div>
      );
    }

    return (
      <div className=\"flex items-center space-x-3\">
        <Avatar
          src={currentChat.avatar}
          alt={currentChat.name}
          size=\"small\"
          showStatus={currentChat.type === 'private'}
          status={currentChat.isOnline ? 'online' : 'offline'}
        />
        <div className=\"flex flex-col\">
          <h2 className=\"text-sm font-medium text-gray-900 truncate max-w-32\">
            {currentChat.name}
          </h2>
          {currentChat.type === 'group' && (
            <span className=\"text-xs text-gray-500\">
              {currentChat.participants.length} 成员
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <header 
      className={`
        flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white
        sticky top-0 z-40 shadow-sm
        ${className}
      `}
      {...props}
    >
      {/* Left Section - Unread Messages */}
      <div className=\"flex items-center space-x-4 flex-1\">
        {renderUnreadBadge()}
      </div>

      {/* Center Section - Current Chat Info */}
      <div className=\"flex items-center space-x-3 flex-2 justify-center\">
        {renderCurrentChatInfo()}
        
        {currentChat && (
          <Button
            variant=\"ghost\"
            size=\"small\"
            onClick={handleEditClick}
            icon={
              <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} 
                      d=\"M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z\" />
              </svg>
            }
          />
        )}
      </div>

      {/* Right Section - Search & User Account */}
      <div className=\"flex items-center space-x-3 flex-1 justify-end\">
        <Button
          variant=\"ghost\"
          size=\"small\"
          onClick={handleSearchIconClick}
          icon={
            <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} 
                    d=\"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\" />
            </svg>
          }
        />
        
        <div className=\"flex items-center space-x-2\">
          <Button
            variant=\"ghost\"
            size=\"small\"
            onClick={onUserProfileToggle}
            className={showUserProfile ? 'bg-blue-50 text-blue-600' : ''}
          >
            <Avatar
              src=\"https://ui-avatars.com/api/?name=User&background=0066cc&color=fff\"
              alt=\"Current User\"
              size=\"small\"
            />
            <span className=\"ml-2 hidden sm:inline text-sm font-medium\">账号名</span>
          </Button>

          <Button
            variant=\"ghost\"
            size=\"small\"
            icon={
              <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} 
                      d=\"M12 6v6m0 0v6m0-6h6m-6 0H6\" />
              </svg>
            }
          />
        </div>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';