import * as PIXI from 'pixi.js';

export class WorkflowIcon extends PIXI.Container {
    constructor(workflow, options = {}) {
        super();
        
        this.workflow = workflow;
        this.options = {
            width: 120,
            height: 50,
            iconSize: 35,
            showProgress: true,
            showStatus: true,
            ...options
        };
        
        this.isHovered = false;
        this.statusColor = this.getStatusColor();
        this.pulseAnimation = null;
        
        console.log('WorkflowIcon: Creating icon for', workflow.name, 'status:', workflow.status);
        
        this.setupContainer();
        this.createIcon();
        this.createProgressBar();
        this.createStatusIndicator();
        this.setupEvents();
        this.startAnimations();
    }
    
    setupContainer() {
        // Background
        this.background = new PIXI.Graphics();
        this.updateBackground();
        this.addChild(this.background);
        
        // Interactive area
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.width, this.options.height);
        this.interactive = true;
        this.buttonMode = true;
    }
    
    updateBackground() {
        this.background.clear();
        
        if (this.isHovered) {
            this.background.beginFill(0x3498db, 0.3);
            this.background.drawRoundedRect(2, 2, this.options.width - 4, this.options.height - 4, 8);
            this.background.endFill();
        }
        
        // Add subtle border based on status
        this.background.lineStyle(1, this.statusColor, 0.5);
        this.background.drawRoundedRect(1, 1, this.options.width - 2, this.options.height - 2, 6);
        this.background.endFill();
    }
    
    createIcon() {
        this.iconContainer = new PIXI.Container();
        
        // Icon background circle
        this.iconBg = new PIXI.Graphics();
        this.iconBg.beginFill(this.statusColor, 0.8);
        this.iconBg.drawCircle(0, 0, this.options.iconSize / 2);
        this.iconBg.endFill();
        
        // Create icon based on workflow type
        this.iconShape = this.createIconShape();
        
        this.iconContainer.addChild(this.iconBg);
        this.iconContainer.addChild(this.iconShape);
        
        // Position icon
        this.iconContainer.x = this.options.width / 2;
        this.iconContainer.y = this.options.height / 2 - 5;
        
        this.addChild(this.iconContainer);
        
        // Workflow name (abbreviated)
        const shortName = this.workflow.name.length > 8 ? 
                         this.workflow.name.substring(0, 6) + '..' : 
                         this.workflow.name;
        
        this.nameText = new PIXI.Text(shortName, {
            fontSize: 9,
            fill: 0xecf0f1,
            fontWeight: 'bold'
        });
        this.nameText.anchor.set(0.5);
        this.nameText.x = this.options.width / 2;
        this.nameText.y = this.options.height - 8;
        this.addChild(this.nameText);
        
        console.log('WorkflowIcon: Icon created for', this.workflow.name);
    }
    
    createIconShape() {
        const shape = new PIXI.Graphics();
        
        // Different shapes based on workflow type
        const shapeType = this.getShapeType();
        
        switch (shapeType) {
            case 'triangle':
                shape.beginFill(0xffffff);
                shape.drawPolygon([
                    0, -8,
                    8, 6,
                    -8, 6
                ]);
                shape.endFill();
                break;
                
            case 'square':
                shape.beginFill(0xffffff);
                shape.drawRoundedRect(-8, -8, 16, 16, 2);
                shape.endFill();
                break;
                
            case 'diamond':
                shape.beginFill(0xffffff);
                shape.drawPolygon([
                    0, -10,
                    10, 0,
                    0, 10,
                    -10, 0
                ]);
                shape.endFill();
                break;
                
            case 'hexagon':
                shape.beginFill(0xffffff);
                const hexPoints = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI * 2) / 6;
                    hexPoints.push(Math.cos(angle) * 8, Math.sin(angle) * 8);
                }
                shape.drawPolygon(hexPoints);
                shape.endFill();
                break;
                
            default: // circle
                shape.beginFill(0xffffff);
                shape.drawCircle(0, 0, 8);
                shape.endFill();
                break;
        }
        
        // Add inner detail
        shape.beginFill(this.statusColor);
        shape.drawCircle(0, 0, 3);
        shape.endFill();
        
        return shape;
    }
    
    getShapeType() {
        const name = this.workflow.name.toLowerCase();
        
        if (name.includes('analysis') || name.includes('research')) return 'triangle';
        if (name.includes('report') || name.includes('document')) return 'square';
        if (name.includes('automation') || name.includes('deploy')) return 'diamond';
        if (name.includes('integration') || name.includes('optimization')) return 'hexagon';
        
        return 'circle';
    }
    
    createProgressBar() {
        if (!this.options.showProgress || this.workflow.status === 'idle') return;
        
        this.progressContainer = new PIXI.Container();
        
        // Progress background
        this.progressBg = new PIXI.Graphics();
        this.progressBg.beginFill(0x2c3e50);
        this.progressBg.drawRoundedRect(0, 0, 30, 4, 2);
        this.progressBg.endFill();
        
        // Progress fill
        this.progressFill = new PIXI.Graphics();
        this.updateProgressBar();
        
        this.progressContainer.addChild(this.progressBg);
        this.progressContainer.addChild(this.progressFill);
        
        // Position progress bar
        this.progressContainer.x = (this.options.width - 30) / 2;
        this.progressContainer.y = this.options.height / 2 + this.options.iconSize / 2 + 2;
        
        this.addChild(this.progressContainer);
        
        console.log('WorkflowIcon: Progress bar created for', this.workflow.name, 'progress:', this.workflow.progress);
    }
    
    updateProgressBar() {
        if (!this.progressFill) return;
        
        this.progressFill.clear();
        this.progressFill.beginFill(this.statusColor);
        this.progressFill.drawRoundedRect(0, 0, 30 * this.workflow.progress, 4, 2);
        this.progressFill.endFill();
    }
    
    createStatusIndicator() {
        if (!this.options.showStatus) return;
        
        this.statusIndicator = new PIXI.Graphics();
        this.statusIndicator.beginFill(this.statusColor);
        this.statusIndicator.drawCircle(0, 0, 3);
        this.statusIndicator.endFill();
        
        // Position in top-right corner
        this.statusIndicator.x = this.options.width - 10;
        this.statusIndicator.y = 10;
        
        this.addChild(this.statusIndicator);
        
        console.log('WorkflowIcon: Status indicator created for', this.workflow.name);
    }
    
    setupEvents() {
        this.on('pointerover', this.onHover.bind(this));
        this.on('pointerout', this.onHoverOut.bind(this));
        this.on('pointerdown', this.onClick.bind(this));
        
        console.log('WorkflowIcon: Events setup for', this.workflow.name);
    }
    
    startAnimations() {
        if (this.workflow.status === 'running') {
            this.startPulseAnimation();
        }
        
        // Rotation animation for active workflows
        if (this.workflow.status === 'running' && this.iconShape) {
            this.rotationTicker = new PIXI.Ticker();
            this.rotationTicker.add(() => {
                this.iconShape.rotation += 0.02;
            });
            this.rotationTicker.start();
            
            console.log('WorkflowIcon: Started rotation animation for', this.workflow.name);
        }
    }
    
    startPulseAnimation() {
        if (this.pulseAnimation) return;
        
        this.pulseAnimation = new PIXI.Ticker();
        let pulseDirection = 1;
        let pulseScale = 1;
        
        this.pulseAnimation.add(() => {
            pulseScale += pulseDirection * 0.01;
            
            if (pulseScale > 1.1) {
                pulseDirection = -1;
            } else if (pulseScale < 0.9) {
                pulseDirection = 1;
            }
            
            if (this.statusIndicator) {
                this.statusIndicator.scale.set(pulseScale);
            }
        });
        
        this.pulseAnimation.start();
        
        console.log('WorkflowIcon: Started pulse animation for', this.workflow.name);
    }
    
    stopAnimations() {
        if (this.pulseAnimation) {
            this.pulseAnimation.stop();
            this.pulseAnimation.destroy();
            this.pulseAnimation = null;
        }
        
        if (this.rotationTicker) {
            this.rotationTicker.stop();
            this.rotationTicker.destroy();
            this.rotationTicker = null;
        }
        
        console.log('WorkflowIcon: Stopped animations for', this.workflow.name);
    }
    
    onHover() {
        this.isHovered = true;
        this.updateBackground();
        
        // Scale up slightly on hover
        this.iconContainer.scale.set(1.1);
        
        // Show tooltip with full name
        this.showTooltip();
        
        console.log('WorkflowIcon: Hovered over', this.workflow.name);
    }
    
    onHoverOut() {
        this.isHovered = false;
        this.updateBackground();
        
        // Scale back to normal
        this.iconContainer.scale.set(1);
        
        // Hide tooltip
        this.hideTooltip();
        
        console.log('WorkflowIcon: Hover out', this.workflow.name);
    }
    
    onClick() {
        console.log('WorkflowIcon: Clicked', this.workflow.name);
        this.emit('workflowClicked', this.workflow);
        
        // Visual feedback
        this.iconContainer.scale.set(0.95);
        setTimeout(() => {
            this.iconContainer.scale.set(1);
        }, 100);
    }
    
    showTooltip() {
        if (this.tooltip) return;
        
        this.tooltip = new PIXI.Container();
        
        // Tooltip background
        const tooltipBg = new PIXI.Graphics();
        tooltipBg.beginFill(0x2c3e50, 0.9);
        tooltipBg.drawRoundedRect(0, 0, this.workflow.name.length * 8 + 20, 25, 5);
        tooltipBg.endFill();
        
        // Tooltip text
        const tooltipText = new PIXI.Text(this.workflow.name, {
            fontSize: 11,
            fill: 0xffffff
        });
        tooltipText.x = 10;
        tooltipText.y = 7;
        
        this.tooltip.addChild(tooltipBg);
        this.tooltip.addChild(tooltipText);
        
        // Position tooltip
        this.tooltip.x = this.options.width + 5;
        this.tooltip.y = -5;
        
        this.addChild(this.tooltip);
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.removeChild(this.tooltip);
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }
    
    getStatusColor() {
        switch (this.workflow.status) {
            case 'running':
                return 0x3498db; // Blue
            case 'completed':
                return 0x27ae60; // Green
            case 'error':
                return 0xe74c3c; // Red
            case 'idle':
            default:
                return 0x95a5a6; // Gray
        }
    }
    
    updateWorkflow(newWorkflow) {
        const oldStatus = this.workflow.status;
        this.workflow = { ...this.workflow, ...newWorkflow };
        this.statusColor = this.getStatusColor();
        
        // Update visual elements
        this.iconBg.clear();
        this.iconBg.beginFill(this.statusColor, 0.8);
        this.iconBg.drawCircle(0, 0, this.options.iconSize / 2);
        this.iconBg.endFill();
        
        if (this.statusIndicator) {
            this.statusIndicator.clear();
            this.statusIndicator.beginFill(this.statusColor);
            this.statusIndicator.drawCircle(0, 0, 3);
            this.statusIndicator.endFill();
        }
        
        this.updateProgressBar();
        this.updateBackground();
        
        // Handle animation changes
        if (oldStatus !== this.workflow.status) {
            this.stopAnimations();
            this.startAnimations();
        }
        
        console.log('WorkflowIcon: Updated workflow', this.workflow.name, 'to status', this.workflow.status);
    }
    
    // Apply squashing effect for scroll animations
    applySquashEffect(factor) {
        this.scale.y = factor;
        this.scale.x = 1 + (1 - factor) * 0.3; // Expand width when squashed
        
        console.log('WorkflowIcon: Applied squash effect', factor, 'to', this.workflow.name);
    }
    
    removeSquashEffect() {
        this.scale.set(1);
    }
    
    destroy() {
        this.stopAnimations();
        this.hideTooltip();
        super.destroy();
        console.log('WorkflowIcon: Destroyed icon for', this.workflow.name);
    }
}