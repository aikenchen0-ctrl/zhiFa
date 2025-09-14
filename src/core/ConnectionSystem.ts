/**
 * Core Connection System with CSS Anchor Positioning Integration
 * Manages dynamic connection lines between message bubbles and avatars
 */

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface ConnectionElement {
  id: string;
  element: HTMLElement;
  anchorName: string;
  position: ConnectionPoint;
  container: 'chat' | 'sidebar' | 'topbar';
}

export interface ConnectionLine {
  id: string;
  from: ConnectionElement;
  to: ConnectionElement;
  type: 'self' | 'other';
  path: string;
  visible: boolean;
  animated: boolean;
}

export interface ConnectionConfig {
  cornerRadius: number;
  strokeWidth: number;
  color: string;
  opacity: number;
  animationDuration: number;
}

export class ConnectionSystem {
  private connections = new Map<string, ConnectionLine>();
  private elements = new Map<string, ConnectionElement>();
  private svgContainer: SVGElement | null = null;
  private animationFrame: number | null = null;
  private isInitialized = false;
  
  private config: ConnectionConfig = {
    cornerRadius: 8,
    strokeWidth: 2,
    color: 'rgba(59, 130, 246, 0.6)',
    opacity: 0.8,
    animationDuration: 300
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;
    
    // Import and initialize CSS Anchor Positioning polyfill
    this.initializePolyfill();
    
    // Create SVG container
    this.createSVGContainer();
    
    // Start update loop
    this.startUpdateLoop();
    
    this.isInitialized = true;
  }

  private async initializePolyfill() {
    try {
      const { polyfill } = await import('@oddbird/css-anchor-positioning');
      
      // Check if native support exists
      if (!CSS.supports('anchor-name: --test')) {
        polyfill();
        console.log('CSS Anchor Positioning polyfill loaded');
      } else {
        console.log('Native CSS Anchor Positioning support detected');
      }
    } catch (error) {
      console.warn('Failed to load CSS Anchor Positioning polyfill:', error);
    }
  }

  private createSVGContainer() {
    // Create SVG overlay for connection lines
    this.svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgContainer.setAttribute('class', 'connection-layer');
    this.svgContainer.setAttribute('style', `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `);

    // Add gradient definitions
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = 'connectionGradient';
    gradient.innerHTML = `
      <stop offset="0%" stop-color="${this.config.color}" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="${this.config.color}" stop-opacity="${this.config.opacity}"/>
      <stop offset="100%" stop-color="${this.config.color}" stop-opacity="0.2"/>
    `;
    defs.appendChild(gradient);
    this.svgContainer.appendChild(defs);

    document.body.appendChild(this.svgContainer);
  }

  /**
   * Register an element for connection tracking
   */
  registerElement(
    id: string, 
    element: HTMLElement, 
    container: ConnectionElement['container'],
    anchorName?: string
  ): void {
    const anchor = anchorName || `anchor-${id}`;
    
    // Set anchor-name CSS property
    element.style.anchorName = `--${anchor}`;
    
    const connectionElement: ConnectionElement = {
      id,
      element,
      anchorName: anchor,
      position: this.getElementPosition(element),
      container
    };
    
    this.elements.set(id, connectionElement);
  }

  /**
   * Create connection between message bubble and avatar
   */
  createConnection(
    messageId: string, 
    avatarId: string, 
    type: 'self' | 'other'
  ): string {
    const messageEl = this.elements.get(messageId);
    const avatarEl = this.elements.get(avatarId);
    
    if (!messageEl || !avatarEl) {
      console.warn('Connection elements not found:', { messageId, avatarId });
      return '';
    }

    const connectionId = `${messageId}-${avatarId}`;
    const path = this.generateConnectionPath(messageEl, avatarEl, type);
    
    const connection: ConnectionLine = {
      id: connectionId,
      from: messageEl,
      to: avatarEl,
      type,
      path,
      visible: true,
      animated: true
    };
    
    this.connections.set(connectionId, connection);
    this.renderConnection(connection);
    
    return connectionId;
  }

  /**
   * Generate SVG path for connection line with rounded corners
   */
  private generateConnectionPath(
    from: ConnectionElement, 
    to: ConnectionElement, 
    type: 'self' | 'other'
  ): string {
    const fromPos = this.getElementPosition(from.element);
    const toPos = this.getElementPosition(to.element);
    
    let startPoint: ConnectionPoint;
    let endPoint: ConnectionPoint;
    
    if (type === 'other') {
      // Other messages: bubble left center → avatar right center
      const fromRect = from.element.getBoundingClientRect();
      const toRect = to.element.getBoundingClientRect();
      
      startPoint = {
        x: fromRect.left,
        y: fromRect.top + fromRect.height / 2
      };
      
      endPoint = {
        x: toRect.right,
        y: toRect.top + toRect.height / 2
      };
    } else {
      // Self messages: bubble right center → avatar left center
      const fromRect = from.element.getBoundingClientRect();
      const toRect = to.element.getBoundingClientRect();
      
      startPoint = {
        x: fromRect.right,
        y: fromRect.top + fromRect.height / 2
      };
      
      endPoint = {
        x: toRect.left,
        y: toRect.top + toRect.height / 2
      };
    }

    return this.createRoundedPath(startPoint, endPoint, type);
  }

