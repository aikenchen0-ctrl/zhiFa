import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../docs/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
    '@storybook/addon-a11y',
    '@storybook/addon-design-tokens'
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  
  features: {
    buildStoriesJson: true,
    interactionsDebugger: true
  },
  
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    }
  },
  
  viteFinal: async (config) => {
    // 自定义Vite配置
    return {
      ...config,
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include ?? []),
          '@storybook/blocks',
          'zustand'
        ]
      },
      define: {
        ...config.define,
        global: 'globalThis'
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': '/src'
        }
      }
    }
  },
  
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation'
  },
  
  staticDirs: ['../public'],
  
  core: {
    disableTelemetry: true
  }
}

export default config