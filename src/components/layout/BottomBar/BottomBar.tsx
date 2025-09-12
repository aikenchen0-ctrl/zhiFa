import React, { memo, useState, useCallback } from 'react';
import { useChatStore } from '../../../stores/simpleChatStore';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { BaseComponentProps, MessageType } from '../../../types';

export interface BottomBarProps extends BaseComponentProps {}

export const BottomBar = memo<BottomBarProps>(({ className = '', ...props }) => {
  const { onMessageSend, currentChatId } = useChatStore();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showExpandMenu, setShowExpandMenu] = useState(false);

  const handleSendMessage = useCallback(() => {
    if (!message.trim() || !currentChatId) return;
    
    onMessageSend(message.trim(), 'text');
    setMessage('');
  }, [message, currentChatId, onMessageSend]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleVoiceToggle = useCallback(() => {
    setIsRecording(!isRecording);
    // Implement voice recording logic
  }, [isRecording]);

  const handleHomeClick = useCallback(() => {
    // Navigate to home/main chat list
    console.log('Navigate to home');
  }, []);

  const handleEmojiClick = useCallback(() => {
    // Show emoji picker
    console.log('Show emoji picker');
  }, []);

  const handleGiftClick = useCallback(() => {
    // Show gift options
    console.log('Show gift options');
  }, []);

  const handleExpandMenuToggle = useCallback(() => {
    setShowExpandMenu(!showExpandMenu);
  }, [showExpandMenu]);

  const renderExpandMenu = () => {
    if (!showExpandMenu) return null;

    const menuItems = [
      { label: '照片', icon: '📷', action: () => console.log('Photo') },
      { label: '文件', icon: '📁', action: () => console.log('File') },
      { label: '位置', icon: '📍', action: () => console.log('Location') },
      { label: '联系人', icon: '👤', action: () => console.log('Contact') },
    ];

    return (
      <div className=\"absolute bottom-full left-0 right-0 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg\">
        <div className=\"grid grid-cols-4 gap-2\">
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant=\"ghost\"
              size=\"small\"
              onClick={item.action}
              className=\"flex flex-col items-center p-3 hover:bg-gray-50\"
            >
              <span className=\"text-xl mb-1\">{item.icon}</span>
              <span className=\"text-xs\">{item.label}</span>
            </Button>
          ))}\n        </div>\n      </div>\n    );\n  };\n\n  const isDisabled = !currentChatId;\n\n  return (\n    <footer \n      className={`\n        relative border-t border-gray-200 bg-white p-4\n        sticky bottom-0 z-40\n        ${className}\n      `}\n      {...props}\n    >\n      {renderExpandMenu()}\n      \n      <div className=\"flex items-center space-x-3\">\n        {/* Voice Button */}\n        <Button\n          variant={isRecording ? \"primary\" : \"ghost\"}\n          size=\"medium\"\n          onClick={handleVoiceToggle}\n          disabled={isDisabled}\n          className={isRecording ? 'animate-pulse' : ''}\n          icon={\n            <svg className=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} \n                    d={isRecording ? \"M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z\" : \"M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z\"} />\n            </svg>\n          }\n        />\n\n        {/* Home Button */}\n        <Button\n          variant=\"ghost\"\n          size=\"medium\"\n          onClick={handleHomeClick}\n          icon={\n            <svg className=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} \n                    d=\"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6\" />\n            </svg>\n          }\n        />\n\n        {/* Message Input */}\n        <div className=\"flex-1\">\n          <Input\n            value={message}\n            onChange={(e) => setMessage(e.target.value)}\n            onKeyDown={handleKeyDown}\n            placeholder={isDisabled ? \"请选择一个会话\" : \"输入消息...\"}\n            disabled={isDisabled}\n            maxLength={1000}\n            rightIcon={\n              message.trim() && !isDisabled ? (\n                <button\n                  onClick={handleSendMessage}\n                  className=\"text-blue-500 hover:text-blue-600 transition-colors\"\n                >\n                  <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} \n                          d=\"M12 19l9 2-9-18-9 18 9-2zm0 0v-8\" />\n                  </svg>\n                </button>\n              ) : null\n            }\n            className=\"pr-12\"\n          />\n        </div>\n\n        {/* Emoji Button */}\n        <Button\n          variant=\"ghost\"\n          size=\"medium\"\n          onClick={handleEmojiClick}\n          disabled={isDisabled}\n          icon={\n            <svg className=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} \n                    d=\"M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n            </svg>\n          }\n        />\n\n        {/* Gift Button */}\n        <Button\n          variant=\"ghost\"\n          size=\"medium\"\n          onClick={handleGiftClick}\n          disabled={isDisabled}\n          icon={\n            <svg className=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} \n                    d=\"M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7\" />\n            </svg>\n          }\n        />\n\n        {/* Expand Menu Button */}\n        <Button\n          variant=\"ghost\"\n          size=\"medium\"\n          onClick={handleExpandMenuToggle}\n          disabled={isDisabled}\n          className={showExpandMenu ? 'bg-gray-100' : ''}\n          icon={\n            <svg className=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} \n                    d={showExpandMenu ? \"M6 18L18 6M6 6l12 12\" : \"M12 6v6m0 0v6m0-6h6m-6 0H6\"} />\n            </svg>\n          }\n        />\n      </div>\n    </footer>\n  );\n});\n\nBottomBar.displayName = 'BottomBar';