export const browserstackConfig = {
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  
  capabilities: [
    // iOS Devices
    {
      'bstack:options': {
        osVersion: '15',
        deviceName: 'iPhone 13',
        realMobile: 'true',
        projectName: 'Mobile Gesture Testing',
        buildName: 'iOS Build',
        sessionName: 'iOS Gesture Tests',
        debug: true,
        networkLogs: true,
      },
      browserName: 'safari',
    },
    {
      'bstack:options': {
        osVersion: '14',
        deviceName: 'iPad Pro 12.9 2021',
        realMobile: 'true',
        projectName: 'Mobile Gesture Testing',
        buildName: 'iPad Build',
        sessionName: 'iPad Gesture Tests',
      },
      browserName: 'safari',
    },
    
    // Android Devices
    {
      'bstack:options': {
        osVersion: '12.0',
        deviceName: 'Samsung Galaxy S22',
        realMobile: 'true',
        projectName: 'Mobile Gesture Testing',
        buildName: 'Android Build',
        sessionName: 'Android Gesture Tests',
        debug: true,
        networkLogs: true,
      },
      browserName: 'chrome',
    },
    {
      'bstack:options': {
        osVersion: '11.0',
        deviceName: 'Google Pixel 6',
        realMobile: 'true',
        projectName: 'Mobile Gesture Testing',
        buildName: 'Pixel Build',
        sessionName: 'Pixel Gesture Tests',
      },
      browserName: 'chrome',
    },
  ],

  commonCapabilities: {
    'bstack:options': {
      consoleLogs: 'verbose',
      networkLogs: true,
      video: true,
      debug: true,
    },
  },
};

export const localTestingConfig = {
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'mobile-testing',
  forceLocal: true,
  verbose: true,
};