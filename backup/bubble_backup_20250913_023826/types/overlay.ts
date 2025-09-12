export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline';
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  userId: string;
  type: 'text' | 'image' | 'file' | 'system';
}

export interface Connection {
  id: string;
  from: string; // user id
  to: string;   // user id
  type: 'active' | 'inactive' | 'pending';
  strength: number; // 0-1
}

export interface OverlayNode {
  id: string;
  user: User;
  position: Position;
  size: Size;
  visible: boolean;
  draggable: boolean;
  messages: Message[];
  connections: Connection[];
}

export interface OverlayState {
  nodes: Map<string, OverlayNode>;
  connections: Map<string, Connection>;
  activeConnections: string[];
  selectedNodes: string[];
  isDragging: boolean;
  scale: number;
  offset: Position;
}

export interface GestureEvent {
  type: 'tap' | 'pan' | 'pinch' | 'long-press';
  position: Position;
  delta?: Position;
  scale?: number;
  nodeId?: string;
}

export interface RenderEngine {
  initialize(container: HTMLElement): void;
  render(state: OverlayState): void;
  cleanup(): void;
  onGesture(callback: (event: GestureEvent) => void): void;
}