/**
 * Test Data Generator System - 1000 Elements Performance Testing
 * 
 * Generates comprehensive test data for:
 * - Session avatars with unique anchor-names
 * - Message bubbles with varied content
 * - Account avatars with mapping relationships
 * - Performance testing scenarios and edge cases
 */

class TestDataGenerator {
    constructor() {
        this.elementCounter = 0;
        this.generatedElements = {
            sessionAvatars: [],
            messageBubbles: [],
            accountAvatars: []
        };
        this.avatarColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#10AC84', '#EE5A24', '#0ABDE3', '#C44569', '#F8B500'
        ];
        this.sampleMessages = [
            'Hi there!', 'How are you doing today?', 'That sounds great!',
            'I completely agree with your perspective on this matter.',
            'Sure thing!', 'Thanks for sharing that information with me.',
            'Looking forward to our meeting tomorrow at 3 PM.',
            'This is a longer message that contains multiple sentences and demonstrates how the bubble system handles extended content that might wrap across several lines.',
            'OK', 'Perfect!', 'Let me think about that for a moment.',
            'I appreciate your help with this project. It means a lot to me and I am grateful for your support and expertise.',
            'Yes', 'No problem at all, happy to help!',
            'Can we schedule a call to discuss the details of the implementation and go over the technical requirements?',
            'Absolutely!', 'That makes sense to me.',
            'Here is some additional context that might be helpful for understanding the full scope of what we are trying to accomplish with this particular feature.',
            'Sounds good!', 'I will get back to you soon.',
            'This message contains some technical details about the implementation: we need to consider the performance implications of rendering 1000+ elements simultaneously, optimize the anchor positioning system, and ensure smooth scrolling behavior.',
            'Got it!', 'Thanks again for everything!'
        ];
        this.userNames = [
            'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
            'Iris', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter',
            'Quinn', 'Ruby', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier',
            'Yara', 'Zoe', 'Alex', 'Blake', 'Casey', 'Drew'
        ];
    }

    /**
     * Generate unique anchor name with consistent naming convention
     */
    generateAnchorName(type, index) {
        return `${type}-anchor-${String(index).padStart(4, '0')}`;
    }

    /**
     * Get random avatar color
     */
    getRandomColor() {
        return this.avatarColors[Math.floor(Math.random() * this.avatarColors.length)];
    }

    /**
     * Get random message content with varied lengths
     */
    getRandomMessage() {
        return this.sampleMessages[Math.floor(Math.random() * this.sampleMessages.length)];
    }

    /**
     * Get random user name
     */
    getRandomUserName() {
        return this.userNames[Math.floor(Math.random() * this.userNames.length)];
    }

    /**
     * Generate message type with realistic distribution
     * 60% other messages, 40% self messages with some clustering
     */
    generateMessageType(index, previousType) {
        // Create message clusters for realistic conversation flow
        if (Math.random() < 0.3) {
            return previousType; // Continue same sender
        }
        return Math.random() < 0.6 ? 'other' : 'self';
    }

    /**
     * Generate session avatar data structure
     */
    generateSessionAvatar(index) {
        const avatar = {
            id: `session-avatar-${index}`,
            anchorName: this.generateAnchorName('session', index),
            color: this.getRandomColor(),
            userName: this.getRandomUserName(),
            isOnline: Math.random() < 0.7,
            lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString()
        };
        
        this.generatedElements.sessionAvatars.push(avatar);
        return avatar;
    }

    /**
     * Generate message bubble data structure
     */
    generateMessageBubble(index, messageType = null) {
        const type = messageType || this.generateMessageType(index, 
            this.generatedElements.messageBubbles[index - 1]?.type);
        
        const bubble = {
            id: `message-bubble-${index}`,
            anchorName: this.generateAnchorName('message', index),
            type: type,
            content: this.getRandomMessage(),
            timestamp: new Date(Date.now() - Math.random() * 604800000).toISOString(),
            isRead: Math.random() < 0.8,
            reactions: Math.random() < 0.2 ? ['👍', '❤️'][Math.floor(Math.random() * 2)] : null
        };
        
        this.generatedElements.messageBubbles.push(bubble);
        return bubble;
    }

    /**
     * Generate account avatar data structure
     */
    generateAccountAvatar(index, messageBubble) {
        const avatar = {
            id: `account-avatar-${index}`,
            anchorName: this.generateAnchorName('account', index),
            color: this.getRandomColor(),
            userName: messageBubble.type === 'self' ? 'You' : this.getRandomUserName(),
            messageId: messageBubble.id,
            isVerified: Math.random() < 0.3,
            status: ['online', 'away', 'busy', 'offline'][Math.floor(Math.random() * 4)]
        };
        
        this.generatedElements.accountAvatars.push(avatar);
        return avatar;
    }

    /**
     * Generate complete test dataset with specified count
     */
    generateTestData(count = 1000) {
        console.log(`Generating ${count} test elements...`);
        const startTime = performance.now();
        
        // Clear existing data
        this.clearGeneratedData();
        
        // Generate elements in batches for better performance
        const batchSize = 100;
        const batches = Math.ceil(count / batchSize);
        
        for (let batch = 0; batch < batches; batch++) {
            const batchStart = batch * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, count);
            
            for (let i = batchStart; i < batchEnd; i++) {
                // Generate session avatar
                const sessionAvatar = this.generateSessionAvatar(i);
                
                // Generate message bubble
                const messageBubble = this.generateMessageBubble(i);
                
                // Generate account avatar with mapping to message
                const accountAvatar = this.generateAccountAvatar(i, messageBubble);
                
                this.elementCounter++;
            }
            
            // Progress logging
            if (batch % 10 === 0) {
                console.log(`Generated batch ${batch + 1}/${batches} (${batchEnd} elements)`);
            }
        }
        
        const endTime = performance.now();
        console.log(`Generated ${count} elements in ${(endTime - startTime).toFixed(2)}ms`);
        
        return {
            sessionAvatars: this.generatedElements.sessionAvatars,
            messageBubbles: this.generatedElements.messageBubbles,
            accountAvatars: this.generatedElements.accountAvatars,
            statistics: this.getStatistics()
        };
    }

    /**
     * Generate edge cases for testing
     */
    generateEdgeCases() {
        const edgeCases = [];
        
        // Very long message
        edgeCases.push(this.generateMessageBubble(9001, 'other'));
        edgeCases[0].content = 'This is an extremely long message that is designed to test the bubble system\'s ability to handle extended content that spans multiple lines and potentially causes layout issues. '.repeat(5);
        
        // Very short message
        edgeCases.push(this.generateMessageBubble(9002, 'self'));
        edgeCases[1].content = 'A';
        
        // Empty message
        edgeCases.push(this.generateMessageBubble(9003, 'other'));
        edgeCases[2].content = '';
        
        // Message with special characters
        edgeCases.push(this.generateMessageBubble(9004, 'self'));
        edgeCases[3].content = '🎉✨🚀 Special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./ 中文测试 العربية';
        
        // Consecutive self messages (10 in a row)
        for (let i = 0; i < 10; i++) {
            edgeCases.push(this.generateMessageBubble(9010 + i, 'self'));
        }
        
        // Consecutive other messages (10 in a row)
        for (let i = 0; i < 10; i++) {
            edgeCases.push(this.generateMessageBubble(9020 + i, 'other'));
        }
        
        return edgeCases;
    }

    /**
     * Get generation statistics
     */
    getStatistics() {
        const selfMessages = this.generatedElements.messageBubbles.filter(m => m.type === 'self').length;
        const otherMessages = this.generatedElements.messageBubbles.filter(m => m.type === 'other').length;
        
        return {
            totalElements: this.elementCounter,
            sessionAvatars: this.generatedElements.sessionAvatars.length,
            messageBubbles: this.generatedElements.messageBubbles.length,
            accountAvatars: this.generatedElements.accountAvatars.length,
            selfMessages,
            otherMessages,
            selfMessagePercentage: ((selfMessages / this.generatedElements.messageBubbles.length) * 100).toFixed(1),
            otherMessagePercentage: ((otherMessages / this.generatedElements.messageBubbles.length) * 100).toFixed(1)
        };
    }

    /**
     * Clear all generated data
     */
    clearGeneratedData() {
        this.generatedElements = {
            sessionAvatars: [],
            messageBubbles: [],
            accountAvatars: []
        };
        this.elementCounter = 0;
    }

    /**
     * Export data to JSON for external use
     */
    exportData() {
        return {
            timestamp: new Date().toISOString(),
            generator: 'TestDataGenerator v1.0',
            data: this.generatedElements,
            statistics: this.getStatistics()
        };
    }

    /**
     * Import data from JSON
     */
    importData(jsonData) {
        if (jsonData.data) {
            this.generatedElements = jsonData.data;
            this.elementCounter = this.generatedElements.messageBubbles.length;
            console.log('Data imported successfully:', this.getStatistics());
        }
    }
}

