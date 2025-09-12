#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Code complexity monitoring and reporting script
 * Analyzes TypeScript/JavaScript files for complexity metrics
 */

const COMPLEXITY_THRESHOLDS = {
  COGNITIVE_COMPLEXITY: 15,
  CYCLOMATIC_COMPLEXITY: 10,
  MAINTAINABILITY_INDEX: 70,
  LINES_OF_CODE: 300,
  PARAMETER_COUNT: 5,
  NESTING_DEPTH: 4
};

const QUALITY_GATES = {
  CRITICAL: {
    complexityScore: 8,
    maintainabilityIndex: 50,
    testCoverage: 60
  },
  WARNING: {
    complexityScore: 6,
    maintainabilityIndex: 70,
    testCoverage: 80
  },
  GOOD: {
    complexityScore: 4,
    maintainabilityIndex: 85,
    testCoverage: 90
  }
};

class ComplexityMonitor {
  constructor() {
    this.results = {
      files: [],
      summary: {
        totalFiles: 0,
        averageComplexity: 0,
        highComplexityFiles: 0,
        criticalIssues: 0,
        warnings: 0
      }
    };
  }

  /**
   * Analyze all TypeScript files in the src directory
   */
  async analyzeProject() {
    console.log('🔍 Starting code complexity analysis...\n');
    
    const srcDir = path.join(process.cwd(), 'src');
    if (!fs.existsSync(srcDir)) {
      console.error('❌ Source directory not found');
      process.exit(1);
    }

    const files = this.findTypeScriptFiles(srcDir);
    console.log(`📁 Found ${files.length} TypeScript files`);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    this.generateReport();
    this.enforceQualityGates();
  }

