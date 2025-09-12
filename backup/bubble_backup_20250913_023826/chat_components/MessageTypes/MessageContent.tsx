import React from 'react';
import { Message } from '../../../types/chat';
import { TextMessage } from './TextMessage';
import { ImageMessage } from './ImageMessage';
import { VoiceMessage } from './VoiceMessage';
import { VideoMessage } from './VideoMessage';
import { FileMessage } from './FileMessage';
import { LinkMessage } from './LinkMessage';
import { ExtendedLinkMessage } from './ExtendedLinkMessage';
import { ContactMessage } from './ContactMessage';
import { LocationMessage } from './LocationMessage';
import { RedEnvelopeMessage } from './RedEnvelopeMessage';
import { TransferMessage } from './TransferMessage';
import { MiniProgramMessage } from './MiniProgramMessage';
import { AnimatedEmojiMessage } from './AnimatedEmojiMessage';
import { SystemMessage } from './SystemMessage';

interface MessageContentProps {
  message: Message;
  isQuoted?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isQuoted = false
}) => {
  // 根据消息类型渲染对应组件
  switch (message.type) {
    case 'text':
      return <TextMessage message={message} isQuoted={isQuoted} />;
      
    case 'image':
      return <ImageMessage message={message} isQuoted={isQuoted} />;
      
    case 'voice':
      return <VoiceMessage message={message} isQuoted={isQuoted} />;
      
    case 'video':
      return <VideoMessage message={message} isQuoted={isQuoted} />;
      
    case 'file':
      return <FileMessage message={message} isQuoted={isQuoted} />;
      
    case 'link':
      return <LinkMessage message={message} isQuoted={isQuoted} />;
      
    case 'extended-link':
      return <ExtendedLinkMessage message={message} isQuoted={isQuoted} />;
      
    case 'contact':
      return <ContactMessage message={message} isQuoted={isQuoted} />;
      
    case 'location':
      return <LocationMessage message={message} isQuoted={isQuoted} />;
      
    case 'red-envelope':
      return <RedEnvelopeMessage message={message} isQuoted={isQuoted} />;
      
    case 'transfer':
      return <TransferMessage message={message} isQuoted={isQuoted} />;
      
    case 'mini-program':
      return <MiniProgramMessage message={message} isQuoted={isQuoted} />;
      
    case 'animated-emoji':
      return <AnimatedEmojiMessage message={message} isQuoted={isQuoted} />;
      
    case 'system':
    case 'group-management':
    case 'voice-call':
    case 'video-call':
    case 'service-notification':
    case 'quote-notification':
      return <SystemMessage message={message} isQuoted={isQuoted} />;
      
    default:
      // 未知消息类型的fallback
      return (
        <div className="text-gray-500 italic text-sm">
          [不支持的消息类型: {message.type}]
        </div>
      );
  }
};