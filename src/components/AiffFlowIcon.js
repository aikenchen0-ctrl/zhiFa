import * as PIXI from 'pixi.js';

export class AiffFlowIcon extends PIXI.Container {
    constructor(workflow, options = {}) {
        super();
        
        this.workflow = workflow;
        this.options = {
            width: 120,
            height: 50,
            iconSize: 35,
            scrollSpeed: 1,
            ...options
        };
        
        this.isHovered = false;
        this.scrollingTexts = [];
        this.scrollingTicker = null;
        this.textScrollOffset = 0;
        this.currentPhaseIndex = 0;
        
        // AIFF phases with dynamic text
        this.aiffPhases = [
            'Analysis',
            'Intelligence',
            'Fusion',
            'Flow',
            'Processing...',
            'Optimizing...',
            'Synthesizing...',
            'Completing...'
        ];
        
        console.log('AiffFlowIcon: Creating AIFF flow icon with dynamic text scrolling');
        
        this.setupContainer();
        this.createIcon();
        this.createTextScrolling();
        this.setupEvents();
        this.startAnimations();
    }
    
    setupContainer() {
        // Background with special AIFF styling
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
        
        // Gradient-like background for AIFF
        this.background.beginFill(0x9b59b6, 0.3);
        this.background.drawRoundedRect(2, 2, this.options.width - 4, this.options.height - 4, 10);
        this.background.endFill();
        
        if (this.isHovered) {
            this.background.beginFill(0x8e44ad, 0.5);
            this.background.drawRoundedRect(4, 4, this.options.width - 8, this.options.height - 8, 8);
            this.background.endFill();
        }
        
        // Special border pattern for AIFF
        this.background.lineStyle(2, 0x9b59b6, 0.8);
        this.background.drawRoundedRect(1, 1, this.options.width - 2, this.options.height - 2, 10);
        
        // Add animated border segments
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2) / 4 + (Date.now() * 0.001);
            const x = (this.options.width / 2) + Math.cos(angle) * (this.options.width / 2 - 5);
            const y = (this.options.height / 2) + Math.sin(angle) * (this.options.height / 2 - 5);
            
