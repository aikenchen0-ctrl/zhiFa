import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ConnectionLineProps } from '@/types/components';
import { calculateDistance, calculateAngle } from '@/utils/geometry';
import { cn } from '@/utils/cn';

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  fromPosition,
  toPosition,
  animated = true,
  className,
}) => {
  const pathData = useMemo(() => {
    const distance = calculateDistance(fromPosition, toPosition);
    const angle = calculateAngle(fromPosition, toPosition);
    
    // Create a curved path for more organic feel
    const controlOffset = distance * 0.3;
    const controlPoint1 = {
      x: fromPosition.x + Math.cos(angle - Math.PI / 6) * controlOffset,
      y: fromPosition.y + Math.sin(angle - Math.PI / 6) * controlOffset,
    };
    const controlPoint2 = {
      x: toPosition.x + Math.cos(angle + Math.PI - Math.PI / 6) * controlOffset,
      y: toPosition.y + Math.sin(angle + Math.PI - Math.PI / 6) * controlOffset,
    };
    
    return {
      path: `M ${fromPosition.x} ${fromPosition.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${toPosition.x} ${toPosition.y}`,
      length: distance,
      angle,
    };
  }, [fromPosition, toPosition]);

  const getConnectionColor = () => {
    switch (connection.type) {
      case 'active':
        return 'stroke-connection-active';
      case 'pending':
        return 'stroke-connection-pulse';
      case 'inactive':
      default:
        return 'stroke-connection-inactive';
    }
  };

  const getStrokeWidth = () => {
    const baseWidth = 2;
    return baseWidth + (connection.strength * 2);
  };

  const pathVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: connection.strength,
    },
  };

  return (
    <motion.svg
      className={cn('absolute inset-0 pointer-events-none z-10', className)}
      style={{
        width: '100%',
        height: '100%',
      }}
      initial="hidden"
      animate="visible"
    >
      {/* Glow effect for active connections */}
      {connection.type === 'active' && (
        <motion.path
          d={pathData.path}
          fill="none"
          stroke="url(#connectionGlow)"
          strokeWidth={getStrokeWidth() + 4}
          className="opacity-30"
          variants={pathVariants}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}
      
      {/* Main connection line */}
      <motion.path
        d={pathData.path}
        fill="none"
        className={cn(getConnectionColor())}
        strokeWidth={getStrokeWidth()}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={pathVariants}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          filter: connection.type === 'active' ? 'drop-shadow(0 0 4px currentColor)' : undefined,
        }}
      />
      
      {/* Animated pulse for active connections */}
      {animated && connection.type === 'active' && (
        <motion.path
          d={pathData.path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          className="stroke-white opacity-60"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 2,
            ease: 'linear',
            repeat: Infinity,
          }}
          strokeDasharray="4 8"
        />
      )}
      
      {/* Connection strength indicator */}
      {connection.strength < 1 && (
        <motion.circle
          cx={(fromPosition.x + toPosition.x) / 2}
          cy={(fromPosition.y + toPosition.y) / 2}
          r={3 + connection.strength * 2}
          className={cn(getConnectionColor(), 'fill-current opacity-60')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
        />
      )}
      
      {/* SVG Definitions */}
      <defs>
        <linearGradient id="connectionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
};