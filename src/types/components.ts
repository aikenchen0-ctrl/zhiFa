import { ReactNode } from 'react';
import { User, Message, Position, Size, Connection } from './overlay';

export interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface MessageBubbleProps {
  message: Message;
  user: User;
  position?: 'left' | 'right';
  showAvatar?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export interface ConnectionLineProps {
  connection: Connection;
  fromPosition: Position;
  toPosition: Position;
  animated?: boolean;
  className?: string;
}

export interface OverlayContainerProps {
  children: ReactNode;
  position: Position;
  size: Size;
  visible?: boolean;
  draggable?: boolean;
  onDrag?: (position: Position) => void;
  onResize?: (size: Size) => void;
  className?: string;
}

export interface GestureHandlerProps {
  onTap?: (position: Position) => void;
  onPan?: (delta: Position) => void;
  onPinch?: (scale: number) => void;
  onLongPress?: (position: Position) => void;
  children: ReactNode;
  disabled?: boolean;
}