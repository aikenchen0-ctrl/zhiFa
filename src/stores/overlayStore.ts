import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { OverlayState, OverlayNode, Connection, Position, User, Message } from '@/types/overlay';

interface OverlayActions {
  // Node management
  addNode: (user: User, position: Position) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: Position) => void;
  updateNodeVisibility: (nodeId: string, visible: boolean) => void;
  selectNode: (nodeId: string) => void;
  deselectNode: (nodeId: string) => void;
  clearSelection: () => void;
  
  // Connection management
  addConnection: (fromId: string, toId: string) => void;
  removeConnection: (connectionId: string) => void;
  updateConnectionStrength: (connectionId: string, strength: number) => void;
  activateConnection: (connectionId: string) => void;
  deactivateConnection: (connectionId: string) => void;
  
  // Messages
  addMessage: (nodeId: string, message: Omit<Message, 'id'>) => void;
  removeMessage: (nodeId: string, messageId: string) => void;
  
  // View controls
  setScale: (scale: number) => void;
  setOffset: (offset: Position) => void;
  resetView: () => void;
  
  // Interaction state
  setDragging: (isDragging: boolean) => void;
  
  // Utility functions
  getNode: (nodeId: string) => OverlayNode | undefined;
  getConnection: (connectionId: string) => Connection | undefined;
  getConnectedNodes: (nodeId: string) => OverlayNode[];
}

