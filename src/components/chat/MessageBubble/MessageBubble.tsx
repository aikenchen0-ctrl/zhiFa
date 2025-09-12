import React, { memo, useState, useCallback } from 'react';
import { Message, MessageStatus, Reaction } from '../../../types';
import { Avatar } from '../../shared/Avatar';
import { Button } from '../../shared/Button';

export interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isSelected?: boolean;
  onSelect?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
}

export const MessageBubble = memo<MessageBubbleProps>(({
  message,
  isOwn = false,
  showAvatar = true,
  showTimestamp = true,
  isSelected = false,
  onSelect,
  onReact,
  onReply,
  onEdit,
  onDelete,
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleLongPress = useCallback(() => {
    onSelect?.(message.id);
  }, [message.id, onSelect]);

  const handleReaction = useCallback((emoji: string) => {
    onReact?.(message.id, emoji);
    setShowReactions(false);
  }, [message.id, onReact]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setShowMenu(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  }, [message.id, message.content, editContent, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return timestamp.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    return timestamp.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'sending':
        return (
          <svg className=\"w-3 h-3 animate-spin\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
            <circle cx=\"12\" cy=\"12\" r=\"10\" strokeWidth=\"4\" className=\"opacity-25\"/>
            <path fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\" className=\"opacity-75\"/>
          </svg>
        );
      case 'sent':
        return (
          <svg className=\"w-3 h-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" />
          </svg>
        );
      case 'delivered':
        return (
          <div className=\"flex -space-x-1\">
            <svg className=\"w-3 h-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" />
            </svg>
            <svg className=\"w-3 h-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" />
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className=\"flex -space-x-1 text-blue-500\">
            <svg className=\"w-3 h-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" />
            </svg>
            <svg className=\"w-3 h-3\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <svg className=\"w-3 h-3 text-red-500\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    return (
      <div className=\"flex items-center space-x-1 mt-1\">\n        {message.reactions.map((reaction, index) => (\n          <button\n            key={index}\n            onClick={() => handleReaction(reaction.emoji)}\n            className={`\n              flex items-center space-x-1 px-2 py-1 rounded-full text-xs\n              transition-colors duration-200\n              ${reaction.users.includes('current_user') \n                ? 'bg-blue-100 text-blue-700 border border-blue-200' \n                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'\n              }\n            `}\n          >\n            <span>{reaction.emoji}</span>\n            <span>{reaction.count}</span>\n          </button>\n        ))}\n        \n        <button\n          onClick={() => setShowReactions(!showReactions)}\n          className=\"p-1 rounded-full hover:bg-gray-100 transition-colors\"\n        >\n          <svg className=\"w-3 h-3 text-gray-500\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 6v6m0 0v6m0-6h6m-6 0H6\" />\n          </svg>\n        </button>\n      </div>\n    );\n  };\n\n  const renderReactionPicker = () => {\n    if (!showReactions) return null;\n\n    const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏'];\n\n    return (\n      <div className=\"absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 mt-1\">\n        <div className=\"flex items-center space-x-2\">\n          {commonEmojis.map((emoji) => (\n            <button\n              key={emoji}\n              onClick={() => handleReaction(emoji)}\n              className=\"p-1 hover:bg-gray-100 rounded transition-colors text-lg\"\n            >\n              {emoji}\n            </button>\n          ))}\n        </div>\n      </div>\n    );\n  };\n\n  const renderContextMenu = () => {\n    if (!showMenu) return null;\n\n    return (\n      <div className=\"absolute z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 mt-1\">\n        <button\n          onClick={() => onReply?.(message.id)}\n          className=\"w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors\"\n        >\n          回复\n        </button>\n        \n        {isOwn && (\n          <>\n            <button\n              onClick={handleEdit}\n              className=\"w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors\"\n            >\n              编辑\n            </button>\n            <button\n              onClick={() => {\n                onDelete?.(message.id);\n                setShowMenu(false);\n              }}\n              className=\"w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors\"\n            >\n              删除\n            </button>\n          </>\n        )}\n        \n        <button\n          onClick={() => {\n            navigator.clipboard.writeText(message.content);\n            setShowMenu(false);\n          }}\n          className=\"w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors\"\n        >\n          复制\n        </button>\n      </div>\n    );\n  };\n\n  const renderMessageContent = () => {\n    if (isEditing) {\n      return (\n        <div className=\"space-y-2\">\n          <textarea\n            value={editContent}\n            onChange={(e) => setEditContent(e.target.value)}\n            className=\"w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500\"\n            rows={3}\n          />\n          <div className=\"flex items-center space-x-2\">\n            <Button size=\"small\" onClick={handleSaveEdit}>\n              保存\n            </Button>\n            <Button size=\"small\" variant=\"ghost\" onClick={handleCancelEdit}>\n              取消\n            </Button>\n          </div>\n        </div>\n      );\n    }\n\n    if (message.type === 'text') {\n      return (\n        <p className=\"whitespace-pre-wrap break-words\">\n          {message.content}\n        </p>\n      );\n    }\n\n    // Handle other message types (image, video, audio, file, etc.)\n    return (\n      <div className=\"flex items-center space-x-2 text-sm text-gray-600\">\n        <span>📎</span>\n        <span>[{message.type}]</span>\n      </div>\n    );\n  };\n\n  return (\n    <div \n      className={`\n        relative group mb-4 ${isOwn ? 'flex justify-end' : 'flex justify-start'}\n        ${isSelected ? 'bg-blue-50 -mx-4 px-4 py-2' : ''}\n        ${className}\n      `}\n      onContextMenu={(e) => {\n        e.preventDefault();\n        setShowMenu(!showMenu);\n      }}\n    >\n      {/* Avatar */}\n      {showAvatar && !isOwn && (\n        <div className=\"flex-shrink-0 mr-3\">\n          <Avatar\n            src={`https://ui-avatars.com/api/?name=${message.senderId}&background=random`}\n            alt=\"Sender\"\n            size=\"small\"\n          />\n        </div>\n      )}\n\n      <div className={`max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg ${isOwn ? 'order-first' : ''}`}>\n        {/* Message Bubble */}\n        <div\n          className={`\n            relative px-4 py-2 rounded-lg shadow-sm\n            ${isOwn \n              ? 'bg-blue-500 text-white rounded-br-sm' \n              : 'bg-gray-100 text-gray-900 rounded-bl-sm'\n            }\n            ${isSelected ? 'ring-2 ring-blue-300' : ''}\n          `}\n          onTouchStart={handleLongPress} // For mobile long press\n          onClick={() => onSelect?.(message.id)}\n        >\n          {renderMessageContent()}\n        </div>\n\n        {/* Message Info */}\n        <div className={`flex items-center mt-1 space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>\n          {showTimestamp && (\n            <span className=\"text-xs text-gray-500\">\n              {formatTimestamp(message.timestamp)}\n            </span>\n          )}\n          \n          {isOwn && (\n            <div className=\"text-gray-400\">\n              {getStatusIcon(message.status)}\n            </div>\n          )}\n        </div>\n\n        {/* Reactions */}\n        <div className=\"relative\">\n          {renderReactions()}\n          {renderReactionPicker()}\n        </div>\n        \n        {/* Context Menu */}\n        <div className=\"relative\">\n          {renderContextMenu()}\n        </div>\n      </div>\n\n      {/* Selection Indicator */}\n      {isSelected && (\n        <div className=\"absolute -left-6 top-1/2 transform -translate-y-1/2\">\n          <div className=\"w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center\">\n            <svg className=\"w-2 h-2 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\">\n              <path fillRule=\"evenodd\" d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\" clipRule=\"evenodd\" />\n            </svg>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n});\n\nMessageBubble.displayName = 'MessageBubble';