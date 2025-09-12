import React, { useRef, useCallback, useEffect } from 'react';
import { GestureHandlerProps } from '@/types/components';
import { Position } from '@/types/overlay';

interface GestureState {
  isPointerDown: boolean;
  startPosition: Position;
  lastPosition: Position;
  startTime: number;
  longPressTimer: NodeJS.Timeout | null;
  initialPinchDistance: number;
  lastScale: number;
}

const LONG_PRESS_DELAY = 500;
const TAP_MAX_DISTANCE = 10;
const TAP_MAX_DURATION = 300;

export const GestureHandler: React.FC<GestureHandlerProps> = ({
  onTap,
  onPan,
  onPinch,
  onLongPress,
  children,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureState = useRef<GestureState>({
    isPointerDown: false,
    startPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },
    startTime: 0,
    longPressTimer: null,
    initialPinchDistance: 0,
    lastScale: 1,
  });

  const getPointerPosition = (event: PointerEvent | React.PointerEvent): Position => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const getDistance = (pos1: Position, pos2: Position): number => {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clearLongPressTimer = () => {
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer);
      gestureState.current.longPressTimer = null;
    }
  };

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (disabled) return;
    
    const position = getPointerPosition(event);
    const state = gestureState.current;
    
    state.isPointerDown = true;
    state.startPosition = position;
    state.lastPosition = position;
    state.startTime = Date.now();
    
    // Start long press timer
    if (onLongPress) {
      state.longPressTimer = setTimeout(() => {
        if (state.isPointerDown) {
          onLongPress(position);
          clearLongPressTimer();
        }
      }, LONG_PRESS_DELAY);
    }
    
    // Capture pointer for this element
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [disabled, onLongPress]);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (disabled || !gestureState.current.isPointerDown) return;
    
    const position = getPointerPosition(event);
    const state = gestureState.current;
    
    const delta = {
      x: position.x - state.lastPosition.x,
      y: position.y - state.lastPosition.y,
    };
    
    // Check if movement exceeds tap threshold
    const totalDistance = getDistance(state.startPosition, position);
    if (totalDistance > TAP_MAX_DISTANCE) {
      clearLongPressTimer();
    }
    
    // Handle pan gesture
    if (onPan && (Math.abs(delta.x) > 1 || Math.abs(delta.y) > 1)) {
      onPan(delta);
    }
    
    state.lastPosition = position;
  }, [disabled, onPan]);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (disabled || !gestureState.current.isPointerDown) return;
    
    const position = getPointerPosition(event);
    const state = gestureState.current;
    const duration = Date.now() - state.startTime;
    const distance = getDistance(state.startPosition, position);
    
    // Clear timers
    clearLongPressTimer();
    
    // Check for tap gesture
    if (onTap && distance <= TAP_MAX_DISTANCE && duration <= TAP_MAX_DURATION) {
      onTap(position);
    }
    
    // Reset state
    state.isPointerDown = false;
    
    // Release pointer capture
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [disabled, onTap]);

  // Handle pinch gestures (touch events)
  useEffect(() => {
    if (disabled || !onPinch) return;
    
    let touchStartDistance = 0;
    let lastScale = 1;
    
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        touchStartDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
    };
    
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && touchStartDistance > 0) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        const scale = currentDistance / touchStartDistance;
        
        if (Math.abs(scale - lastScale) > 0.01) {
          onPinch(scale);
          lastScale = scale;
        }
      }
    };
    
    const handleTouchEnd = () => {
      touchStartDistance = 0;
      lastScale = 1;
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [disabled, onPinch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full touch-none select-none"
      style={{ touchAction: disabled ? 'auto' : 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </div>
  );
};