// Performance testing utilities
class PerformanceTestRunner {
    constructor(generator) {
        this.generator = generator;
        this.testResults = [];
    }

    /**
     * Run performance test with different element counts
     */
    async runPerformanceTests(counts = [100, 500, 1000, 2000]) {
        console.log('Starting performance tests...');
        
        for (const count of counts) {
            console.log(`\n--- Testing with ${count} elements ---`);
            
            const startTime = performance.now();
            const data = this.generator.generateTestData(count);
            const generateTime = performance.now() - startTime;
            
            // Test DOM creation time
            const domStartTime = performance.now();
            const container = this.createTestContainer();
            this.renderElements(container, data, count);
            const domTime = performance.now() - domStartTime;
            
            // Cleanup
            container.remove();
            
            const result = {
                elementCount: count,
                generateTime: generateTime.toFixed(2),
                domRenderTime: domTime.toFixed(2),
                totalTime: (generateTime + domTime).toFixed(2),
                memoryUsed: this.getMemoryUsage()
            };
            
            this.testResults.push(result);
            console.log('Test result:', result);
        }
        
        return this.testResults;
    }

    createTestContainer() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        return container;
    }

    renderElements(container, data, count) {
        // Create session avatars
        data.sessionAvatars.slice(0, count).forEach(avatar => {
            const element = document.createElement('div');
            element.className = 'session-avatar';
            element.style.anchorName = `--${avatar.anchorName}`;
            element.style.backgroundColor = avatar.color;
            container.appendChild(element);
        });

        // Create message bubbles
        data.messageBubbles.slice(0, count).forEach(bubble => {
            const element = document.createElement('div');
            element.className = `message-bubble ${bubble.type}`;
            element.style.anchorName = `--${bubble.anchorName}`;
            element.textContent = bubble.content;
            container.appendChild(element);
        });

        // Create account avatars
        data.accountAvatars.slice(0, count).forEach(avatar => {
            const element = document.createElement('div');
            element.className = 'account-avatar';
            element.style.anchorName = `--${avatar.anchorName}`;
            element.style.backgroundColor = avatar.color;
            container.appendChild(element);
        });
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestDataGenerator, PerformanceTestRunner };
}

// Global access for browser environment
if (typeof window !== 'undefined') {
    window.TestDataGenerator = TestDataGenerator;
    window.PerformanceTestRunner = PerformanceTestRunner;
}