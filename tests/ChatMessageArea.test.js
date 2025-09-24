/**
 * ChatMessageArea.test.js
 * Comprehensive test suite for ChatMessageArea component
 */

import ChatMessageArea from '../src/components/ChatMessageArea.js';

describe('ChatMessageArea', () => {
    let chatArea;
    let mockCanvas;

    beforeEach(() => {
        // Mock PIXI Application and related objects
        global.PIXI = {
            Application: jest.fn(() => ({
                stage: { addChild: jest.fn() },
                view: document.createElement('canvas'),
                ticker: { add: jest.fn() },
                renderer: { resize: jest.fn() },
                destroy: jest.fn()
            })),
            Container: jest.fn(() => ({
                addChild: jest.fn(),
                removeChild: jest.fn(),
                eventMode: '',
                cursor: '',
                on: jest.fn(),
                x: 0,
                y: 0,
                mask: null
            })),
            Graphics: jest.fn(() => ({
                beginFill: jest.fn().mockReturnThis(),
                endFill: jest.fn().mockReturnThis(),
                drawRect: jest.fn().mockReturnThis(),
                drawRoundedRect: jest.fn().mockReturnThis(),
                drawCircle: jest.fn().mockReturnThis(),
                drawPolygon: jest.fn().mockReturnThis(),
                lineStyle: jest.fn().mockReturnThis(),
                moveTo: jest.fn().mockReturnThis(),
                lineTo: jest.fn().mockReturnThis(),
                clear: jest.fn().mockReturnThis()
            })),
            Text: jest.fn(() => ({
                anchor: { set: jest.fn() },
                x: 0,
                y: 0
            })),
            TextStyle: jest.fn()
        };

        // Mock DOM methods
        global.document = {
            createElement: jest.fn(() => ({
                getContext: jest.fn(),
                addEventListener: jest.fn()
            }))
        };

        global.window = {
            devicePixelRatio: 1
        };

        chatArea = new ChatMessageArea(400, 600);
    });

    afterEach(() => {
        if (chatArea) {
            chatArea.destroy();
        }
    });

    describe('Initialization', () => {
        test('should initialize with correct dimensions', () => {
            expect(chatArea.width).toBe(400);
            expect(chatArea.height).toBe(600);
        });

        test('should initialize virtual scroll properties', () => {
            expect(chatArea.virtualScroll).toEqual({
                itemHeight: 80,
                buffer: 5,
                visibleStart: 0,
                visibleEnd: 0,
                scrollY: 0,
                totalHeight: 0
            });
        });

        test('should initialize empty message arrays', () => {
            expect(chatArea.messages).toEqual([]);
            expect(chatArea.renderedMessages).toBeInstanceOf(Map);
            expect(chatArea.selectedMessages).toBeInstanceOf(Set);
        });

        test('should start in normal mode', () => {
            expect(chatArea.multiSelectMode).toBe(false);
        });
    });

    describe('Message Management', () => {
        test('should add text message correctly', () => {
            const message = {
                type: 'text',
                content: 'Hello world',
                sender: 'self',
                bubbleType: 'simple'
            };

            chatArea.addMessage(message);

            expect(chatArea.messages).toHaveLength(1);
            expect(chatArea.messages[0]).toMatchObject(message);
            expect(chatArea.messages[0]).toHaveProperty('id');
            expect(chatArea.messages[0]).toHaveProperty('timestamp');
        });

        test('should add system message correctly', () => {
            const message = {
                type: 'system',
                content: 'User joined the chat'
            };

            chatArea.addMessage(message);

            expect(chatArea.messages).toHaveLength(1);
            expect(chatArea.messages[0].type).toBe('system');
        });

        test('should add image message correctly', () => {
            const message = {
                type: 'image',
                content: 'shared an image',
                sender: 'other',
                senderName: 'Alice',
                bubbleType: 'detailed'
            };

            chatArea.addMessage(message);

            expect(chatArea.messages).toHaveLength(1);
            expect(chatArea.messages[0].type).toBe('image');
            expect(chatArea.messages[0].senderName).toBe('Alice');
        });

        test('should add voice message with duration', () => {
            const message = {
                type: 'voice',
                content: 'voice message',
                sender: 'self',
                bubbleType: 'simple',
                duration: '0:30'
            };

            chatArea.addMessage(message);

            expect(chatArea.messages[0].duration).toBe('0:30');
        });

        test('should add video message correctly', () => {
            const message = {
                type: 'video',
                content: 'shared a video',
                sender: 'other',
                senderName: 'Bob',
                bubbleType: 'detailed'
            };

            chatArea.addMessage(message);

            expect(chatArea.messages[0].type).toBe('video');
        });

        test('should add link message with metadata', () => {
            const message = {
                type: 'link',
                content: 'Check this out',
                sender: 'self',
                bubbleType: 'simple',
                title: 'Amazing Link',
                url: 'https://example.com',
                description: 'This is an amazing website'
            };

            chatArea.addMessage(message);

            expect(chatArea.messages[0].title).toBe('Amazing Link');
            expect(chatArea.messages[0].url).toBe('https://example.com');
        });
    });

    describe('Virtual Scrolling', () => {
        beforeEach(() => {
            // Add multiple messages for scrolling tests
            for (let i = 0; i < 20; i++) {
                chatArea.addMessage({
                    type: 'text',
                    content: `Message ${i}`,
                    sender: i % 2 === 0 ? 'self' : 'other',
                    senderName: 'TestUser',
                    bubbleType: 'simple'
                });
            }
        });

        test('should calculate total height correctly', () => {
            expect(chatArea.virtualScroll.totalHeight).toBe(20 * 80);
        });

        test('should update visible range on scroll', () => {
            chatArea.scroll(400); // Scroll down
            chatArea.updateVirtualScroll();

            expect(chatArea.virtualScroll.visibleStart).toBeGreaterThan(0);
            expect(chatArea.virtualScroll.visibleEnd).toBeLessThan(20);
        });

        test('should limit scroll to bounds', () => {
            chatArea.scroll(-1000); // Try to scroll beyond top
            expect(chatArea.virtualScroll.scrollY).toBe(0);

            chatArea.scroll(10000); // Try to scroll beyond bottom
            expect(chatArea.virtualScroll.scrollY).toBeLessThanOrEqual(
                chatArea.virtualScroll.totalHeight - chatArea.height
            );
        });

        test('should scroll to bottom for new messages', () => {
            chatArea.scrollToBottom();
            expect(chatArea.virtualScroll.scrollY).toBe(
                Math.max(0, chatArea.virtualScroll.totalHeight - chatArea.height)
            );
        });
    });

    describe('Multi-Select Mode', () => {
        beforeEach(() => {
            chatArea.addMessage({
                type: 'text',
                content: 'Test message 1',
                sender: 'self',
                bubbleType: 'simple'
            });
            chatArea.addMessage({
                type: 'text',
                content: 'Test message 2',
                sender: 'other',
                senderName: 'Alice',
                bubbleType: 'detailed'
            });
        });

        test('should enter multi-select mode', () => {
            chatArea.enterMultiSelectMode();

            expect(chatArea.multiSelectMode).toBe(true);
            expect(chatArea.selectedMessages.size).toBe(0);
        });

        test('should exit multi-select mode', () => {
            chatArea.enterMultiSelectMode();
            chatArea.exitMultiSelectMode();

            expect(chatArea.multiSelectMode).toBe(false);
            expect(chatArea.selectedMessages.size).toBe(0);
        });

        test('should toggle message selection', () => {
            const message = chatArea.messages[0];
            
            chatArea.enterMultiSelectMode();
            chatArea.toggleMessageSelection(message);

            expect(chatArea.selectedMessages.has(message.id)).toBe(true);

            chatArea.toggleMessageSelection(message);
            expect(chatArea.selectedMessages.has(message.id)).toBe(false);
        });

        test('should delete selected messages', () => {
            const message1 = chatArea.messages[0];
            const message2 = chatArea.messages[1];

            chatArea.enterMultiSelectMode();
            chatArea.toggleMessageSelection(message1);
            chatArea.toggleMessageSelection(message2);

            const initialCount = chatArea.messages.length;
            chatArea.deleteSelectedMessages();

            expect(chatArea.messages.length).toBe(initialCount - 2);
            expect(chatArea.multiSelectMode).toBe(false);
        });
    });

    describe('Message Actions', () => {
        let testMessage;

        beforeEach(() => {
            testMessage = {
                type: 'text',
                content: 'Test message for actions',
                sender: 'other',
                senderName: 'TestUser',
                bubbleType: 'detailed'
            };
            chatArea.addMessage(testMessage);
        });

        test('should execute copy action', () => {
            const mockMessageView = {
                messageData: chatArea.messages[0],
                messageIndex: 0
            };
            
            chatArea.currentSelectedMessage = mockMessageView;
            
            // Mock console.log to verify action execution
            const consoleSpy = jest.spyOn(console, 'log');
            chatArea.executeMessageAction('copy');
            
            expect(consoleSpy).toHaveBeenCalledWith('Copying message');
            consoleSpy.mockRestore();
        });

        test('should execute delete action', () => {
            const mockMessageView = {
                messageData: chatArea.messages[0],
                messageIndex: 0
            };
            
            chatArea.currentSelectedMessage = mockMessageView;
            
            const initialCount = chatArea.messages.length;
            chatArea.executeMessageAction('delete');
            
            expect(chatArea.messages.length).toBe(initialCount - 1);
        });

        test('should enter multi-select mode from action', () => {
            chatArea.executeMessageAction('multiSelect');
            expect(chatArea.multiSelectMode).toBe(true);
        });
    });

    describe('Message Bubble Creation', () => {
        test('should create bubble for own message', () => {
            const message = {
                type: 'text',
                content: 'My message',
                sender: 'self',
                bubbleType: 'simple'
            };

            const messageView = chatArea.createMessageView(message, 0);
            expect(messageView).toBeDefined();
            expect(messageView.messageData).toBe(message);
        });

        test('should create bubble for other message with sender name', () => {
            const message = {
                type: 'text',
                content: 'Other message',
                sender: 'other',
                senderName: 'Alice',
                bubbleType: 'detailed'
            };

            const messageView = chatArea.createMessageView(message, 0);
            expect(messageView).toBeDefined();
            expect(messageView.messageData.senderName).toBe('Alice');
        });

        test('should create system message without bubble', () => {
            const message = {
                type: 'system',
                content: 'System notification'
            };

            const messageView = chatArea.createMessageView(message, 0);
            expect(messageView).toBeDefined();
        });
    });

    describe('Interaction Handling', () => {
        test('should handle pointer down event', () => {
            const mockEvent = {
                global: { y: 100 }
            };

            chatArea.onPointerDown(mockEvent);

            expect(chatArea.isDragging).toBe(true);
            expect(chatArea.dragStartY).toBe(100);
        });

        test('should handle pointer up event', () => {
            chatArea.isDragging = true;
            chatArea.onPointerUp();

            expect(chatArea.isDragging).toBe(false);
        });

        test('should handle pointer move during drag', () => {
            const initialScrollY = chatArea.virtualScroll.scrollY;
            
            chatArea.isDragging = true;
            chatArea.dragStartY = 100;

            const mockEvent = {
                global: { y: 150 }
            };

            chatArea.onPointerMove(mockEvent);

            // Scroll position should change due to drag
            expect(chatArea.virtualScroll.scrollY).not.toBe(initialScrollY);
        });
    });

    describe('Resize Handling', () => {
        test('should resize correctly', () => {
            const newWidth = 500;
            const newHeight = 700;

            chatArea.resize(newWidth, newHeight);

            expect(chatArea.width).toBe(newWidth);
            expect(chatArea.height).toBe(newHeight);
        });

        test('should update virtual scroll on resize', () => {
            // Add messages first
            for (let i = 0; i < 10; i++) {
                chatArea.addMessage({
                    type: 'text',
                    content: `Message ${i}`,
                    sender: 'self',
                    bubbleType: 'simple'
                });
            }

            const spy = jest.spyOn(chatArea, 'updateVirtualScroll');
            chatArea.resize(500, 700);

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe('Performance Optimizations', () => {
        test('should only render visible messages', () => {
            // Add many messages
            for (let i = 0; i < 100; i++) {
                chatArea.addMessage({
                    type: 'text',
                    content: `Message ${i}`,
                    sender: i % 2 === 0 ? 'self' : 'other',
                    senderName: 'TestUser',
                    bubbleType: 'simple'
                });
            }

            chatArea.updateVirtualScroll();

            // Should only render visible messages plus buffer
            const expectedMaxRendered = Math.ceil(chatArea.height / chatArea.virtualScroll.itemHeight) + 
                (chatArea.virtualScroll.buffer * 2);
            
            expect(chatArea.renderedMessages.size).toBeLessThanOrEqual(expectedMaxRendered);
        });

        test('should apply momentum scrolling', () => {
            chatArea.velocity = 5;
            const initialScrollY = chatArea.virtualScroll.scrollY;
            
            chatArea.update(1); // Simulate one frame
            
            expect(chatArea.virtualScroll.scrollY).not.toBe(initialScrollY);
            expect(Math.abs(chatArea.velocity)).toBeLessThan(5); // Friction applied
        });
    });

    describe('Memory Management', () => {
        test('should clean up rendered messages outside visible range', () => {
            // Add messages and scroll
            for (let i = 0; i < 50; i++) {
                chatArea.addMessage({
                    type: 'text',
                    content: `Message ${i}`,
                    sender: 'self',
                    bubbleType: 'simple'
                });
            }

            // Scroll to middle
            chatArea.scroll(1000);
            chatArea.updateVirtualScroll();

            const firstRenderCount = chatArea.renderedMessages.size;

            // Scroll further
            chatArea.scroll(1000);
            chatArea.updateVirtualScroll();

            // Should have cleaned up some messages
            expect(chatArea.renderedMessages.size).toBeLessThanOrEqual(firstRenderCount + 10);
        });

        test('should destroy properly', () => {
            const destroySpy = jest.spyOn(chatArea.app, 'destroy');
            
            chatArea.destroy();
            
            expect(destroySpy).toHaveBeenCalledWith(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty message content', () => {
            const message = {
                type: 'text',
                content: '',
                sender: 'self',
                bubbleType: 'simple'
            };

            expect(() => {
                chatArea.addMessage(message);
            }).not.toThrow();
        });

        test('should handle unknown message type', () => {
            const message = {
                type: 'unknown',
                content: 'Unknown message',
                sender: 'self',
                bubbleType: 'simple'
            };

            expect(() => {
                chatArea.addMessage(message);
            }).not.toThrow();
        });

        test('should handle message without sender name', () => {
            const message = {
                type: 'text',
                content: 'Message without sender',
                sender: 'other',
                bubbleType: 'detailed'
                // Missing senderName
            };

            expect(() => {
                chatArea.addMessage(message);
            }).not.toThrow();
        });

        test('should handle scroll beyond bounds gracefully', () => {
            chatArea.scroll(-999999);
            expect(chatArea.virtualScroll.scrollY).toBe(0);

            chatArea.scroll(999999);
            expect(chatArea.virtualScroll.scrollY).toBeLessThanOrEqual(
                Math.max(0, chatArea.virtualScroll.totalHeight - chatArea.height)
            );
        });
    });
});

// Performance benchmarks
describe('ChatMessageArea Performance', () => {
    let chatArea;

    beforeEach(() => {
        chatArea = new ChatMessageArea(400, 600);
    });

    afterEach(() => {
        chatArea.destroy();
    });

    test('should handle large number of messages efficiently', () => {
        const startTime = performance.now();
        
        // Add 1000 messages
        for (let i = 0; i < 1000; i++) {
            chatArea.addMessage({
                type: 'text',
                content: `Performance test message ${i}`,
                sender: i % 2 === 0 ? 'self' : 'other',
                senderName: `User${i % 10}`,
                bubbleType: i % 3 === 0 ? 'detailed' : 'simple'
            });
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`Added 1000 messages in ${duration.toFixed(2)}ms`);
        expect(duration).toBeLessThan(1000); // Should complete in under 1 second
        expect(chatArea.messages.length).toBe(1000);
    });

    test('should scroll smoothly with many messages', () => {
        // Add many messages
        for (let i = 0; i < 500; i++) {
            chatArea.addMessage({
                type: 'text',
                content: `Scroll test message ${i}`,
                sender: 'self',
                bubbleType: 'simple'
            });
        }

        const startTime = performance.now();
        
        // Perform multiple scroll operations
        for (let i = 0; i < 100; i++) {
            chatArea.scroll(50);
            chatArea.updateVirtualScroll();
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`100 scroll operations completed in ${duration.toFixed(2)}ms`);
        expect(duration).toBeLessThan(500); // Should be smooth
    });
});