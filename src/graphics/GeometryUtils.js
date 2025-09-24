/**
 * GeometryUtils - Advanced geometry calculations for PixiJS v8
 * Provides utilities for rounded corners, path generation, and curve calculations
 * Optimized for high-performance real-time rendering
 */

import { Point } from 'pixi.js';

export class GeometryUtils {
    /**
     * Generate points for a rounded corner between two line segments
     * @param {Point} start - Starting point of first line
     * @param {Point} corner - Corner point (intersection)
     * @param {Point} end - End point of second line
     * @param {number} radius - Corner radius
     * @param {number} segments - Number of segments for curve (default: 8)
     * @returns {Point[]} Array of points forming the rounded corner
     */
    static generateRoundedCorner(start, corner, end, radius = 10, segments = 8) {
        const logger = this.getLogger();
        
        try {
            // Calculate vectors from corner to start and end
            const v1 = new Point(start.x - corner.x, start.y - corner.y);
            const v2 = new Point(end.x - corner.x, end.y - corner.y);
            
            // Normalize vectors
            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            
            if (len1 === 0 || len2 === 0) {
                logger.warn('Zero length vector in rounded corner calculation');
                return [corner];
            }
            
            v1.x /= len1;
            v1.y /= len1;
            v2.x /= len2;
            v2.y /= len2;
            
            // Calculate angle between vectors
            const dotProduct = v1.x * v2.x + v1.y * v2.y;
            const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
            
            // If vectors are nearly parallel, no corner needed
            if (Math.abs(angle) < 0.01) {
                return [corner];
            }
            
            // Calculate distance from corner to arc start/end
            const distance = radius / Math.tan(angle / 2);
            
            // Calculate arc start and end points
            const arcStart = new Point(
                corner.x + v1.x * distance,
                corner.y + v1.y * distance
            );
            
            const arcEnd = new Point(
                corner.x + v2.x * distance,
                corner.y + v2.y * distance
            );
            
            // Calculate arc center
            const bisector = new Point(
                (v1.x + v2.x) / 2,
                (v1.y + v2.y) / 2
            );
            const bisectorLength = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);
            
            if (bisectorLength === 0) {
                return [arcStart, arcEnd];
            }
            
            bisector.x /= bisectorLength;
            bisector.y /= bisectorLength;
            
            const centerDistance = radius / Math.sin(angle / 2);
            const center = new Point(
                corner.x + bisector.x * centerDistance,
                corner.y + bisector.y * centerDistance
            );
            
            // Generate arc points
            const points = [arcStart];
            
            // Calculate start and end angles
            const startAngle = Math.atan2(arcStart.y - center.y, arcStart.x - center.x);
            const endAngle = Math.atan2(arcEnd.y - center.y, arcEnd.x - center.x);
            
            // Determine direction of arc
            let angleDiff = endAngle - startAngle;
            if (Math.abs(angleDiff) > Math.PI) {
                if (angleDiff > 0) {
                    angleDiff -= 2 * Math.PI;
                } else {
                    angleDiff += 2 * Math.PI;
                }
            }
            
            // Generate intermediate points
            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const currentAngle = startAngle + angleDiff * t;
                points.push(new Point(
                    center.x + Math.cos(currentAngle) * radius,
                    center.y + Math.sin(currentAngle) * radius
                ));
            }
            
            points.push(arcEnd);
            
            logger.debug(`Generated ${points.length} points for rounded corner`, {
                radius, angle: angle * 180 / Math.PI, segments
            });
            
