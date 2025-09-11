/**
 * CSP(Content Security Policy)策略分析 - Overlay系统安全防护
 */
class CSPSecurityAnalyzer {
  constructor() {
    this.policyDirectives = new Map();
    this.violations = [];
    this.recommendations = [];
  }

  /**
   * 分析IM蒙层系统的CSP需求
   */
  analyzeOverlayCSPRequirements() {
    const requirements = {
      title: 'IM蒙层系统CSP策略需求分析',
      challenges: [
        {
          area: 'iframe嵌入',
          issues: [
            'frame-ancestors指令限制第三方嵌入',
            'child-src控制iframe内容源',
            'frame-src管理外部iframe加载'
          ],
          risks: '恶意网站通过iframe劫持或点击劫持'
        },
        {
          area: 'WebSocket连接',
          issues: [
            'connect-src指令限制WebSocket连接',
            'wss://协议强制使用',
            '动态域名连接受限'
          ],
          risks: '恶意脚本建立未授权的WebSocket连接'
        },
        {
          area: '动态脚本执行',
          issues: [
            'script-src禁止内联脚本',
            'eval()函数被阻止',
            '动态import()受限'
          ],
          risks: 'XSS攻击通过动态脚本执行'
        },
        {
          area: '样式注入',
          issues: [
            'style-src控制样式来源',
            'unsafe-inline样式风险',
            '第三方CSS框架限制'
          ],
          risks: '通过CSS注入进行数据泄露或UI劫持'
        }
      ],
      overlaySpecificNeeds: {
        positioning: '需要style-src允许内联样式进行动态定位',
        messaging: '需要connect-src允许多个IM平台WebSocket',
        embedding: '需要frame-src允许嵌入第三方IM界面',
        scripting: '需要script-src支持动态功能加载'
      }
    };

    return requirements;
  }

