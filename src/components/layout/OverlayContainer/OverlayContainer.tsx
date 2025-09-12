import React, { memo, useEffect } from 'react';
import { useChatStore } from '../../../stores/simpleChatStore';
import { BaseComponentProps } from '../../../types';

export interface OverlayContainerProps extends BaseComponentProps {
  blur?: boolean;
  darken?: boolean;
  onClick?: () => void;
}

export const OverlayContainer = memo<OverlayContainerProps>(({ 
  blur = true,
  darken = true,
  onClick,
  className = '',
  children,
  ...props 
}) => {
  const { overlayVisible, setOverlayVisible } = useChatStore();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlayVisible) {
        setOverlayVisible(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [overlayVisible, setOverlayVisible]);

  useEffect(() => {
    // Prevent body scroll when overlay is visible
    if (overlayVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [overlayVisible]);

  const handleContainerClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick?.();
  };

  if (!overlayVisible && !children) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        transition-all duration-300 ease-in-out
        ${overlayVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        ${darken ? 'bg-black bg-opacity-50' : ''}
        ${blur ? 'backdrop-blur-sm' : ''}
        ${className}
      `}
      onClick={handleContainerClick}
      {...props}
    >
      {children}
    </div>
  );
});

OverlayContainer.displayName = 'OverlayContainer';