            return points;
            
        } catch (error) {
            logger.error('Error generating rounded corner', error);
            return [corner];
        }
    }

    /**
     * Calculate connection path from bubble to avatar with rounded corners
     * @param {Object} bubbleRect - Bubble position and dimensions
     * @param {Object} avatarRect - Avatar position and dimensions
     * @param {boolean} isOwn - Whether this is own message (affects direction)
     * @param {number} cornerRadius - Radius for rounded corners
     * @returns {Point[]} Array of points forming the connection path
     */
    static calculateConnectionPath(bubbleRect, avatarRect, isOwn = false, cornerRadius = 8) {
        const logger = this.getLogger();
        const startTime = performance.now();
        
        try {
            const path = [];
            const horizontalOffset = 5; // 5px horizontal extension
            
            if (isOwn) {
                // Own message: bubble right -> avatar left center
                const bubblePoint = new Point(
                    bubbleRect.x + bubbleRect.width,
                    bubbleRect.y + bubbleRect.height / 2
                );
                
                const horizontalPoint = new Point(
                    bubblePoint.x + horizontalOffset,
                    bubblePoint.y
                );
                
                const avatarVertical = avatarRect.y + avatarRect.height / 2;
                const verticalPoint = new Point(
                    horizontalPoint.x,
                    avatarVertical
                );
                
                const avatarPoint = new Point(
                    avatarRect.x,
                    avatarVertical
                );
                
                // Build path with rounded corners
                path.push(bubblePoint);
                path.push(horizontalPoint);
                
                // Add rounded corner if there's vertical movement
                if (Math.abs(horizontalPoint.y - verticalPoint.y) > 1) {
                    const cornerPoints = this.generateRoundedCorner(
                        horizontalPoint,
                        new Point(horizontalPoint.x, verticalPoint.y),
                        verticalPoint,
                        cornerRadius
                    );
                    path.push(...cornerPoints);
                }
                
                path.push(verticalPoint);
                
                // Add final rounded corner
                const finalCornerPoints = this.generateRoundedCorner(
                    verticalPoint,
                    new Point(avatarPoint.x, verticalPoint.y),
                    avatarPoint,
                    cornerRadius
                );
                path.push(...finalCornerPoints);
                path.push(avatarPoint);
                
            } else {
                // Others' message: bubble left -> avatar right center
                const bubblePoint = new Point(
                    bubbleRect.x,
                    bubbleRect.y + bubbleRect.height / 2
                );
                
                const horizontalPoint = new Point(
                    bubblePoint.x - horizontalOffset,
                    bubblePoint.y
                );
                
                const avatarVertical = avatarRect.y + avatarRect.height / 2;
                const verticalPoint = new Point(
                    horizontalPoint.x,
                    avatarVertical
                );
                
                const avatarPoint = new Point(
                    avatarRect.x + avatarRect.width,
                    avatarVertical
                );
                
                // Build path with rounded corners
                path.push(bubblePoint);
                path.push(horizontalPoint);
                
                // Add rounded corner if there's vertical movement
                if (Math.abs(horizontalPoint.y - verticalPoint.y) > 1) {
                    const cornerPoints = this.generateRoundedCorner(
                        horizontalPoint,
                        new Point(horizontalPoint.x, verticalPoint.y),
                        verticalPoint,
                        cornerRadius
                    );
                    path.push(...cornerPoints);
                }
                
                path.push(verticalPoint);
                
                // Add final rounded corner
                const finalCornerPoints = this.generateRoundedCorner(
                    verticalPoint,
                    new Point(avatarPoint.x, verticalPoint.y),
                    avatarPoint,
                    cornerRadius
                );
                path.push(...finalCornerPoints);
                path.push(avatarPoint);
            }
            
            const duration = performance.now() - startTime;
            logger.debug(`Calculated connection path with ${path.length} points`, {
                duration: `${duration.toFixed(2)}ms`,
                isOwn,
                cornerRadius
            });
            
            return path;
            
        } catch (error) {
            logger.error('Error calculating connection path', error);
            return [];
        }
    }

    /**
     * Check if a point is inside a rectangle
     * @param {Point} point - Point to check
     * @param {Object} rect - Rectangle with x, y, width, height
     * @returns {boolean} True if point is inside rectangle
     */
    static pointInRect(point, rect) {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width &&
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }

    /**
     * Calculate distance between two points
     * @param {Point} p1 - First point
     * @param {Point} p2 - Second point
     * @returns {number} Distance between points
     */
    static distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Interpolate between two points
     * @param {Point} start - Start point
     * @param {Point} end - End point
     * @param {number} t - Interpolation factor (0-1)
     * @returns {Point} Interpolated point
     */
    static lerp(start, end, t) {
        return new Point(
            start.x + (end.x - start.x) * t,
            start.y + (end.y - start.y) * t
        );
    }

    /**
     * Calculate bounding box for a set of points
     * @param {Point[]} points - Array of points
     * @returns {Object} Bounding box with x, y, width, height
     */
    static getBoundingBox(points) {
        if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        
        let minX = points[0].x, maxX = points[0].x;
        let minY = points[0].y, maxY = points[0].y;
        
        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Smooth a path using Catmull-Rom spline
     * @param {Point[]} points - Input points
     * @param {number} tension - Spline tension (0-1, default: 0.5)
     * @param {number} segments - Segments per curve (default: 10)
     * @returns {Point[]} Smoothed path
     */
    static smoothPath(points, tension = 0.5, segments = 10) {
        if (points.length < 3) return points;
        
        const smoothed = [points[0]];
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            
            for (let t = 0; t <= 1; t += 1 / segments) {
                const t2 = t * t;
                const t3 = t2 * t;
                
                const x = 0.5 * (
                    2 * p1.x +
                    (-p0.x + p2.x) * t +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
                );
                
                const y = 0.5 * (
                    2 * p1.y +
                    (-p0.y + p2.y) * t +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
                );
                
                if (t > 0) smoothed.push(new Point(x, y));
            }
        }
        
        smoothed.push(points[points.length - 1]);
        return smoothed;
    }

    /**
     * Generate points for a complex polygon (star, arrow, etc.)
     * @param {number} sides - Number of sides
     * @param {number} outerRadius - Outer radius
     * @param {number} innerRadius - Inner radius (for star shapes)
     * @param {Point} center - Center point
     * @returns {Point[]} Array of polygon points
     */
    static generatePolygon(sides, outerRadius, innerRadius = null, center = new Point(0, 0)) {
        const points = [];
        const angleStep = (Math.PI * 2) / sides;
        const isStar = innerRadius !== null;
        
        for (let i = 0; i < sides; i++) {
            const angle = i * angleStep - Math.PI / 2;
            
            // Outer point
            points.push(new Point(
                center.x + Math.cos(angle) * outerRadius,
                center.y + Math.sin(angle) * outerRadius
            ));
            
            // Inner point (for star shapes)
            if (isStar) {
                const innerAngle = angle + angleStep / 2;
                points.push(new Point(
                    center.x + Math.cos(innerAngle) * innerRadius,
                    center.y + Math.sin(innerAngle) * innerRadius
                ));
            }
        }
        
        return points;
    }

    /**
     * Get logger instance for this class
     * @returns {Object} Logger object
     */
    static getLogger() {
        return {
            debug: (msg, data) => console.debug(`[GeometryUtils] ${msg}`, data || ''),
            info: (msg, data) => console.info(`[GeometryUtils] ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`[GeometryUtils] ${msg}`, data || ''),
            error: (msg, error) => console.error(`[GeometryUtils] ${msg}`, error)
        };
    }
}

export default GeometryUtils;