  /**
   * Find all TypeScript files recursively
   */
  findTypeScriptFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('dist')) {
        files = files.concat(this.findTypeScriptFiles(fullPath));
      } else if (item.match(/\.(ts|tsx)$/) && !item.includes('.test.') && !item.includes('.spec.')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Analyze individual file complexity
   */
  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      const analysis = {
        path: relativePath,
        size: content.length,
        lines: content.split('\n').length,
        complexity: this.calculateComplexity(content),
        maintainability: this.calculateMaintainability(content),
        issues: []
      };

      // Check against thresholds
      this.checkThresholds(analysis);
      
      this.results.files.push(analysis);
      this.results.summary.totalFiles++;

    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error.message);
    }
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateComplexity(content) {
    // Count decision points: if, while, for, switch, case, catch, &&, ||, ?
    const patterns = [
      /\bif\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g
    ];

    let complexity = 1; // Base complexity
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Calculate maintainability index (simplified version)
   */
  calculateMaintainability(content) {
    const lines = content.split('\n').length;
    const complexity = this.calculateComplexity(content);
    const commentLines = (content.match(/^\s*\/\/|^\s*\/\*|\*\//gm) || []).length;
    
    // Simplified maintainability index formula
    const commentRatio = commentLines / lines;
    const maintainabilityIndex = Math.max(0, 
      100 - (complexity * 2) - (lines / 10) + (commentRatio * 20)
    );

    return Math.round(maintainabilityIndex);
  }

  /**
   * Check file against complexity thresholds
   */
  checkThresholds(analysis) {
    if (analysis.complexity > COMPLEXITY_THRESHOLDS.CYCLOMATIC_COMPLEXITY) {
      analysis.issues.push({
        type: 'HIGH_COMPLEXITY',
        severity: 'error',
        message: `Cyclomatic complexity ${analysis.complexity} exceeds threshold ${COMPLEXITY_THRESHOLDS.CYCLOMATIC_COMPLEXITY}`
      });
      this.results.summary.criticalIssues++;
    }

    if (analysis.lines > COMPLEXITY_THRESHOLDS.LINES_OF_CODE) {
      analysis.issues.push({
        type: 'LARGE_FILE',
        severity: 'warning',
        message: `File has ${analysis.lines} lines, exceeds threshold ${COMPLEXITY_THRESHOLDS.LINES_OF_CODE}`
      });
      this.results.summary.warnings++;
    }

    if (analysis.maintainability < COMPLEXITY_THRESHOLDS.MAINTAINABILITY_INDEX) {
      analysis.issues.push({
        type: 'LOW_MAINTAINABILITY',
        severity: 'warning',
        message: `Maintainability index ${analysis.maintainability} below threshold ${COMPLEXITY_THRESHOLDS.MAINTAINABILITY_INDEX}`
      });
      this.results.summary.warnings++;
    }

    if (analysis.issues.some(issue => issue.severity === 'error')) {
      this.results.summary.highComplexityFiles++;
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n📊 COMPLEXITY ANALYSIS REPORT');
    console.log('================================\n');

    // Summary statistics
    const avgComplexity = this.results.files.reduce((sum, file) => sum + file.complexity, 0) / this.results.files.length;
    const avgMaintainability = this.results.files.reduce((sum, file) => sum + file.maintainability, 0) / this.results.files.length;

    console.log('📈 Summary Statistics:');
    console.log(`  Total files analyzed: ${this.results.summary.totalFiles}`);
    console.log(`  Average complexity: ${avgComplexity.toFixed(2)}`);
    console.log(`  Average maintainability: ${avgMaintainability.toFixed(2)}%`);
    console.log(`  High complexity files: ${this.results.summary.highComplexityFiles}`);
    console.log(`  Critical issues: ${this.results.summary.criticalIssues}`);
    console.log(`  Warnings: ${this.results.summary.warnings}\n`);

    // Top complex files
    const sortedFiles = [...this.results.files].sort((a, b) => b.complexity - a.complexity);
    const topComplexFiles = sortedFiles.slice(0, 10);

    console.log('🔥 Most Complex Files:');
    topComplexFiles.forEach((file, index) => {
      const status = file.complexity > COMPLEXITY_THRESHOLDS.CYCLOMATIC_COMPLEXITY ? '❌' : '✅';
      console.log(`  ${index + 1}. ${status} ${file.path} (complexity: ${file.complexity}, maintainability: ${file.maintainability}%)`);
    });

    // Issues summary
    if (this.results.summary.criticalIssues > 0 || this.results.summary.warnings > 0) {
      console.log('\n⚠️  Issues Found:');
      this.results.files.forEach(file => {
        if (file.issues.length > 0) {
          console.log(`\n  📁 ${file.path}:`);
          file.issues.forEach(issue => {
            const icon = issue.severity === 'error' ? '❌' : '⚠️';
            console.log(`    ${icon} ${issue.message}`);
          });
        }
      });
    }

    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Save detailed JSON report
   */
  saveDetailedReport() {
    const reportPath = path.join(process.cwd(), 'reports', 'complexity-report.json');
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      files: this.results.files,
      thresholds: COMPLEXITY_THRESHOLDS,
      qualityGates: QUALITY_GATES
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Enforce quality gates
   */
  enforceQualityGates() {
    console.log('\n🚪 Quality Gate Evaluation:');
    
    const avgComplexity = this.results.files.reduce((sum, file) => sum + file.complexity, 0) / this.results.files.length;
    const avgMaintainability = this.results.files.reduce((sum, file) => sum + file.maintainability, 0) / this.results.files.length;
    
    let gateStatus = 'GOOD';
    
    if (this.results.summary.criticalIssues > 0 || avgComplexity >= QUALITY_GATES.CRITICAL.complexityScore || avgMaintainability <= QUALITY_GATES.CRITICAL.maintainabilityIndex) {
      gateStatus = 'CRITICAL';
    } else if (this.results.summary.warnings > 5 || avgComplexity >= QUALITY_GATES.WARNING.complexityScore || avgMaintainability <= QUALITY_GATES.WARNING.maintainabilityIndex) {
      gateStatus = 'WARNING';
    }

    switch (gateStatus) {
      case 'CRITICAL':
        console.log('❌ QUALITY GATE: FAILED (Critical issues found)');
        console.log('   Action required: Refactor high complexity code before merge');
        process.exit(1);
        break;
      case 'WARNING':
        console.log('⚠️  QUALITY GATE: WARNING (Issues detected)');
        console.log('   Recommendation: Consider refactoring before merge');
        break;
      case 'GOOD':
        console.log('✅ QUALITY GATE: PASSED (Good code quality)');
        break;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new ComplexityMonitor();
  monitor.analyzeProject().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = ComplexityMonitor;