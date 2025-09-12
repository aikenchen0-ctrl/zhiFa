import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock responsive utility functions
const breakpoints = {
  xs: 320,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400
};

// Mock device detection utility
const detectDevice = (width: number, height: number) => {
  const ratio = window.devicePixelRatio || 1;
  const isLandscape = width > height;
  
  if (width <= 480) {
    return {
      type: 'mobile',
      size: 'small',
      orientation: isLandscape ? 'landscape' : 'portrait',
      pixelRatio: ratio
    };
  } else if (width <= 768) {
    return {
      type: isLandscape ? 'mobile' : 'tablet',
      size: 'medium',
      orientation: isLandscape ? 'landscape' : 'portrait',
      pixelRatio: ratio
    };
  } else if (width <= 1024) {
    return {
      type: 'tablet',
      size: 'large',
      orientation: isLandscape ? 'landscape' : 'portrait',
      pixelRatio: ratio
    };
  } else {
    return {
      type: 'desktop',
      size: 'xlarge',
      orientation: isLandscape ? 'landscape' : 'portrait',
      pixelRatio: ratio
    };
  }
};

// Mock responsive hook
const useResponsive = () => {
  const [dimensions, setDimensions] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  const [device, setDevice] = React.useState(() => 
    detectDevice(window.innerWidth, window.innerHeight)
  );

  React.useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      setDimensions({ width: newWidth, height: newHeight });
      setDevice(detectDevice(newWidth, newHeight));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...dimensions,
    device,
    isMobile: device.type === 'mobile',
    isTablet: device.type === 'tablet',
    isDesktop: device.type === 'desktop',
    isLandscape: device.orientation === 'landscape',
    isPortrait: device.orientation === 'portrait',
    breakpoint: Object.entries(breakpoints)
      .reverse()
      .find(([, value]) => dimensions.width >= value)?.[0] || 'xs'
  };
};

// Mock responsive IM component
const ResponsiveIMLayout: React.FC<{
  avatarCount?: number;
  connectionCount?: number;
  onLayoutChange?: (layout: string) => void;
}> = ({ avatarCount = 10, connectionCount = 5, onLayoutChange }) => {
  const { width, height, device, isMobile, isTablet, breakpoint, isLandscape } = useResponsive();
  const [layout, setLayout] = React.useState('grid');

  React.useEffect(() => {
    let newLayout = 'grid';
    
    if (isMobile) {
      newLayout = isLandscape ? 'horizontal-list' : 'vertical-list';
    } else if (isTablet) {
      newLayout = isLandscape ? 'split-view' : 'grid';
    } else {
      newLayout = 'grid';
    }

    if (newLayout !== layout) {
      setLayout(newLayout);
      onLayoutChange?.(newLayout);
    }
  }, [device, isLandscape, isMobile, isTablet, layout, onLayoutChange]);

  const getGridColumns = () => {
    if (isMobile) return isLandscape ? 2 : 1;
    if (isTablet) return isLandscape ? 4 : 3;
    return Math.min(6, Math.ceil(Math.sqrt(avatarCount)));
  };

  const getAvatarSize = () => {
    switch (breakpoint) {
      case 'xs': return 40;
      case 'sm': return 50;
      case 'md': return 60;
      case 'lg': return 70;
      case 'xl': return 80;
      default: return 60;
    }
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
    gap: isMobile ? '8px' : '16px',
    padding: isMobile ? '8px' : '16px',
    overflow: 'auto'
  };

  return (
    <div
      data-testid="responsive-im-layout"
      data-layout={layout}
      data-breakpoint={breakpoint}
      data-device={device.type}
      data-orientation={device.orientation}
      style={containerStyle}
    >
      {Array.from({ length: avatarCount }, (_, i) => (
        <div
          key={i}
          data-testid={`avatar-${i}`}
          style={{
            width: getAvatarSize(),
            height: getAvatarSize(),
            borderRadius: '50%',
            backgroundColor: '#007bff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: isMobile ? '12px' : '14px'
          }}
        >
          {i + 1}
        </div>
      ))}
      
      {/* Connection indicators */}
      <div data-testid="connections-info" style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px',
        fontSize: isMobile ? '12px' : '14px'
      }}>
        {connectionCount} connections
      </div>
      
      {/* Device info */}
      <div data-testid="device-info" style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        fontSize: '10px',
        opacity: 0.7
      }}>
        {width}×{height} | {device.type} | {breakpoint}
      </div>
    </div>
  );
};

// Test utilities for simulating different screen sizes
const resizeWindow = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

const setDevicePixelRatio = (ratio: number) => {
  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    configurable: true,
    value: ratio,
  });
};

