import React, { useRef, useCallback } from 'react';
import { motion, useDragControls, PanInfo } from 'framer-motion';
import { OverlayContainerProps } from '@/types/components';
import { Position } from '@/types/overlay';
import { cn } from '@/utils/cn';

export const OverlayContainer: React.FC<OverlayContainerProps> = ({
  children,
  position,
  size,
  visible = true,
  draggable = false,
  onDrag,
  onResize,
  className,
}) => {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!onDrag) return;
      
      const newPosition: Position = {
        x: position.x + info.offset.x,
        y: position.y + info.offset.y,
      };
      
      onDrag(newPosition);
    },
    [onDrag, position]
  );

  const containerVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -20,
    },
  };

  if (!visible) {
    return null;
  }

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'absolute z-overlay backdrop-blur-sm',
        'bg-overlay-surface border border-overlay-border',
        'rounded-lg shadow-lg',
        draggable && 'cursor-move',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      drag={draggable}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.1}
      onDrag={handleDrag}
      whileHover={draggable ? { scale: 1.02 } : undefined}
      whileDrag={{ scale: 1.05, zIndex: 9999 }}
    >
      {/* Header for dragging */}
      {draggable && (
        <div
          className="absolute top-0 left-0 right-0 h-6 cursor-move bg-gray-100/50 rounded-t-lg flex items-center justify-center"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
          </div>
        </div>
      )}
      
      {/* Content area */}
      <div
        className={cn(
          'w-full h-full overflow-hidden',
          draggable && 'pt-6'
        )}
      >
        {children}
      </div>
      
      {/* Resize handles (if resize is enabled) */}
      {onResize && (
        <>
          {/* Corner resize handle */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
            style={{
              background: 'linear-gradient(-45deg, transparent 30%, #9CA3AF 30%, #9CA3AF 70%, transparent 70%)',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startSize = { ...size };
              
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                
                const newSize = {
                  width: Math.max(100, startSize.width + deltaX),
                  height: Math.max(100, startSize.height + deltaY),
                };
                
                onResize(newSize);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </>
      )}
    </motion.div>
  );
};