            this.background.beginFill(0xe74c3c);
            this.background.drawCircle(x, y, 2);
            this.background.endFill();
        }
    }
    
    createIcon() {
        this.iconContainer = new PIXI.Container();
        
        // AIFF special icon - flowing pattern
        this.iconBg = new PIXI.Graphics();
        this.iconBg.beginFill(0x9b59b6, 0.9);
        this.iconBg.drawCircle(0, 0, this.options.iconSize / 2);
        this.iconBg.endFill();
        
        // Create flowing AIFF pattern
        this.aiffPattern = this.createAiffPattern();
        
        this.iconContainer.addChild(this.iconBg);
        this.iconContainer.addChild(this.aiffPattern);
        
        // Position icon
        this.iconContainer.x = this.options.width / 2;
        this.iconContainer.y = this.options.height / 2 - 8;
        
        this.addChild(this.iconContainer);
        
        console.log('AiffFlowIcon: AIFF icon created');
    }
    
    createAiffPattern() {
        const pattern = new PIXI.Graphics();
        
        // Create flowing A-I-F-F pattern
        pattern.lineStyle(2, 0xffffff, 0.9);
        
        // A
        pattern.moveTo(-12, 5);
        pattern.lineTo(-8, -8);
        pattern.lineTo(-4, 5);
        pattern.moveTo(-10, -1);
        pattern.lineTo(-6, -1);
        
        // I
        pattern.moveTo(-2, -8);
        pattern.lineTo(-2, 5);
        pattern.moveTo(-4, -8);
        pattern.lineTo(0, -8);
        pattern.moveTo(-4, 5);
        pattern.lineTo(0, 5);
        
        // F
        pattern.moveTo(2, -8);
        pattern.lineTo(2, 5);
        pattern.moveTo(2, -8);
        pattern.lineTo(8, -8);
        pattern.moveTo(2, -1);
        pattern.lineTo(6, -1);
        
        // F
        pattern.moveTo(10, -8);
        pattern.lineTo(10, 5);
        pattern.moveTo(10, -8);
        pattern.lineTo(16, -8);
        pattern.moveTo(10, -1);
        pattern.lineTo(14, -1);
        
        return pattern;
    }
    
    createTextScrolling() {
        // Create scrolling text container
        this.textContainer = new PIXI.Container();
        this.textContainer.y = this.options.height - 12;
        
        // Create mask for text scrolling
        this.textMask = new PIXI.Graphics();
        this.textMask.beginFill(0xffffff);
        this.textMask.drawRect(5, this.options.height - 15, this.options.width - 10, 12);
        this.textMask.endFill();
        this.addChild(this.textMask);
        
        this.textContainer.mask = this.textMask;
        this.addChild(this.textContainer);
        
        this.createScrollingTexts();
        this.startTextScrolling();
        
        console.log('AiffFlowIcon: Text scrolling system created');
    }
    
    createScrollingTexts() {
        // Clear existing texts
        this.scrollingTexts.forEach(text => {
            this.textContainer.removeChild(text);
            text.destroy();
        });
        this.scrollingTexts = [];
        
        // Create texts for each phase
        this.aiffPhases.forEach((phase, index) => {
            const text = new PIXI.Text(phase, {
                fontSize: 9,
                fill: 0xe74c3c,
                fontWeight: 'bold'
            });
            
            // Position texts in sequence
            text.x = index * (this.options.width + 20);
            text.y = 0;
            
            this.textContainer.addChild(text);
            this.scrollingTexts.push(text);
        });
        
        console.log('AiffFlowIcon: Created', this.scrollingTexts.length, 'scrolling texts');
    }
    
    startTextScrolling() {
        if (this.scrollingTicker) {
            this.scrollingTicker.stop();
            this.scrollingTicker.destroy();
        }
        
        this.scrollingTicker = new PIXI.Ticker();
        this.scrollingTicker.add(this.updateTextScroll.bind(this));
        this.scrollingTicker.start();
        
        console.log('AiffFlowIcon: Text scrolling animation started');
    }
    
    updateTextScroll() {
        this.textScrollOffset -= this.options.scrollSpeed;
        
        // Update text positions
        this.scrollingTexts.forEach((text, index) => {
            text.x = this.textScrollOffset + index * (this.options.width + 20);
            
            // Fade effect based on position
            const centerX = this.options.width / 2;
            const distance = Math.abs(text.x + text.width / 2 - centerX);
            const maxDistance = this.options.width / 2;
            
            if (distance < maxDistance) {
                text.alpha = 1 - (distance / maxDistance) * 0.7;
            } else {
                text.alpha = 0.3;
            }
        });
        
        // Reset scroll when all texts have passed
        const totalWidth = this.aiffPhases.length * (this.options.width + 20);
        if (Math.abs(this.textScrollOffset) >= totalWidth) {
            this.textScrollOffset = this.options.width;
            
            // Cycle to next phase set
            this.cyclePhases();
        }
    }
    
    cyclePhases() {
        // Rotate phases for dynamic content
        const firstPhase = this.aiffPhases.shift();
        this.aiffPhases.push(firstPhase);
        
        // Update phase content based on workflow status
        this.updatePhaseContent();
        this.createScrollingTexts();
        
        console.log('AiffFlowIcon: Cycled to next phase set');
    }
    
    updatePhaseContent() {
        const basePhases = ['Analysis', 'Intelligence', 'Fusion', 'Flow'];
        const statusPhases = {
            'running': ['Processing...', 'Computing...', 'Analyzing...', 'Optimizing...'],
            'completed': ['Complete', 'Success', 'Finished', 'Done'],
            'error': ['Error', 'Failed', 'Retry', 'Debug'],
            'idle': ['Ready', 'Standby', 'Waiting', 'Idle']
        };
        
        const status = this.workflow.status || 'idle';
        const dynamicPhases = statusPhases[status] || statusPhases.idle;
        
        // Mix base phases with status-specific phases
        this.aiffPhases = [
            ...basePhases,
            ...dynamicPhases
        ];
        
        console.log('AiffFlowIcon: Updated phase content for status', status);
    }
    
    setupEvents() {
        this.on('pointerover', this.onHover.bind(this));
        this.on('pointerout', this.onHoverOut.bind(this));
        this.on('pointerdown', this.onClick.bind(this));
        
        console.log('AiffFlowIcon: Events setup complete');
    }
    
    startAnimations() {
        // Icon rotation animation
        this.iconRotationTicker = new PIXI.Ticker();
        this.iconRotationTicker.add(() => {
            this.aiffPattern.rotation += 0.01;
            
            // Pulsing effect
            const time = Date.now() * 0.005;
            this.iconBg.scale.set(1 + Math.sin(time) * 0.1);
        });
        this.iconRotationTicker.start();
        
        // Background animation
        this.backgroundTicker = new PIXI.Ticker();
        this.backgroundTicker.add(() => {
            this.updateBackground();
        });
        this.backgroundTicker.start();
        
        console.log('AiffFlowIcon: Started all animations');
    }
    
    stopAnimations() {
        if (this.scrollingTicker) {
            this.scrollingTicker.stop();
            this.scrollingTicker.destroy();
            this.scrollingTicker = null;
        }
        
        if (this.iconRotationTicker) {
            this.iconRotationTicker.stop();
            this.iconRotationTicker.destroy();
            this.iconRotationTicker = null;
        }
        
        if (this.backgroundTicker) {
            this.backgroundTicker.stop();
            this.backgroundTicker.destroy();
            this.backgroundTicker = null;
        }
        
        console.log('AiffFlowIcon: Stopped all animations');
    }
    
    onHover() {
        this.isHovered = true;
        this.updateBackground();
        
        // Speed up scrolling on hover
        this.options.scrollSpeed = 2;
        
        // Scale up icon
        this.iconContainer.scale.set(1.1);
        
        // Show detailed tooltip
        this.showAiffTooltip();
        
        console.log('AiffFlowIcon: Hovered - increased scroll speed');
    }
    
    onHoverOut() {
        this.isHovered = false;
        this.updateBackground();
        
        // Reset scroll speed
        this.options.scrollSpeed = 1;
        
        // Scale back to normal
        this.iconContainer.scale.set(1);
        
        // Hide tooltip
        this.hideAiffTooltip();
        
        console.log('AiffFlowIcon: Hover out - reset scroll speed');
    }
    
    onClick() {
        console.log('AiffFlowIcon: AIFF workflow clicked');
        this.emit('aiffFlowClicked', this.workflow);
        
        // Special click effect for AIFF
        this.iconContainer.scale.set(0.9);
        
        // Burst effect
        this.createClickBurstEffect();
        
        setTimeout(() => {
            this.iconContainer.scale.set(1);
        }, 150);
    }
    
    createClickBurstEffect() {
        const burstContainer = new PIXI.Container();
        
        // Create particles
        for (let i = 0; i < 8; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(0x9b59b6);
            particle.drawCircle(0, 0, 2);
            particle.endFill();
            
            const angle = (i * Math.PI * 2) / 8;
            const startX = this.iconContainer.x;
            const startY = this.iconContainer.y;
            
            particle.x = startX;
            particle.y = startY;
            
            burstContainer.addChild(particle);
            
            // Animate particle outward
            const targetX = startX + Math.cos(angle) * 30;
            const targetY = startY + Math.sin(angle) * 30;
            
            const animateTicker = new PIXI.Ticker();
            let progress = 0;
            
            animateTicker.add(() => {
                progress += 0.05;
                
                particle.x = startX + (targetX - startX) * progress;
                particle.y = startY + (targetY - startY) * progress;
                particle.alpha = 1 - progress;
                
                if (progress >= 1) {
                    animateTicker.stop();
                    animateTicker.destroy();
                    burstContainer.removeChild(particle);
                    particle.destroy();
                    
                    if (burstContainer.children.length === 0) {
                        this.removeChild(burstContainer);
                        burstContainer.destroy();
                    }
                }
            });
            
            animateTicker.start();
        }
        
        this.addChild(burstContainer);
        
        console.log('AiffFlowIcon: Created click burst effect');
    }
    
    showAiffTooltip() {
        if (this.tooltip) return;
        
        this.tooltip = new PIXI.Container();
        
        // Tooltip background
        const tooltipBg = new PIXI.Graphics();
        tooltipBg.beginFill(0x2c3e50, 0.95);
        tooltipBg.drawRoundedRect(0, 0, 150, 60, 8);
        tooltipBg.endFill();
        
        // AIFF title
        const titleText = new PIXI.Text('AIFF Flow System', {
            fontSize: 12,
            fill: 0x9b59b6,
            fontWeight: 'bold'
        });
        titleText.x = 10;
        titleText.y = 8;
        
        // Description
        const descText = new PIXI.Text('Analysis • Intelligence\nFusion • Flow', {
            fontSize: 10,
            fill: 0xecf0f1,
            align: 'center'
        });
        descText.x = 10;
        descText.y = 25;
        
        // Status
        const statusText = new PIXI.Text(`Status: ${this.workflow.status || 'Active'}`, {
            fontSize: 9,
            fill: 0x95a5a6
        });
        statusText.x = 10;
        statusText.y = 45;
        
        this.tooltip.addChild(tooltipBg);
        this.tooltip.addChild(titleText);
        this.tooltip.addChild(descText);
        this.tooltip.addChild(statusText);
        
        // Position tooltip
        this.tooltip.x = this.options.width + 5;
        this.tooltip.y = -15;
        
        this.addChild(this.tooltip);
        
        console.log('AiffFlowIcon: AIFF tooltip shown');
    }
    
    hideAiffTooltip() {
        if (this.tooltip) {
            this.removeChild(this.tooltip);
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }
    
    updateWorkflow(newWorkflow) {
        this.workflow = { ...this.workflow, ...newWorkflow };
        this.updatePhaseContent();
        
        console.log('AiffFlowIcon: Updated AIFF workflow to status', this.workflow.status);
    }
    
    setScrollSpeed(speed) {
        this.options.scrollSpeed = Math.max(0.1, Math.min(5, speed));
        console.log('AiffFlowIcon: Set scroll speed to', this.options.scrollSpeed);
    }
    
    // Apply squashing effect for scroll animations
    applySquashEffect(factor) {
        this.scale.y = factor;
        this.scale.x = 1 + (1 - factor) * 0.2;
        
        // Adjust text scrolling speed based on squash
        this.options.scrollSpeed = 1 + (1 - factor) * 2;
        
        console.log('AiffFlowIcon: Applied squash effect', factor);
    }
    
    removeSquashEffect() {
        this.scale.set(1);
        this.options.scrollSpeed = 1;
    }
    
    destroy() {
        this.stopAnimations();
        this.hideAiffTooltip();
        
        this.scrollingTexts.forEach(text => {
            text.destroy();
        });
        this.scrollingTexts = [];
        
        super.destroy();
        console.log('AiffFlowIcon: AIFF flow icon destroyed');
    }
}