type OverlayStore = OverlayState & OverlayActions;

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useOverlayStore = create<OverlayStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: new Map(),
    connections: new Map(),
    activeConnections: [],
    selectedNodes: [],
    isDragging: false,
    scale: 1,
    offset: { x: 0, y: 0 },
    
    // Node management
    addNode: (user: User, position: Position) => {
      const nodeId = generateId();
      const newNode: OverlayNode = {
        id: nodeId,
        user,
        position,
        size: { width: 80, height: 80 },
        visible: true,
        draggable: true,
        messages: [],
        connections: [],
      };
      
      set((state) => ({
        nodes: new Map(state.nodes.set(nodeId, newNode)),
      }));
    },
    
    removeNode: (nodeId: string) => {
      set((state) => {
        const newNodes = new Map(state.nodes);
        const newConnections = new Map(state.connections);
        
        // Remove the node
        newNodes.delete(nodeId);
        
        // Remove all connections involving this node
        for (const [connectionId, connection] of newConnections.entries()) {
          if (connection.from === nodeId || connection.to === nodeId) {
            newConnections.delete(connectionId);
          }
        }
        
        return {
          nodes: newNodes,
          connections: newConnections,
          selectedNodes: state.selectedNodes.filter(id => id !== nodeId),
          activeConnections: state.activeConnections.filter(id => {
            const conn = newConnections.get(id);
            return conn && conn.from !== nodeId && conn.to !== nodeId;
          }),
        };
      });
    },
    
    updateNodePosition: (nodeId: string, position: Position) => {
      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) return state;
        
        const updatedNode = { ...node, position };
        const newNodes = new Map(state.nodes);
        newNodes.set(nodeId, updatedNode);
        
        return { nodes: newNodes };
      });
    },
    
    updateNodeVisibility: (nodeId: string, visible: boolean) => {
      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) return state;
        
        const updatedNode = { ...node, visible };
        const newNodes = new Map(state.nodes);
        newNodes.set(nodeId, updatedNode);
        
        return { nodes: newNodes };
      });
    },
    
    selectNode: (nodeId: string) => {
      set((state) => ({
        selectedNodes: [...new Set([...state.selectedNodes, nodeId])],
      }));
    },
    
    deselectNode: (nodeId: string) => {
      set((state) => ({
        selectedNodes: state.selectedNodes.filter(id => id !== nodeId),
      }));
    },
    
    clearSelection: () => {
      set({ selectedNodes: [] });
    },
    
    // Connection management
    addConnection: (fromId: string, toId: string) => {
      if (fromId === toId) return;
      
      const connectionId = generateId();
      const newConnection: Connection = {
        id: connectionId,
        from: fromId,
        to: toId,
        type: 'active',
        strength: 1,
      };
      
      set((state) => {
        const newConnections = new Map(state.connections);
        newConnections.set(connectionId, newConnection);
        
        // Update node connections
        const newNodes = new Map(state.nodes);
        const fromNode = newNodes.get(fromId);
        const toNode = newNodes.get(toId);
        
        if (fromNode) {
          const updatedFromNode = {
            ...fromNode,
            connections: [...fromNode.connections, newConnection],
          };
          newNodes.set(fromId, updatedFromNode);
        }
        
        if (toNode) {
          const updatedToNode = {
            ...toNode,
            connections: [...toNode.connections, newConnection],
          };
          newNodes.set(toId, updatedToNode);
        }
        
        return {
          connections: newConnections,
          nodes: newNodes,
          activeConnections: [...state.activeConnections, connectionId],
        };
      });
    },
    
    removeConnection: (connectionId: string) => {
      set((state) => {
        const connection = state.connections.get(connectionId);
        if (!connection) return state;
        
        const newConnections = new Map(state.connections);
        newConnections.delete(connectionId);
        
        // Update nodes
        const newNodes = new Map(state.nodes);
        const fromNode = newNodes.get(connection.from);
        const toNode = newNodes.get(connection.to);
        
        if (fromNode) {
          const updatedFromNode = {
            ...fromNode,
            connections: fromNode.connections.filter(c => c.id !== connectionId),
          };
          newNodes.set(connection.from, updatedFromNode);
        }
        
        if (toNode) {
          const updatedToNode = {
            ...toNode,
            connections: toNode.connections.filter(c => c.id !== connectionId),
          };
          newNodes.set(connection.to, updatedToNode);
        }
        
        return {
          connections: newConnections,
          nodes: newNodes,
          activeConnections: state.activeConnections.filter(id => id !== connectionId),
        };
      });
    },
    
    updateConnectionStrength: (connectionId: string, strength: number) => {
      set((state) => {
        const connection = state.connections.get(connectionId);
        if (!connection) return state;
        
        const updatedConnection = { ...connection, strength: Math.max(0, Math.min(1, strength)) };
        const newConnections = new Map(state.connections);
        newConnections.set(connectionId, updatedConnection);
        
        return { connections: newConnections };
      });
    },
    
    activateConnection: (connectionId: string) => {
      set((state) => ({
        activeConnections: [...new Set([...state.activeConnections, connectionId])],
      }));
    },
    
    deactivateConnection: (connectionId: string) => {
      set((state) => ({
        activeConnections: state.activeConnections.filter(id => id !== connectionId),
      }));
    },
    
    // Messages
    addMessage: (nodeId: string, message: Omit<Message, 'id'>) => {
      const messageId = generateId();
      const newMessage: Message = { ...message, id: messageId };
      
      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) return state;
        
        const updatedNode = {
          ...node,
          messages: [...node.messages, newMessage],
        };
        const newNodes = new Map(state.nodes);
        newNodes.set(nodeId, updatedNode);
        
        return { nodes: newNodes };
      });
    },
    
    removeMessage: (nodeId: string, messageId: string) => {
      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) return state;
        
        const updatedNode = {
          ...node,
          messages: node.messages.filter(m => m.id !== messageId),
        };
        const newNodes = new Map(state.nodes);
        newNodes.set(nodeId, updatedNode);
        
        return { nodes: newNodes };
      });
    },
    
    // View controls
    setScale: (scale: number) => {
      set({ scale: Math.max(0.1, Math.min(3, scale)) });
    },
    
    setOffset: (offset: Position) => {
      set({ offset });
    },
    
    resetView: () => {
      set({ scale: 1, offset: { x: 0, y: 0 } });
    },
    
    // Interaction state
    setDragging: (isDragging: boolean) => {
      set({ isDragging });
    },
    
    // Utility functions
    getNode: (nodeId: string) => {
      return get().nodes.get(nodeId);
    },
    
    getConnection: (connectionId: string) => {
      return get().connections.get(connectionId);
    },
    
    getConnectedNodes: (nodeId: string) => {
      const state = get();
      const connectedNodes: OverlayNode[] = [];
      
      for (const connection of state.connections.values()) {
        if (connection.from === nodeId) {
          const toNode = state.nodes.get(connection.to);
          if (toNode) connectedNodes.push(toNode);
        } else if (connection.to === nodeId) {
          const fromNode = state.nodes.get(connection.from);
          if (fromNode) connectedNodes.push(fromNode);
        }
      }
      
      return connectedNodes;
    },
  }))
);