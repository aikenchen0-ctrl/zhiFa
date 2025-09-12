import type { Meta, StoryObj } from '@storybook/react'
import { MessageBubble } from './MessageBubble'
import { OverlayContainer } from '../layout/OverlayContainer'
import { within, userEvent, expect } from '@storybook/test'

// Mock data
const mockUser = {
  id: 'user1',
  name: 'Alice Johnson',
  avatar: 'https://images.unsplash.com/photo-1494790108755-2616b772e234?w=100&h=100&fit=crop&crop=face'
}

const mockMessage = {
  id: 'msg1',
  content: 'Hello! This is a sample message with some content to demonstrate the message bubble component.',
  timestamp: new Date('2024-01-15T10:30:00Z'),
  userId: 'user1',
  type: 'text' as const
}

const longMessage = {
  ...mockMessage,
  id: 'msg2',
  content: 'This is a much longer message that demonstrates how the message bubble handles longer text content. It should wrap nicely and maintain good readability across different screen sizes. The bubble should expand to accommodate the content while maintaining the maximum width constraints.'
}

const meta: Meta<typeof MessageBubble> = {
  title: 'Components/Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# MessageBubble Component

The MessageBubble component displays individual chat messages with a beautiful liquid glass effect. It supports various message types, animations, and interactive features.

## Features
- 🎨 Liquid glass UI with backdrop blur effects
- 📱 Mobile-optimized touch interactions  
- 🎬 Smooth entrance and interaction animations
- 👆 Long press, swipe, and gesture support
- 🔄 Message status indicators
- 👤 User avatar integration
- ⏰ Timestamp display
- 📏 Responsive design

## Usage
Perfect for chat applications, messaging systems, comment threads, and any interface requiring conversational message display.
        `
      }
    },
    backgrounds: {
      default: 'liquid-glass',
      values: [
        {
          name: 'liquid-glass',
          value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
          name: 'dark',
          value: '#1a1a1a'
        }
      ]
    }
  },
  argTypes: {
    message: {
      description: 'Message data object containing content, timestamp, etc.',
      control: { type: 'object' }
    },
    user: {
      description: 'User information including name and avatar',
      control: { type: 'object' }
    },
    position: {
      description: 'Message alignment - left for received, right for sent',
      control: { 
        type: 'select',
        options: ['left', 'right']
      }
    },
    theme: {
      description: 'Visual theme variant',
      control: {
        type: 'select',
        options: ['liquid-glass', 'dark', 'light', 'ocean', 'sunset']
      }
    },
    showAvatar: {
      description: 'Show user avatar',
      control: { type: 'boolean' }
    },
    showTimestamp: {
      description: 'Show message timestamp',
      control: { type: 'boolean' }
    },
    showStatus: {
      description: 'Show message delivery status',
      control: { type: 'boolean' }
    },
    enableAnimations: {
      description: 'Enable entrance and interaction animations',
      control: { type: 'boolean' }
    },
    enableActions: {
      description: 'Enable message actions (reply, forward, etc.)',
      control: { type: 'boolean' }
    },
    maxWidth: {
      description: 'Maximum width of the message bubble',
      control: { type: 'range', min: 200, max: 500, step: 10 }
    }
  },
  decorators: [
    (Story) => (
      <OverlayContainer
        theme="liquid-glass"
        enableAnimations={true}
        mobileOptimized={true}
        style={{ 
          minHeight: '400px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <Story />
        </div>
      </OverlayContainer>
    )
  ]
}

export default meta
type Story = StoryObj<typeof MessageBubble>

// Basic Stories
export const Default: Story = {
  args: {
    message: mockMessage,
    user: mockUser,
    position: 'right',
    theme: 'liquid-glass',
    showAvatar: true,
    showTimestamp: true,
    showStatus: true,
    enableAnimations: true,
    enableActions: true,
    maxWidth: 320
  }
}

export const ReceivedMessage: Story = {
  args: {
    ...Default.args,
    position: 'left'
  },
  parameters: {
    docs: {
      description: {
        story: 'Message bubble positioned on the left side for received messages.'
      }
    }
  }
}

export const SentMessage: Story = {
  args: {
    ...Default.args,
    position: 'right'
  },
  parameters: {
    docs: {
      description: {
        story: 'Message bubble positioned on the right side for sent messages.'
      }
    }
  }
}

export const LongMessage: Story = {
  args: {
    ...Default.args,
    message: longMessage
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates how the component handles longer text content with proper wrapping.'
      }
    }
  }
}

export const WithoutAvatar: Story = {
  args: {
    ...Default.args,
    showAvatar: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Message bubble without user avatar - useful for grouped messages.'
      }
    }
  }
}

export const WithoutTimestamp: Story = {
  args: {
    ...Default.args,
    showTimestamp: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Message bubble without timestamp display for cleaner look.'
      }
    }
  }
}

export const MinimalDesign: Story = {
  args: {
    ...Default.args,
    showAvatar: false,
    showTimestamp: false,
    showStatus: false,
    enableActions: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal message bubble design with just the essential content.'
      }
    }
  }
}

// Theme Variants
export const DarkTheme: Story = {
  args: {
    ...Default.args,
    theme: 'dark'
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Message bubble with dark theme variant.'
      }
    }
  }
}

export const LightTheme: Story = {
  args: {
    ...Default.args,
    theme: 'light'
  },
  parameters: {
    backgrounds: { default: 'light' },
    docs: {
      description: {
        story: 'Message bubble with light theme variant.'
      }
    }
  }
}

export const OceanTheme: Story = {
  args: {
    ...Default.args,
    theme: 'ocean'
  },
  parameters: {
    backgrounds: {
      default: 'ocean',
      values: [{
        name: 'ocean',
        value: 'linear-gradient(135deg, #667db6 0%, #0082c8 100%)'
      }]
    },
    docs: {
      description: {
        story: 'Message bubble with ocean blue theme variant.'
      }
    }
  }
}

// Interactive Stories
export const WithInteractions: Story = {
  args: {
    ...Default.args,
    onPress: (message) => console.log('Pressed message:', message),
    onLongPress: (message) => console.log('Long pressed message:', message),
    onSwipeLeft: (message) => console.log('Swiped left:', message),
    onSwipeRight: (message) => console.log('Swiped right:', message),
    onReply: (message) => console.log('Reply to:', message),
    onForward: (message) => console.log('Forward:', message),
    onDelete: (message) => console.log('Delete:', message)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const messageBubble = canvas.getByRole('article')
    
    // Test click interaction
    await userEvent.click(messageBubble)
    await expect(messageBubble).toBeVisible()
  },
  parameters: {
    docs: {
      description: {
        story: `
Interactive message bubble with all event handlers. Try:
- Click to select
- Long press for context menu
- Swipe left/right for actions
- Check console for event logs
        `
      }
    }
  }
}

// Message Types
export const TextMessage: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      type: 'text'
    }
  }
}

export const ImageMessage: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      type: 'image',
      content: '',
      imageData: {
        url: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=400&h=300&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=200&h=150&fit=crop',
        width: 400,
        height: 300,
        alt: 'Beautiful landscape'
      }
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Message bubble displaying an image with thumbnail and full-size preview.'
      }
    }
  }
}

export const VoiceMessage: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      type: 'voice',
      content: '',
      voiceData: {
        url: '/audio/sample-voice.mp3',
        duration: 15,
        waveform: [0.2, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.2, 0.5]
      }
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Voice message bubble with waveform visualization and playback controls.'
      }
    }
  }
}

export const FileMessage: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      type: 'file',
      content: '',
      fileData: {
        url: '/files/document.pdf',
        name: 'Project Specification.pdf',
        size: 2048576, // 2MB
        type: 'application/pdf',
        icon: '📄'
      }
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'File attachment message with download preview and file information.'
      }
    }
  }
}

// Animation States
export const EntranceAnimation: Story = {
  args: {
    ...Default.args,
    enableAnimations: true
  },
  play: async ({ canvasElement }) => {
    // Animation will automatically play on mount
    const canvas = within(canvasElement)
    const messageBubble = canvas.getByRole('article')
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 500))
    await expect(messageBubble).toBeVisible()
  },
  parameters: {
    docs: {
      description: {
        story: 'Message bubble with entrance animation enabled.'
      }
    }
  }
}

export const HoverEffects: Story = {
  args: {
    ...Default.args
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const messageBubble = canvas.getByRole('article')
    
    // Test hover effect
    await userEvent.hover(messageBubble)
    await new Promise(resolve => setTimeout(resolve, 300))
  },
  parameters: {
    docs: {
      description: {
        story: 'Message bubble showing hover effects and transitions.'
      }
    }
  }
}

// Status Indicators
export const SendingStatus: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      status: 'sending'
    },
    showStatus: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Message with sending status indicator.'
      }
    }
  }
}

export const DeliveredStatus: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      status: 'delivered'
    },
    showStatus: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Message with delivered status indicator.'
      }
    }
  }
}

export const ReadStatus: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      status: 'read'
    },
    showStatus: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Message with read status indicator.'
      }
    }
  }
}

export const FailedStatus: Story = {
  args: {
    ...Default.args,
    message: {
      ...mockMessage,
      status: 'failed'
    },
    showStatus: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Message with failed delivery status.'
      }
    }
  }
}

// Responsive Design
export const MobileView: Story = {
  args: {
    ...Default.args,
    maxWidth: 280
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Message bubble optimized for mobile viewport.'
      }
    }
  }
}

export const TabletView: Story = {
  args: {
    ...Default.args,
    maxWidth: 400
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet1'
    },
    docs: {
      description: {
        story: 'Message bubble optimized for tablet viewport.'
      }
    }
  }
}

// Group Display
export const MessageGroup: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <MessageBubble
        {...args}
        message={{
          id: 'msg1',
          content: 'Hey, how are you doing?',
          timestamp: new Date('2024-01-15T10:28:00Z'),
          userId: 'user2',
          type: 'text'
        }}
        position="left"
        showAvatar={true}
        showTimestamp={false}
      />
      <MessageBubble
        {...args}
        message={{
          id: 'msg2',
          content: 'I wanted to check in and see if you needed any help with the project.',
          timestamp: new Date('2024-01-15T10:28:30Z'),
          userId: 'user2',
          type: 'text'
        }}
        position="left"
        showAvatar={false}
        showTimestamp={true}
      />
      <MessageBubble
        {...args}
        message={{
          id: 'msg3',
          content: 'Thanks for asking! I\'m doing well.',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          userId: 'user1',
          type: 'text'
        }}
        position="right"
        showAvatar={false}
        showTimestamp={true}
      />
    </div>
  ),
  args: {
    ...Default.args
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple message bubbles showing a conversation flow with grouped messages.'
      }
    }
  }
}

// Accessibility
export const AccessibilityFocused: Story = {
  args: {
    ...Default.args,
    'aria-label': 'Message from Alice Johnson sent at 10:30 AM',
    tabIndex: 0
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const messageBubble = canvas.getByRole('article')
    
    // Test keyboard navigation
    await userEvent.tab()
    await expect(messageBubble).toHaveFocus()
    
    // Test keyboard activation
    await userEvent.keyboard('{Enter}')
  },
  parameters: {
    docs: {
      description: {
        story: `
Message bubble with enhanced accessibility features:
- Proper ARIA labels
- Keyboard navigation support  
- Screen reader optimization
- Focus management
        `
      }
    }
  }
}

// Performance Test
export const PerformanceTest: Story = {
  render: (args) => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '4px',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      {Array.from({ length: 50 }, (_, i) => (
        <MessageBubble
          key={i}
          {...args}
          message={{
            id: `msg-${i}`,
            content: `Message ${i + 1}: This is a performance test with many message bubbles.`,
            timestamp: new Date(Date.now() - i * 60000),
            userId: i % 2 === 0 ? 'user1' : 'user2',
            type: 'text'
          }}
          position={i % 2 === 0 ? 'right' : 'left'}
          showAvatar={i % 5 === 0} // Show avatar every 5th message
          showTimestamp={i % 3 === 0} // Show timestamp every 3rd message
        />
      ))}
    </div>
  ),
  args: {
    ...Default.args,
    enableAnimations: false // Disable animations for performance
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 50 message bubbles to test rendering efficiency.'
      }
    }
  }
}