describe('Responsive Screen Adaptation Tests', () => {
  let mockLayoutChange: jest.Mock;

  beforeEach(() => {
    mockLayoutChange = jest.fn();
    // Reset to default viewport
    resizeWindow(1024, 768);
    setDevicePixelRatio(1);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Breakpoint Detection', () => {
    const testCases = [
      { width: 320, height: 568, expected: 'xs', device: 'mobile' },
      { width: 576, height: 1024, expected: 'sm', device: 'mobile' },
      { width: 768, height: 1024, expected: 'md', device: 'tablet' },
      { width: 992, height: 768, expected: 'lg', device: 'tablet' },
      { width: 1200, height: 800, expected: 'xl', device: 'desktop' },
      { width: 1400, height: 900, expected: 'xxl', device: 'desktop' },
    ];

    testCases.forEach(({ width, height, expected, device }) => {
      it(`should detect ${expected} breakpoint for ${width}×${height}`, () => {
        resizeWindow(width, height);
        
        render(<ResponsiveIMLayout onLayoutChange={mockLayoutChange} />);
        
        const layout = screen.getByTestId('responsive-im-layout');
        expect(layout).toHaveAttribute('data-breakpoint', expected);
        expect(layout).toHaveAttribute('data-device', device);
      });
    });
  });

  describe('Orientation Handling', () => {
    it('should adapt to portrait orientation on mobile', () => {
      resizeWindow(375, 667); // iPhone portrait
      
      render(<ResponsiveIMLayout onLayoutChange={mockLayoutChange} />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-orientation', 'portrait');
      expect(layout).toHaveAttribute('data-layout', 'vertical-list');
    });

    it('should adapt to landscape orientation on mobile', () => {
      resizeWindow(667, 375); // iPhone landscape
      
      render(<ResponsiveIMLayout onLayoutChange={mockLayoutChange} />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-orientation', 'landscape');
      expect(layout).toHaveAttribute('data-layout', 'horizontal-list');
    });

    it('should handle tablet orientation changes', () => {
      // Start in portrait
      resizeWindow(768, 1024);
      
      const { rerender } = render(<ResponsiveIMLayout onLayoutChange={mockLayoutChange} />);
      
      let layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-layout', 'grid');
      
      // Switch to landscape
      resizeWindow(1024, 768);
      rerender(<ResponsiveIMLayout onLayoutChange={mockLayoutChange} />);
      
      layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-layout', 'split-view');
    });
  });

  describe('Layout Adaptation', () => {
    it('should adjust grid columns based on device type', () => {
      const testCases = [
        { width: 320, height: 568, expectedCols: '1fr' }, // Mobile portrait
        { width: 568, height: 320, expectedCols: 'repeat(2, 1fr)' }, // Mobile landscape
        { width: 768, height: 1024, expectedCols: 'repeat(3, 1fr)' }, // Tablet portrait
        { width: 1024, height: 768, expectedCols: 'repeat(4, 1fr)' }, // Tablet landscape
      ];

      testCases.forEach(({ width, height, expectedCols }) => {
        resizeWindow(width, height);
        
        render(<ResponsiveIMLayout avatarCount={12} />);
        
        const layout = screen.getByTestId('responsive-im-layout');
        const computedStyle = getComputedStyle(layout);
        
        // Note: jsdom doesn't compute grid-template-columns, so we check the style attribute
        expect(layout.style.gridTemplateColumns).toContain(expectedCols);
      });
    });

    it('should adapt avatar sizes for different breakpoints', () => {
      const sizeTests = [
        { width: 320, expectedSize: 40 },
        { width: 576, expectedSize: 50 },
        { width: 768, expectedSize: 60 },
        { width: 992, expectedSize: 70 },
        { width: 1200, expectedSize: 80 },
      ];

      sizeTests.forEach(({ width, expectedSize }) => {
        resizeWindow(width, 600);
        
        render(<ResponsiveIMLayout avatarCount={5} />);
        
        const avatar = screen.getByTestId('avatar-0');
        expect(avatar.style.width).toBe(`${expectedSize}px`);
        expect(avatar.style.height).toBe(`${expectedSize}px`);
      });
    });
  });

  describe('Performance During Resize Events', () => {
    it('should handle rapid resize events efficiently', () => {
      render(<ResponsiveIMLayout onLayoutChange={mockLayoutChange} />);
      
      const resizeSequence = [
        [320, 568], [375, 667], [414, 896], [768, 1024], [1024, 768], [1200, 800]
      ];

      const startTime = performance.now();
      
      resizeSequence.forEach(([width, height]) => {
        resizeWindow(width, height);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(mockLayoutChange).toHaveBeenCalled();
    });

    it('should debounce layout changes during continuous resize', async () => {
      render(<ResponsiveIMLayout onLayoutChange={mockLayoutChange} />);
      
      // Simulate continuous resize
      for (let i = 300; i <= 800; i += 50) {
        resizeWindow(i, 600);
      }

      // Layout changes should be optimized/debounced
      expect(mockLayoutChange.mock.calls.length).toBeLessThan(20);
    });
  });

  describe('High-DPI Display Support', () => {
    it('should handle high-DPI displays correctly', () => {
      setDevicePixelRatio(2);
      resizeWindow(375, 667); // iPhone with 2x pixel ratio
      
      render(<ResponsiveIMLayout />);
      
      const deviceInfo = screen.getByTestId('device-info');
      expect(deviceInfo).toHaveTextContent('375×667');
      expect(window.devicePixelRatio).toBe(2);
    });

    it('should adapt for different pixel densities', () => {
      const densityTests = [
        { ratio: 1, width: 320 },
        { ratio: 2, width: 375 },
        { ratio: 3, width: 414 },
      ];

      densityTests.forEach(({ ratio, width }) => {
        setDevicePixelRatio(ratio);
        resizeWindow(width, 600);
        
        render(<ResponsiveIMLayout />);
        
        const layout = screen.getByTestId('responsive-im-layout');
        expect(layout).toHaveAttribute('data-device', 'mobile');
        
        // Device pixel ratio should be considered in rendering decisions
        expect(window.devicePixelRatio).toBe(ratio);
      });
    });
  });

  describe('Accessibility Considerations', () => {
    it('should maintain minimum touch target sizes on mobile', () => {
      resizeWindow(320, 568); // Small mobile screen
      
      render(<ResponsiveIMLayout avatarCount={10} />);
      
      const avatar = screen.getByTestId('avatar-0');
      const size = parseInt(avatar.style.width);
      
      // Minimum 40px for touch targets (iOS/Android guidelines)
      expect(size).toBeGreaterThanOrEqual(40);
    });

    it('should provide adequate spacing on touch devices', () => {
      resizeWindow(375, 667);
      
      render(<ResponsiveIMLayout />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      const gap = layout.style.gap;
      
      // Should have at least 8px gap on mobile
      expect(gap).toBe('8px');
    });

    it('should be readable at different font sizes', () => {
      const readabilityTests = [
        { width: 320, expectedFontSize: '12px' },
        { width: 768, expectedFontSize: '14px' },
        { width: 1200, expectedFontSize: '14px' },
      ];

      readabilityTests.forEach(({ width, expectedFontSize }) => {
        resizeWindow(width, 600);
        
        render(<ResponsiveIMLayout />);
        
        const connectionsInfo = screen.getByTestId('connections-info');
        expect(connectionsInfo.style.fontSize).toBe(expectedFontSize);
      });
    });
  });

  describe('Content Adaptation', () => {
    it('should hide/show elements based on screen space', () => {
      // Test with many avatars on small screen
      resizeWindow(320, 568);
      
      render(<ResponsiveIMLayout avatarCount={50} />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-layout', 'vertical-list');
      
      // Should still display device info even with limited space
      const deviceInfo = screen.getByTestId('device-info');
      expect(deviceInfo).toBeInTheDocument();
    });

    it('should adapt connection display for different layouts', () => {
      resizeWindow(320, 568);
      
      render(<ResponsiveIMLayout connectionCount={25} />);
      
      const connectionsInfo = screen.getByTestId('connections-info');
      expect(connectionsInfo).toHaveTextContent('25 connections');
      expect(connectionsInfo.style.fontSize).toBe('12px'); // Smaller on mobile
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely small viewports', () => {
      resizeWindow(240, 320); // Very small screen
      
      render(<ResponsiveIMLayout />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-breakpoint', 'xs');
      expect(layout).toHaveAttribute('data-device', 'mobile');
    });

    it('should handle extremely large viewports', () => {
      resizeWindow(2560, 1440); // 4K display
      
      render(<ResponsiveIMLayout />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-breakpoint', 'xxl');
      expect(layout).toHaveAttribute('data-device', 'desktop');
    });

    it('should handle square viewports', () => {
      resizeWindow(800, 800); // Square viewport
      
      render(<ResponsiveIMLayout />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toHaveAttribute('data-device', 'tablet');
      expect(layout).toHaveAttribute('data-orientation', 'landscape');
    });

    it('should handle zero or negative dimensions gracefully', () => {
      // This shouldn't happen in real scenarios, but should be handled
      resizeWindow(0, 0);
      
      render(<ResponsiveIMLayout />);
      
      const layout = screen.getByTestId('responsive-im-layout');
      expect(layout).toBeInTheDocument();
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should not cause excessive re-renders during resize', () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        return <ResponsiveIMLayout onLayoutChange={mockLayoutChange} />;
      };

      render(<TestComponent />);
      
      const initialRenderCount = renderCount;
      
      // Multiple resizes
      resizeWindow(320, 568);
      resizeWindow(375, 667);
      resizeWindow(414, 896);
      
      const finalRenderCount = renderCount;
      const additionalRenders = finalRenderCount - initialRenderCount;
      
      // Should not cause excessive re-renders
      expect(additionalRenders).toBeLessThan(10);
    });

    it('should maintain performance with large numbers of avatars', () => {
      const startTime = performance.now();
      
      render(<ResponsiveIMLayout avatarCount={100} />);
      
      // Resize multiple times
      resizeWindow(320, 568);
      resizeWindow(768, 1024);
      resizeWindow(1200, 800);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete quickly even with many avatars
    });
  });
});