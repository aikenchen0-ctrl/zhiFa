import { addons } from '@storybook/manager-api'
import { create } from '@storybook/theming/create'

// 自定义Storybook主题
const liquidGlassTheme = create({
  base: 'dark',
  
  // 品牌信息
  brandTitle: 'Mobile IM Components',
  brandUrl: 'https://github.com/your-org/mobile-im-components',
  brandImage: '/logo.svg',
  brandTarget: '_self',
  
  // 颜色系统
  colorPrimary: '#646cff',
  colorSecondary: '#747bff',
  
  // UI颜色
  appBg: '#0f0f0f',
  appContentBg: '#1a1a1a',
  appBorderColor: 'rgba(255, 255, 255, 0.1)',
  appBorderRadius: 8,
  
  // 文本颜色
  textColor: '#ffffff',
  textInverseColor: '#000000',
  textMutedColor: 'rgba(255, 255, 255, 0.7)',
  
  // 工具栏
  barTextColor: 'rgba(255, 255, 255, 0.8)',
  barSelectedColor: '#646cff',
  barBg: 'rgba(255, 255, 255, 0.05)',
  
  // 表单
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputTextColor: '#ffffff',
  inputBorderRadius: 6,
  
  // 字体
  fontBase: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontCode: '"Fira Code", "Monaco", "Consolas", "Courier New", monospace'
})

// 应用主题
addons.setConfig({
  theme: liquidGlassTheme,
  
  // 面板配置
  panelPosition: 'bottom',
  
  // 导航配置
  sidebar: {
    showRoots: true,
    collapsedRoots: ['examples', 'documentation']
  },
  
  // 工具栏配置
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false }
  }
})