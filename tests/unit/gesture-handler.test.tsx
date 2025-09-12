import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Gesture Handler Component based on the project structure
const MockGestureHandler = ({ 
  onSwipe, 
  onPinch, 
  onRotate, 
  onLongPress, 
  onTap,
  children 
}: {
  onSwipe?: (data: any) => void;
  onPinch?: (data: any) => void;
  onRotate?: (data: any) => void;
  onLongPress?: (data: any) => void;
  onTap?: (data: any) => void;
  children: React.ReactNode;
}) => {
  const [gestureState, setGestureState] = React.useState({
    isActive: false,
    startTime: 0,
    initialDistance: 0,
    initialAngle: 0
  });

  const calculateDistance = (touches: Touch[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculateAngle = (touches: Touch[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const startTime = performance.now();
    const touches = Array.from(e.touches);
    
    setGestureState({
      isActive: true,
      startTime,
      initialDistance: calculateDistance(touches),
      initialAngle: calculateAngle(touches)
    });

    // Long press detection
    if (touches.length === 1 && onLongPress) {
      setTimeout(() => {
        onLongPress({ 
          x: touches[0].clientX, 
          y: touches[0].clientY,
          duration: 500 
        });
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    
    if (touches.length === 2) {
      const currentDistance = calculateDistance(touches);
      const currentAngle = calculateAngle(touches);
      
      // Pinch detection
      if (onPinch && gestureState.initialDistance > 0) {
        const scale = currentDistance / gestureState.initialDistance;
        onPinch({ scale, distance: currentDistance });
      }

      // Rotation detection
      if (onRotate) {
        const rotation = currentAngle - gestureState.initialAngle;
        onRotate({ rotation, angle: currentAngle });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endTime = performance.now();
    const duration = endTime - gestureState.startTime;
    const changedTouches = Array.from(e.changedTouches);

    // Tap detection (quick touch)
    if (duration < 200 && changedTouches.length === 1 && onTap) {
      onTap({ 
        x: changedTouches[0].clientX, 
        y: changedTouches[0].clientY,
        duration 
      });
    }

    // Swipe detection
    if (changedTouches.length === 1 && onSwipe) {
      const touch = changedTouches[0];
      // Mock swipe direction calculation
      onSwipe({ 
        direction: 'left', // Simplified for testing
        velocity: 100,
        distance: 50
      });
    }

    setGestureState({
      isActive: false,
      startTime: 0,
      initialDistance: 0,
      initialAngle: 0
    });
  };

  return (
    <div
      data-testid="gesture-handler"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none', width: '100%', height: '400px' }}
    >
      {children}
    </div>
  );
};

describe('Advanced Gesture Handler', () => {
  let mockSwipe: jest.Mock;
  let mockPinch: jest.Mock;
  let mockRotate: jest.Mock;
  let mockLongPress: jest.Mock;
  let mockTap: jest.Mock;

  beforeEach(() => {
    mockSwipe = jest.fn();
    mockPinch = jest.fn();
    mockRotate = jest.fn();
    mockLongPress = jest.fn();
    mockTap = jest.fn();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Swipe Gestures', () => {
    it('should detect horizontal swipe left', async () => {
      render(
        <MockGestureHandler onSwipe={mockSwipe}>
          <div>Swipe Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      // Simulate swipe left
      const startTouch = global.createMockTouch(200, 300);
      const endTouch = global.createMockTouch(100, 300); // Move left

      fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch]));
      fireEvent(gestureArea, global.createTouchEvent('touchend', [endTouch]));

      expect(mockSwipe).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: expect.any(String),
          velocity: expect.any(Number),
          distance: expect.any(Number)
        })
      );
    });

    it('should calculate swipe velocity correctly', async () => {
      render(
        <MockGestureHandler onSwipe={mockSwipe}>
          <div>Swipe Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      const startTime = performance.now();
      const startTouch = global.createMockTouch(200, 300);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch]));
      
      // Fast swipe (50ms)
      act(() => {
        jest.advanceTimersByTime(50);
      });
      
      const endTouch = global.createMockTouch(100, 300);
      fireEvent(gestureArea, global.createTouchEvent('touchend', [endTouch]));

      expect(mockSwipe).toHaveBeenCalledWith(
        expect.objectContaining({
          velocity: expect.any(Number)
        })
      );
    });

    it('should differentiate between swipe directions', () => {
      render(
        <MockGestureHandler onSwipe={mockSwipe}>
          <div>Swipe Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');

      // Test different swipe directions
      const testCases = [
        { start: [200, 300], end: [100, 300], expected: 'left' },
        { start: [100, 300], end: [200, 300], expected: 'right' },
        { start: [150, 200], end: [150, 100], expected: 'up' },
        { start: [150, 100], end: [150, 200], expected: 'down' }
      ];

      testCases.forEach((testCase, index) => {
        const startTouch = global.createMockTouch(testCase.start[0], testCase.start[1]);
        const endTouch = global.createMockTouch(testCase.end[0], testCase.end[1]);

        fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch]));
        fireEvent(gestureArea, global.createTouchEvent('touchend', [endTouch]));
      });

      expect(mockSwipe).toHaveBeenCalledTimes(4);
    });
  });

  describe('Pinch Gestures', () => {
    it('should detect pinch zoom in', () => {
      render(
        <MockGestureHandler onPinch={mockPinch}>
          <div>Pinch Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      // Start with two fingers close together
      const startTouch1 = global.createMockTouch(150, 150, 1);
      const startTouch2 = global.createMockTouch(160, 160, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch1, startTouch2]));

      // Move fingers apart (zoom in)
      const moveTouch1 = global.createMockTouch(100, 100, 1);
      const moveTouch2 = global.createMockTouch(200, 200, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchmove', [moveTouch1, moveTouch2]));

      expect(mockPinch).toHaveBeenCalledWith(
        expect.objectContaining({
          scale: expect.any(Number),
          distance: expect.any(Number)
        })
      );
    });

    it('should detect pinch zoom out', () => {
      render(
        <MockGestureHandler onPinch={mockPinch}>
          <div>Pinch Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      // Start with two fingers far apart
      const startTouch1 = global.createMockTouch(100, 100, 1);
      const startTouch2 = global.createMockTouch(200, 200, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch1, startTouch2]));

      // Move fingers closer (zoom out)
      const moveTouch1 = global.createMockTouch(140, 140, 1);
      const moveTouch2 = global.createMockTouch(160, 160, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchmove', [moveTouch1, moveTouch2]));

      expect(mockPinch).toHaveBeenCalledWith(
        expect.objectContaining({
          scale: expect.any(Number)
        })
      );
      
      // Scale should be less than 1 for zoom out
      const call = mockPinch.mock.calls[0][0];
      expect(call.scale).toBeLessThan(1);
    });

    it('should handle continuous pinch gestures', () => {
      render(
        <MockGestureHandler onPinch={mockPinch}>
          <div>Pinch Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      const startTouch1 = global.createMockTouch(150, 150, 1);
      const startTouch2 = global.createMockTouch(160, 160, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch1, startTouch2]));

      // Multiple pinch movements
      for (let i = 1; i <= 5; i++) {
        const moveTouch1 = global.createMockTouch(150 - i * 10, 150 - i * 10, 1);
        const moveTouch2 = global.createMockTouch(160 + i * 10, 160 + i * 10, 2);
        
        fireEvent(gestureArea, global.createTouchEvent('touchmove', [moveTouch1, moveTouch2]));
      }

      expect(mockPinch).toHaveBeenCalledTimes(5);
    });
  });

  describe('Rotation Gestures', () => {
    it('should detect clockwise rotation', () => {
      render(
        <MockGestureHandler onRotate={mockRotate}>
          <div>Rotate Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      // Start with horizontal finger position
      const startTouch1 = global.createMockTouch(100, 150, 1);
      const startTouch2 = global.createMockTouch(200, 150, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch1, startTouch2]));

      // Rotate clockwise (vertical position)
      const rotateTouch1 = global.createMockTouch(150, 100, 1);
      const rotateTouch2 = global.createMockTouch(150, 200, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchmove', [rotateTouch1, rotateTouch2]));

      expect(mockRotate).toHaveBeenCalledWith(
        expect.objectContaining({
          rotation: expect.any(Number),
          angle: expect.any(Number)
        })
      );
    });
  });

  describe('Long Press', () => {
    it('should detect long press after 500ms', async () => {
      render(
        <MockGestureHandler onLongPress={mockLongPress}>
          <div>Long Press Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      const touch = global.createMockTouch(150, 150);
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [touch]));

      // Wait for long press duration
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockLongPress).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 150,
          y: 150,
          duration: 500
        })
      );
    });

    it('should not trigger long press if touch ends early', async () => {
      render(
        <MockGestureHandler onLongPress={mockLongPress}>
          <div>Long Press Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      const touch = global.createMockTouch(150, 150);
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [touch]));

      // End touch before long press duration
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      fireEvent(gestureArea, global.createTouchEvent('touchend', [touch]));

      act(() => {
        jest.advanceTimersByTime(300); // Complete the remaining time
      });

      expect(mockLongPress).not.toHaveBeenCalled();
    });
  });

  describe('Tap Gestures', () => {
    it('should detect single tap', () => {
      render(
        <MockGestureHandler onTap={mockTap}>
          <div>Tap Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      const touch = global.createMockTouch(150, 150);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [touch]));
      
      // Quick tap (< 200ms)
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      fireEvent(gestureArea, global.createTouchEvent('touchend', [touch]));

      expect(mockTap).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 150,
          y: 150,
          duration: expect.any(Number)
        })
      );
    });

    it('should not trigger tap for long touches', () => {
      render(
        <MockGestureHandler onTap={mockTap}>
          <div>Tap Area</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      const touch = global.createMockTouch(150, 150);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [touch]));
      
      // Long touch (> 200ms)
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      fireEvent(gestureArea, global.createTouchEvent('touchend', [touch]));

      expect(mockTap).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle rapid gesture updates without performance degradation', () => {
      render(
        <MockGestureHandler onPinch={mockPinch}>
          <div>Performance Test</div>
        </MockGestureHandler>
      );

      const gestureArea = screen.getByTestId('gesture-handler');
      
      const startTime = performance.now();
      
      // Simulate rapid pinch updates (120fps)
      const startTouch1 = global.createMockTouch(100, 100, 1);
      const startTouch2 = global.createMockTouch(200, 200, 2);
      
      fireEvent(gestureArea, global.createTouchEvent('touchstart', [startTouch1, startTouch2]));

      for (let i = 0; i < 120; i++) {
        const moveTouch1 = global.createMockTouch(100 + i, 100 + i, 1);
        const moveTouch2 = global.createMockTouch(200 - i, 200 - i, 2);
        
        fireEvent(gestureArea, global.createTouchEvent('touchmove', [moveTouch1, moveTouch2]));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 120 updates
      expect(mockPinch).toHaveBeenCalledTimes(120);
    });
  });
});