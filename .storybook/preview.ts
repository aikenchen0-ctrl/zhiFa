import type { Preview } from '@storybook/react'
import '../src/index.css'
import '../src/styles/design-system/main.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    
    docs: {
      toc: true,
      source: {
        state: 'open'
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
        },
        {
          name: 'light',
          value: '#ffffff'
        },
        {
          name: 'ocean',
          value: 'linear-gradient(135deg, #667db6 0%, #0082c8 25%, #0082c8 75%, #667db6 100%)'
        },
        {
          name: 'sunset',
          value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)'
        }
      ]
    },
    
    viewport: {
      viewports: {
        mobile1: {
          name: 'iPhone SE',
          styles: {
            width: '375px',
            height: '667px'
          }
        },
        mobile2: {
          name: 'iPhone 12 Pro',
          styles: {
            width: '390px',
            height: '844px'
          }
        },
        mobile3: {
          name: 'iPhone 12 Pro Max',
          styles: {
            width: '428px',
            height: '926px'
          }
        },
        tablet1: {
          name: 'iPad',
          styles: {
            width: '768px',
            height: '1024px'
          }
        },
        tablet2: {
          name: 'iPad Pro 11"',
          styles: {
            width: '834px',
            height: '1194px'
          }
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px'
          }
        }
      },
      defaultViewport: 'mobile2'
    },
    
    layout: 'fullscreen',
    
    options: {
      storySort: {
        order: [
          'Introduction',
          'Design System',
          ['Colors', 'Typography', 'Spacing', 'Components'],
          'Components',
          [
            'Basic',
            ['MessageBubble', 'Avatar', 'Button', 'Input'],
            'Layout', 
            ['OverlayContainer', 'TopBar', 'BottomBar'],
            'Interactive',
            ['GestureHandler', 'ActionMenu'],
            'Advanced',
            ['ConnectionLine', 'WebGL']
          ],
          'Examples',
          'Documentation'
        ]
      }
    }
  },
  
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'liquid-glass',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'liquid-glass', title: 'Liquid Glass' },
          { value: 'dark', title: 'Dark Theme' },
          { value: 'light', title: 'Light Theme' },
          { value: 'ocean', title: 'Ocean Breeze' },
          { value: 'sunset', title: 'Sunset Glow' }
        ],
        showName: true,
        dynamicTitle: true
      }
    },
    
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'zh', title: '中文' },
          { value: 'ja', title: '日本語' },
          { value: 'ko', title: '한국어' }
        ]
      }
    },
    
    density: {
      name: 'Density',
      description: 'Component density',
      defaultValue: 'comfortable',
      toolbar: {
        icon: 'component',
        items: [
          { value: 'compact', title: 'Compact' },
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'spacious', title: 'Spacious' }
        ]
      }
    },
    
    motion: {
      name: 'Motion',
      description: 'Animation preferences',
      defaultValue: 'full',
      toolbar: {
        icon: 'play',
        items: [
          { value: 'full', title: 'Full Motion' },
          { value: 'reduced', title: 'Reduced Motion' },
          { value: 'none', title: 'No Motion' }
        ]
      }
    }
  },
  
  decorators: [
    (Story, context) => {
      const { theme, density, motion } = context.globals
      
      // 应用主题类
      const themeClass = `theme-${theme}`
      const densityClass = `density-${density}`
      const motionClass = `motion-${motion}`
      
      return (
        <div 
          className={`storybook-decorator ${themeClass} ${densityClass} ${motionClass}`}
          style={{
            minHeight: '100vh',
            padding: '20px',
            background: context.parameters.backgrounds?.default === 'liquid-glass' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : undefined
          }}
        >
          <Story />
        </div>
      )
    }
  ],
  
  // 标签系统
  tags: ['autodocs']
}

export default preview