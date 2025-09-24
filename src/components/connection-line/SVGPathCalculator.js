class SVGPathCalculator {
    constructor(options = {}) {
        this.options = {
            cornerRadius: 8,
            horizontalOffset: 4,
            strokeWidth: 2,
            ...options
        };
    }

    calculateMessageToSessionPath(messagePoint, sessionPoint) {
        const { cornerRadius, horizontalOffset } = this.options;
        
        const startX = messagePoint.x;
        const startY = messagePoint.y;
        const endX = sessionPoint.x;
        const endY = sessionPoint.y;
        
        const midX1 = startX - horizontalOffset;
        const midY1 = startY;
        const midX2 = endX;
        const midY2 = endY;
        
        let path = `M ${startX} ${startY}`;
        
        if (Math.abs(startY - endY) < 5) {
            path += ` L ${midX1} ${midY1}`;
            path += ` L ${endX} ${endY}`;
        } else {
            const cornerX1 = midX1;
            const cornerY1 = midY1;
            const cornerX2 = midX1;
            const cornerY2 = endY;
            
            path += ` L ${cornerX1} ${cornerY1}`;
            
            if (startY < endY) {
                path += ` Q ${cornerX1} ${cornerY1 + cornerRadius} ${cornerX1 - cornerRadius} ${cornerY1 + cornerRadius}`;
                path += ` L ${cornerX2 - cornerRadius} ${cornerY2 - cornerRadius}`;
                path += ` Q ${cornerX2} ${cornerY2 - cornerRadius} ${cornerX2} ${cornerY2}`;
            } else {
                path += ` Q ${cornerX1} ${cornerY1 - cornerRadius} ${cornerX1 - cornerRadius} ${cornerY1 - cornerRadius}`;
                path += ` L ${cornerX2 - cornerRadius} ${cornerY2 + cornerRadius}`;
                path += ` Q ${cornerX2} ${cornerY2 + cornerRadius} ${cornerX2} ${cornerY2}`;
            }
            
            path += ` L ${endX} ${endY}`;
        }
        
        return path;
    }

    calculateMessageToAccountPath(messagePoint, accountPoint) {
        const { cornerRadius, horizontalOffset } = this.options;
        
        const startX = messagePoint.x;
        const startY = messagePoint.y;
        const endX = accountPoint.x;
        const endY = accountPoint.y;
        
        const midX1 = startX + horizontalOffset;
        const midY1 = startY;
        const midX2 = endX;
        const midY2 = endY;
        
        let path = `M ${startX} ${startY}`;
        
        if (Math.abs(startY - endY) < 5) {
            path += ` L ${midX1} ${midY1}`;
            path += ` L ${endX} ${endY}`;
        } else {
            const cornerX1 = midX1;
            const cornerY1 = midY1;
            const cornerX2 = midX1;
            const cornerY2 = endY;
            
            path += ` L ${cornerX1} ${cornerY1}`;
            
            if (startY < endY) {
                path += ` Q ${cornerX1} ${cornerY1 + cornerRadius} ${cornerX1 + cornerRadius} ${cornerY1 + cornerRadius}`;
                path += ` L ${cornerX2 + cornerRadius} ${cornerY2 - cornerRadius}`;
                path += ` Q ${cornerX2} ${cornerY2 - cornerRadius} ${cornerX2} ${cornerY2}`;
            } else {
                path += ` Q ${cornerX1} ${cornerY1 - cornerRadius} ${cornerX1 + cornerRadius} ${cornerY1 - cornerRadius}`;
                path += ` L ${cornerX2 + cornerRadius} ${cornerY2 + cornerRadius}`;
                path += ` Q ${cornerX2} ${cornerY2 + cornerRadius} ${cornerX2} ${cornerY2}`;
            }
            
            path += ` L ${endX} ${endY}`;
        }
        
        return path;
    }

    calculateSmoothPath(points, options = {}) {
        if (points.length < 2) return '';
        
        const { tension = 0.3, cornerRadius = this.options.cornerRadius } = options;
        
        let path = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length; i++) {
            const current = points[i];
            const previous = points[i - 1];
            
            if (i === points.length - 1) {
                path += ` L ${current.x} ${current.y}`;
            } else {
                const next = points[i + 1];
                
                const cp1x = previous.x + (current.x - previous.x) * tension;
                const cp1y = previous.y + (current.y - previous.y) * tension;
                const cp2x = current.x - (next.x - current.x) * tension;
                const cp2y = current.y - (next.y - current.y) * tension;
                
                path += ` Q ${cp1x} ${cp1y} ${current.x} ${current.y}`;
            }
        }
        
        return path;
    }

    calculateBezierPath(startPoint, endPoint, controlOffset = 50) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        
        const cp1x = startPoint.x + dx * 0.3;
        const cp1y = startPoint.y - controlOffset;
        const cp2x = endPoint.x - dx * 0.3;
        const cp2y = endPoint.y - controlOffset;
        
        return `M ${startPoint.x} ${startPoint.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endPoint.x} ${endPoint.y}`;
    }

    calculateAnimatedPath(startPath, endPath, progress) {
        const startCommands = this.parsePathCommands(startPath);
        const endCommands = this.parsePathCommands(endPath);
        
        if (startCommands.length !== endCommands.length) {
            return progress < 0.5 ? startPath : endPath;
        }
        
        let interpolatedPath = '';
        
        for (let i = 0; i < startCommands.length; i++) {
            const startCmd = startCommands[i];
            const endCmd = endCommands[i];
            
            if (startCmd.type !== endCmd.type) {
                interpolatedPath += progress < 0.5 ? startCmd.command : endCmd.command;
                continue;
            }
            
            let command = startCmd.type;
            for (let j = 0; j < startCmd.params.length; j++) {
                const startValue = startCmd.params[j];
                const endValue = endCmd.params[j];
                const interpolatedValue = startValue + (endValue - startValue) * progress;
                command += ` ${interpolatedValue}`;
            }
            
            interpolatedPath += command;
        }
        
        return interpolatedPath;
    }

    parsePathCommands(path) {
        const commands = [];
        const regex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
        let match;
        
        while ((match = regex.exec(path)) !== null) {
            const type = match[1];
            const params = match[2].trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            commands.push({
                type,
                params,
                command: match[0]
            });
        }
        
        return commands;
    }

    optimizePathForPerformance(path) {
        return path
            .replace(/\s+/g, ' ')
            .replace(/,/g, ' ')
            .replace(/([ML])\s*/g, '$1')
            .replace(/\s*([LQC])\s*/g, ' $1')
            .trim();
    }

    getPathLength(path) {
        if (typeof document === 'undefined') return 0;
        
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempPath.setAttribute('d', path);
        tempSvg.appendChild(tempPath);
        document.body.appendChild(tempSvg);
        
        const length = tempPath.getTotalLength();
        
        document.body.removeChild(tempSvg);
        return length;
    }
}

export default SVGPathCalculator;