  /**
   * 生成渐进式CSP策略
   */
  generateProgressiveCSPPolicy() {
    const policies = {
      title: '渐进式CSP策略配置',
      phases: {
        phase1: {
          name: '报告模式 (Report-Only)',
          policy: {
            'Content-Security-Policy-Report-Only': [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.im-platform.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' wss://*.im-platform.com https://*.api.com",
              "frame-src 'self' https://*.trusted-domain.com",
              "font-src 'self' https://fonts.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "report-uri /csp-violation-report"
            ].join('; ')
          },
          purpose: '收集违规报告，不阻止执行'
        },
        phase2: {
          name: '限制模式 (Restrictive)',
          policy: {
            'Content-Security-Policy': [
              "default-src 'self'",
              "script-src 'self' 'nonce-{NONCE}' https://trusted-cdn.com",
              "style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com",
              "img-src 'self' data: https:",
              "connect-src 'self' wss://*.verified-im.com",
              "frame-src 'self' https://*.trusted-im-platform.com",
              "font-src 'self' https://fonts.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          purpose: '强制执行安全策略，使用nonce'
        },
        phase3: {
          name: '严格模式 (Strict)',
          policy: {
            'Content-Security-Policy': [
              "default-src 'none'",
              "script-src 'strict-dynamic' 'nonce-{NONCE}'",
              "style-src 'self' 'nonce-{NONCE}'",
              "img-src 'self' data:",
              "connect-src 'self' wss://*.verified-im.com",
              "frame-src 'none'",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'none'",
              "form-action 'none'",
              "frame-ancestors 'none'",
              "require-trusted-types-for 'script'",
              "trusted-types angular dompurify"
            ].join('; ')
          },
          purpose: '最高安全级别，使用Trusted Types'
        }
      }
    };

    return policies;
  }

  /**
   * 分析CSP违规报告
   */
  analyzeCSPViolations(violationReports) {
    const analysis = {
      title: 'CSP违规分析报告',
      summary: {
        totalViolations: violationReports.length,
        uniqueViolations: new Set(violationReports.map(v => v.directive)).size,
        riskLevels: {}
      },
      categories: {},
      recommendations: []
    };

    // 分类违规类型
    for (const violation of violationReports) {
      const category = this.categorizeViolation(violation);
      if (!analysis.categories[category]) {
        analysis.categories[category] = [];
      }
      analysis.categories[category].push(violation);
    }

    // 生成风险评估
    Object.entries(analysis.categories).forEach(([category, violations]) => {
      const riskLevel = this.assessViolationRisk(category, violations);
      analysis.summary.riskLevels[category] = riskLevel;

      if (riskLevel === 'HIGH') {
        analysis.recommendations.push({
          category,
          priority: 'URGENT',
          action: this.getUrgentAction(category),
          impact: 'Critical security vulnerability'
        });
      }
    });

    return analysis;
  }

  /**
   * 生成IM蒙层特定的CSP配置
   */
  generateIMOverlayCSPConfig(requirements = {}) {
    const config = {
      title: 'IM蒙层系统专用CSP配置',
      basePolicy: {
        'default-src': "'self'",
        'script-src': [
          "'self'",
          "'nonce-{RUNTIME_NONCE}'",
          ...this.getTrustedIMDomains(requirements.trustedPlatforms)
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'", // 蒙层动态样式需要
          'https://fonts.googleapis.com'
        ],
        'connect-src': [
          "'self'",
          ...this.getWebSocketDomains(requirements.imPlatforms),
          ...this.getAPIDomains(requirements.apiEndpoints)
        ],
        'frame-src': [
          "'self'",
          ...this.getEmbedDomains(requirements.embedPlatforms)
        ],
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        'font-src': [
          "'self'",
          'https://fonts.gstatic.com'
        ],
        'object-src': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'",
        'frame-ancestors': this.getParentDomains(requirements.allowedParents),
        'upgrade-insecure-requests': true
      },
      
      dynamicNonce: `
        // 动态Nonce生成中间件
        const crypto = require('crypto');
        
        function generateCSPNonce(req, res, next) {
          const nonce = crypto.randomBytes(16).toString('base64');
          res.locals.nonce = nonce;
          
          const csp = buildCSPHeader(nonce);
          res.setHeader('Content-Security-Policy', csp);
          
          next();
        }
        
        function buildCSPHeader(nonce) {
          return Object.entries(cspConfig)
            .map(([directive, sources]) => {
              const sourceList = Array.isArray(sources) ? sources : [sources];
              const nonceAware = sourceList.map(src => 
                src.includes('{RUNTIME_NONCE}') ? src.replace('{RUNTIME_NONCE}', nonce) : src
              );
              return \`\${directive} \${nonceAware.join(' ')}\`;
            })
            .join('; ');
        }
      `,
      
      monitoringSetup: `
        // CSP违规监控
        app.post('/csp-violation-report', (req, res) => {
          const violation = req.body['csp-report'];
          
          // 记录违规
          securityLogger.warn('CSP Violation', {
            documentUri: violation['document-uri'],
            violatedDirective: violation['violated-directive'],
            blockedUri: violation['blocked-uri'],
            sourceFile: violation['source-file'],
            lineNumber: violation['line-number'],
            timestamp: new Date().toISOString()
          });
          
          // 自动调整策略
          if (this.shouldAdjustPolicy(violation)) {
            this.updateCSPPolicy(violation);
          }
          
          res.status(204).send();
        });
      `
    };

    return config;
  }

  categorizeViolation(violation) {
    const directive = violation['violated-directive'];
    if (directive.startsWith('script-src')) return 'SCRIPT_EXECUTION';
    if (directive.startsWith('style-src')) return 'STYLE_INJECTION';
    if (directive.startsWith('connect-src')) return 'NETWORK_CONNECTION';
    if (directive.startsWith('frame-src')) return 'IFRAME_EMBEDDING';
    return 'OTHER';
  }

  assessViolationRisk(category, violations) {
    const riskMatrix = {
      'SCRIPT_EXECUTION': violations.length > 10 ? 'HIGH' : 'MEDIUM',
      'STYLE_INJECTION': violations.length > 20 ? 'MEDIUM' : 'LOW',
      'NETWORK_CONNECTION': violations.length > 5 ? 'HIGH' : 'MEDIUM',
      'IFRAME_EMBEDDING': violations.length > 3 ? 'HIGH' : 'MEDIUM'
    };
    return riskMatrix[category] || 'LOW';
  }

  getTrustedIMDomains(platforms = []) {
    const domainMap = {
      'wechat': 'https://*.wechat.com',
      'qq': 'https://*.qq.com',
      'dingtalk': 'https://*.dingtalk.com',
      'feishu': 'https://*.feishu.cn'
    };
    return platforms.map(p => domainMap[p]).filter(Boolean);
  }

  getWebSocketDomains(platforms = []) {
    return platforms.map(p => `wss://*.${p}.com wss://*.${p}.cn`).flat();
  }
}

module.exports = { CSPSecurityAnalyzer };