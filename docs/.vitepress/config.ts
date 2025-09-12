import { defineConfig } from 'vitepress'
import { generateSidebar } from './utils/sidebar'

export default defineConfig({
  title: 'Mobile IM Floating Components',
  description: 'Advanced mobile IM floating components with WebGL rendering and Liquid Glass UI',
  
  head: [
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0, user-scalable=no' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Components', link: '/components/' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'Mobile', link: '/mobile/' },
      { text: 'WebGL', link: '/webgl/' },
      { text: 'Themes', link: '/themes/' },
      { text: 'Playground', link: '/playground/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Basic Usage', link: '/guide/basic-usage' }
          ]
        },
        {
          text: 'Development Guide',
          items: [
            { text: 'Development Setup', link: '/guide/dev-setup' },
            { text: 'Best Practices', link: '/guide/best-practices' },
            { text: 'Performance Tips', link: '/guide/performance' },
            { text: 'Testing Strategy', link: '/guide/testing' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'Core APIs',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Types & Interfaces', link: '/api/types' },
            { text: 'Store APIs', link: '/api/stores' },
            { text: 'Service APIs', link: '/api/services' }
          ]
        },
        {
          text: 'Component APIs',
          items: [
            { text: 'MessageBubble API', link: '/api/components/message-bubble' },
            { text: 'OverlayContainer API', link: '/api/components/overlay-container' },
            { text: 'ConnectionLine API', link: '/api/components/connection-line' },
            { text: 'GestureHandler API', link: '/api/components/gesture-handler' }
          ]
        }
      ],
      '/components/': [
        {
          text: 'UI Components',
          items: [
            { text: 'Overview', link: '/components/' },
            { text: 'Message Bubble', link: '/components/message-bubble' },
            { text: 'Avatar', link: '/components/avatar' },
            { text: 'Connection Line', link: '/components/connection-line' }
          ]
        },
        {
          text: 'Layout Components',
          items: [
            { text: 'Overlay Container', link: '/components/overlay-container' },
            { text: 'Top Bar', link: '/components/top-bar' },
            { text: 'Bottom Bar', link: '/components/bottom-bar' },
            { text: 'Sidebars', link: '/components/sidebars' }
          ]
        },
        {
          text: 'Interactive Components',
          items: [
            { text: 'Gesture Handler', link: '/components/gesture-handler' },
            { text: 'Action Menu', link: '/components/action-menu' },
            { text: 'Multi-Select Mode', link: '/components/multi-select' }
          ]
        }
      ],
      '/architecture/': [
        {
          text: 'System Architecture',
          items: [
            { text: 'Overview', link: '/architecture/' },
            { text: 'Component Hierarchy', link: '/architecture/component-hierarchy' },
            { text: 'Data Flow', link: '/architecture/data-flow' },
            { text: 'State Management', link: '/architecture/state-management' }
          ]
        },
        {
          text: 'Core Systems',
          items: [
            { text: 'Rendering Pipeline', link: '/architecture/rendering-pipeline' },
            { text: 'Performance System', link: '/architecture/performance-system' },
            { text: 'Memory Management', link: '/architecture/memory-management' },
            { text: 'Event System', link: '/architecture/event-system' }
          ]
        }
      ],
      '/mobile/': [
        {
          text: 'Mobile Adaptation',
          items: [
            { text: 'Overview', link: '/mobile/' },
            { text: 'Touch Interactions', link: '/mobile/touch-interactions' },
            { text: 'Gesture Recognition', link: '/mobile/gesture-recognition' },
            { text: 'Responsive Design', link: '/mobile/responsive-design' }
          ]
        },
        {
          text: 'Performance',
          items: [
            { text: 'Mobile Optimization', link: '/mobile/optimization' },
            { text: 'Memory Management', link: '/mobile/memory-management' },
            { text: 'Battery Efficiency', link: '/mobile/battery-efficiency' }
          ]
        }
      ],
      '/webgl/': [
        {
          text: 'WebGL Rendering',
          items: [
            { text: 'Overview', link: '/webgl/' },
            { text: 'Connection System', link: '/webgl/connection-system' },
            { text: 'Performance Optimization', link: '/webgl/performance' },
            { text: 'Shader System', link: '/webgl/shaders' }
          ]
        },
        {
          text: 'Advanced Features',
          items: [
            { text: 'Collision Detection', link: '/webgl/collision-detection' },
            { text: 'Animation System', link: '/webgl/animation-system' },
            { text: 'Occlusion Management', link: '/webgl/occlusion-management' }
          ]
        }
      ],
      '/themes/': [
        {
          text: 'Theme System',
          items: [
            { text: 'Overview', link: '/themes/' },
            { text: 'Liquid Glass UI', link: '/themes/liquid-glass' },
            { text: 'Design Tokens', link: '/themes/design-tokens' },
            { text: 'Custom Themes', link: '/themes/custom-themes' }
          ]
        },
        {
          text: 'Customization',
          items: [
            { text: 'CSS Variables', link: '/themes/css-variables' },
            { text: 'Component Styling', link: '/themes/component-styling' },
            { text: 'Animation Effects', link: '/themes/animation-effects' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/mobile-im-components' }
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Mobile IM Components Team'
    },

    editLink: {
      pattern: 'https://github.com/your-org/mobile-im-components/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    }
  },

  markdown: {
    theme: 'material-theme-palenight',
    lineNumbers: true,
    config: (md) => {
      md.use(require('markdown-it-container'), 'demo', {
        validate: function(params) {
          return params.trim().match(/^demo\s*(.*)$/);
        },
        render: function (tokens, idx) {
          const m = tokens[idx].info.trim().match(/^demo\s*(.*)$/);
          if (tokens[idx].nesting === 1) {
            const description = m && m.length > 1 ? m[1] : '';
            return `<DemoContainer description="${md.utils.escapeHtml(description)}">\n`;
          } else {
            return '</DemoContainer>\n';
          }
        }
      });
    }
  },

  vite: {
    define: {
      __VUE_OPTIONS_API__: false
    },
    server: {
      fs: {
        allow: ['..']
      }
    },
    build: {
      chunkSizeWarningLimit: 1000
    }
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en'
    },
    zh: {
      label: '中文',
      lang: 'zh',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/' },
          { text: 'API', link: '/zh/api/' },
          { text: '组件', link: '/zh/components/' },
          { text: '架构', link: '/zh/architecture/' },
          { text: '移动端', link: '/zh/mobile/' },
          { text: 'WebGL', link: '/zh/webgl/' },
          { text: '主题', link: '/zh/themes/' }
        ]
      }
    }
  }
})