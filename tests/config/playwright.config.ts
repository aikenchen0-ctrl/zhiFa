import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'tests/reports/playwright-report' }],
    ['junit', { outputFile: 'tests/reports/test-results.xml' }],
    ['json', { outputFile: 'tests/reports/test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Standard mobile devices
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        hasTouch: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
      },
    },
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad Pro'],
        hasTouch: true,
      },
    },
    {
      name: 'Mobile Chrome Landscape',
      use: { 
        ...devices['Pixel 5 landscape'],
        hasTouch: true,
      },
    },
    {
      name: 'Mobile Safari Landscape',
      use: { 
        ...devices['iPhone 12 landscape'],
        hasTouch: true,
      },
    },
    // Performance testing devices
    {
      name: 'Low-End Mobile',
      use: {
        viewport: { width: 360, height: 640 },
        deviceScaleFactor: 2,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0; SM-G955U) AppleWebKit/537.36',
      },
    },
    // High-end device testing
    {
      name: 'High-End Mobile',
      use: {
        viewport: { width: 414, height: 896 },
        deviceScaleFactor: 3,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },

  // Global setup for performance monitoring
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
});