  /**
   * Create SVG path with rounded corners
   */
  private createRoundedPath(
    start: ConnectionPoint, 
    end: ConnectionPoint, 
    type: 'self' | 'other'
  ): string {
    const { cornerRadius } = this.config;
    const horizontalDistance = type === 'other' ? -5 : 5; // 5px from edge
    const verticalDistance = end.y - start.y;
    
    // Calculate corner positions
    const corner1: ConnectionPoint = {
      x: start.x + horizontalDistance,
      y: start.y
    };
    
    const corner2: ConnectionPoint = {
      x: start.x + horizontalDistance,
      y: end.y
    };

    // Build SVG path with quadratic curves for rounded corners
    let path = `M ${start.x} ${start.y}`;
    
    // Horizontal line to first corner
    if (Math.abs(horizontalDistance) > cornerRadius) {
      path += ` L ${corner1.x + (horizontalDistance > 0 ? -cornerRadius : cornerRadius)} ${corner1.y}`;
      
      // First rounded corner
      path += ` Q ${corner1.x} ${corner1.y} ${corner1.x} ${corner1.y + (verticalDistance > 0 ? cornerRadius : -cornerRadius)}`;
      
      // Vertical line
      if (Math.abs(verticalDistance) > 2 * cornerRadius) {
        path += ` L ${corner2.x} ${corner2.y + (verticalDistance > 0 ? -cornerRadius : cornerRadius)}`;
      }
      
      // Second rounded corner
      path += ` Q ${corner2.x} ${corner2.y} ${corner2.x + (horizontalDistance > 0 ? cornerRadius : -cornerRadius)} ${corner2.y}`;
      
      // Final horizontal line to end
      path += ` L ${end.x} ${end.y}`;
    } else {
      // Direct line if distance is too small for corners
      path += ` L ${end.x} ${end.y}`;
    }
    
    return path;
  }

  /**
   * Get element position relative to viewport
   */
  private getElementPosition(element: HTMLElement): ConnectionPoint {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  /**
   * Render connection line to SVG
   */
  private renderConnection(connection: ConnectionLine): void {
    if (!this.svgContainer) return;

    // Remove existing path
    const existingPath = this.svgContainer.querySelector(`#path-${connection.id}`);
    if (existingPath) {
      existingPath.remove();
    }

    // Create new path element
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.id = `path-${connection.id}`;
    pathElement.setAttribute('d', connection.path);
    pathElement.setAttribute('stroke', this.config.color);
    pathElement.setAttribute('stroke-width', this.config.strokeWidth.toString());
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke-linecap', 'round');
    pathElement.setAttribute('stroke-linejoin', 'round');
    pathElement.setAttribute('opacity', connection.visible ? this.config.opacity.toString() : '0');

    // Add animation class if needed
    if (connection.animated) {
      pathElement.setAttribute('class', 'connection-animated');
      
      // CSS animations via style attribute
      pathElement.setAttribute('style', `
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: connectionDraw ${this.config.animationDuration}ms ease-out forwards;
      `);
    }

    this.svgContainer.appendChild(pathElement);
  }

  /**
   * Update all connection positions
   */
  private updateConnections(): void {
    this.connections.forEach(connection => {
      const newPath = this.generateConnectionPath(connection.from, connection.to, connection.type);
      if (newPath !== connection.path) {
        connection.path = newPath;
        this.renderConnection(connection);
      }
    });
  }

  /**
   * Start continuous update loop
   */
  private startUpdateLoop(): void {
    const update = () => {
      this.updateConnections();
      this.animationFrame = requestAnimationFrame(update);
    };
    
    this.animationFrame = requestAnimationFrame(update);
  }

  /**
   * Remove connection
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
    
    if (this.svgContainer) {
      const pathElement = this.svgContainer.querySelector(`#path-${connectionId}`);
      if (pathElement) {
        pathElement.remove();
      }
    }
  }

  /**
   * Clear all connections
   */
  clearConnections(): void {
    this.connections.clear();
    
    if (this.svgContainer) {
      const paths = this.svgContainer.querySelectorAll('path');
      paths.forEach(path => path.remove());
    }
  }

  /**
   * Toggle connection visibility
   */
  setConnectionVisibility(connectionId: string, visible: boolean): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.visible = visible;
      this.renderConnection(connection);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Re-render all connections with new config
    this.connections.forEach(connection => {
      this.renderConnection(connection);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    if (this.svgContainer && this.svgContainer.parentNode) {
      this.svgContainer.parentNode.removeChild(this.svgContainer);
    }
    
    this.connections.clear();
    this.elements.clear();
    this.isInitialized = false;
  }
}

// Global instance
export const connectionSystem = new ConnectionSystem();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes connectionDraw {
    from {
      stroke-dashoffset: 1000;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  
  .connection-animated {
    transition: opacity 0.3s ease, stroke-width 0.2s ease;
  }
  
  .connection-animated:hover {
    stroke-width: 3;
    opacity: 1;
  }
`;
document.head.appendChild(style);