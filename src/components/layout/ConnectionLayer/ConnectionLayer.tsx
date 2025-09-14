import React, { memo, useEffect, useRef } from 'react';
import { connectionSystem } from '../../../core/ConnectionSystem';
import { BaseComponentProps } from '../../../types';

export interface ConnectionLayerProps extends BaseComponentProps {
  enableConnections?: boolean;
}

export const ConnectionLayer = memo<ConnectionLayerProps>(({ 
  className = '', 
  enableConnections = true,
  ...props 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize connection system
  useEffect(() => {
    if (!enableConnections) return;

    // Connection system is initialized automatically
    return () => {
      // Cleanup handled by connection system
    };
  }, [enableConnections]);

  // Auto-detect and register elements for connections
  useEffect(() => {
    if (!enableConnections) return;

    const observeElements = () => {
      // Find message bubbles
      const messageBubbles = document.querySelectorAll('[data-message-id]');
      messageBubbles.forEach((bubble) => {
        const messageId = bubble.getAttribute('data-message-id');
        if (messageId && bubble instanceof HTMLElement) {
          connectionSystem.registerElement(messageId, bubble, 'chat');
        }
      });

      // Find avatars in sidebar
      const sidebarAvatars = document.querySelectorAll('[data-user-avatar]');
      sidebarAvatars.forEach((avatar) => {
        const userId = avatar.getAttribute('data-user-id');
        if (userId && avatar instanceof HTMLElement) {
          connectionSystem.registerElement(`avatar-${userId}`, avatar, 'sidebar');
        }
      });

      // Find avatars in top bar
      const topbarAvatars = document.querySelectorAll('[data-topbar-avatar]');
      topbarAvatars.forEach((avatar) => {
        const userId = avatar.getAttribute('data-user-id');
        if (userId && avatar instanceof HTMLElement) {
          connectionSystem.registerElement(`topbar-avatar-${userId}`, avatar, 'topbar');
        }
      });

      // Auto-create connections between messages and avatars
      messageBubbles.forEach((bubble) => {
        const messageId = bubble.getAttribute('data-message-id');
        const senderId = bubble.getAttribute('data-sender-id');
        const messageType = bubble.getAttribute('data-message-type') as 'self' | 'other';
        
        if (messageId && senderId && messageType) {
          const targetAvatarId = messageType === 'self' 
            ? `topbar-avatar-${senderId}` 
            : `avatar-${senderId}`;
          
          // Create connection if both elements exist
          setTimeout(() => {
            connectionSystem.createConnection(messageId, targetAvatarId, messageType);
          }, 100); // Small delay to ensure DOM is ready
        }
      });
    };

    // Initial observation
    observeElements();

    // Observe for new elements
    const observer = new MutationObserver((mutations) => {
      let shouldReobserve = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.hasAttribute('data-message-id') || 
                  node.hasAttribute('data-user-avatar') || 
                  node.hasAttribute('data-topbar-avatar')) {
                shouldReobserve = true;
              }
            }
          });
        }
      });
      
      if (shouldReobserve) {
        setTimeout(observeElements, 50);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    return () => {
      observer.disconnect();
    };
  }, [enableConnections]);

  if (!enableConnections) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`
        absolute inset-0 pointer-events-none z-20
        ${className}
      `}
      {...props}
    >
      {/* Connection system renders its own SVG overlay */}
      {/* Debug info overlay */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded pointer-events-auto">
          <div>Connection System: Active</div>
          <div>CSS Anchor: Loaded</div>
          <button 
            onClick={() => connectionSystem.clearConnections()}
            className="mt-1 px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
          >
            Clear Connections
          </button>
        </div>
      )}
    </div>
  );
});

ConnectionLayer.displayName = 'ConnectionLayer';

// Enhanced hook for connection management
export const useConnectionSystem = () => {
  const registerElement = (
    id: string,
    element: HTMLElement,
    container: 'chat' | 'sidebar' | 'topbar',
    anchorName?: string
  ) => {
    connectionSystem.registerElement(id, element, container, anchorName);
  };

  const createConnection = (
    messageId: string,
    avatarId: string,
    type: 'self' | 'other'
  ) => {
    return connectionSystem.createConnection(messageId, avatarId, type);
  };

  const removeConnection = (connectionId: string) => {
    connectionSystem.removeConnection(connectionId);
  };

  const clearConnections = () => {
    connectionSystem.clearConnections();
  };

  const updateConfig = (config: Parameters<typeof connectionSystem.updateConfig>[0]) => {
    connectionSystem.updateConfig(config);
  };

  return {
    registerElement,
    createConnection,
    removeConnection,
    clearConnections,
    updateConfig,
    connectionSystem
  };
};