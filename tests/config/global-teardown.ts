import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  // Cleanup test artifacts
  const reportDir = path.join(__dirname, '..', 'reports');
  
  // Generate performance summary
  const performanceSummary = {
    timestamp: new Date().toISOString(),
    summary: 'Mobile IM System Test Execution Complete',
    environment: process.env.NODE_ENV || 'test',
    testMode: process.env.TEST_MODE,
    performanceMonitoring: process.env.PERFORMANCE_MONITORING
  };

  if (fs.existsSync(reportDir)) {
    fs.writeFileSync(
      path.join(reportDir, 'performance-summary.json'),
      JSON.stringify(performanceSummary, null, 2)
    );
  }

  // Cleanup environment variables
  delete process.env.TEST_MODE;
  delete process.env.PERFORMANCE_MONITORING;
  
  console.log('✅ Mobile test suite teardown complete');
}

export default globalTeardown;