// React + Vite 移动端开发配置
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// 移动端开发优化配置
export default defineConfig({
  plugins: [
    react({
      // React Fast Refresh 优化
      fastRefresh: true,
      // 支持JSX运行时
      jsxRuntime: 'automatic'
    })
  ],
  
  // 开发服务器配置
  server: {
    // 监听所有网络接口
    host: '0.0.0.0',
    port: 3000,
    
    // 启用HTTPS (用于现代Web API)
    https: process.env.HTTPS === 'true',
    
    // 热更新配置
    hmr: {
      // 如果使用内网穿透，设置为false
      overlay: process.env.NODE_ENV !== 'tunnel',
    },
    
    // 代理配置
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    
    // CORS配置
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  },
  
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 生产环境源码映射
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled']
        }
      }
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@services': resolve(__dirname, 'src/services'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  // 环境变量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __MOBILE_DEV__: JSON.stringify(process.env.MOBILE_DEV === 'true'),
    __VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  
  // CSS配置
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // PWA支持
  plugins: [
    // 现有插件...
    
    // PWA插件（可选）
    process.env.PWA === 'true' && VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Mobile Dev App',
        short_name: 'MobileApp',
        description: 'Mobile Development Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean)
});

// 移动端开发工具配置
export const mobileDevConfig = {
  // 调试工具配置
  debugTools: {
    vconsole: process.env.VITE_DEBUG_VCONSOLE === 'true',
    eruda: process.env.VITE_DEBUG_ERUDA === 'true',
    weinre: process.env.VITE_DEBUG_WEINRE,
    remoteLogging: process.env.VITE_REMOTE_LOGGING === 'true'
  },
  
  // 内网穿透配置
  tunneling: {
    ngrok: {
      enabled: process.env.TUNNEL_PROVIDER === 'ngrok',
      authtoken: process.env.NGROK_AUTHTOKEN,
      subdomain: process.env.NGROK_SUBDOMAIN,
      region: process.env.NGROK_REGION || 'us'
    },
    frp: {
      enabled: process.env.TUNNEL_PROVIDER === 'frp',
      serverAddr: process.env.FRP_SERVER_ADDR,
      serverPort: process.env.FRP_SERVER_PORT || 7000,
      customDomain: process.env.FRP_CUSTOM_DOMAIN
    },
    cloudflare: {
      enabled: process.env.TUNNEL_PROVIDER === 'cloudflare',
      tunnelName: process.env.CF_TUNNEL_NAME,
      hostname: process.env.CF_HOSTNAME
    }
  },
  
  // 性能监控配置
  performance: {
    enabled: process.env.VITE_PERFORMANCE_MONITOR === 'true',
    reportInterval: parseInt(process.env.VITE_PERF_INTERVAL) || 30000,
    endpoint: process.env.VITE_PERF_ENDPOINT
  },
  
  // 移动端特性检测
  features: {
    touchEvents: true,
    deviceOrientation: true,
    vibration: true,
    camera: true,
    geolocation: true,
    localStorage: true,
    serviceWorker: true
  }
};

// 开发环境特定配置
if (process.env.NODE_ENV === 'development') {
  // 开发模式下的特殊配置
  console.log('🚀 移动端开发模式启动');
  console.log('📱 访问地址配置:');
  console.log(`   本地: http://localhost:3000`);
  
  if (process.env.TUNNEL_URL) {
    console.log(`   外网: ${process.env.TUNNEL_URL}`);
  }
  
  // 自动检测网络接口
  import('os').then(os => {
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach(name => {
      interfaces[name].forEach(interface => {
        if (interface.family === 'IPv4' && !interface.internal) {
          console.log(`   局域网: http://${interface.address}:3000`);
        }
      });
    });
  });
}