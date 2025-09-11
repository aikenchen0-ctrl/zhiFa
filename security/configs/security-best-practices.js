/**
 * IM集成系统安全最佳实践配置
 * 基于安全风险评估报告的实施建议
 */

class SecurityBestPractices {
  constructor() {
    this.configurations = new Map();
    this.initializeConfigurations();
  }

  initializeConfigurations() {
    // CORS安全配置
    this.configurations.set('cors', this.getCORSSecurityConfig());
    
    // CSP安全策略
    this.configurations.set('csp', this.getCSPSecurityConfig());
    
    // 令牌管理配置
    this.configurations.set('token', this.getTokenSecurityConfig());
    
    // 加密配置
    this.configurations.set('encryption', this.getEncryptionConfig());
    
    // 合规配置
    this.configurations.set('compliance', this.getComplianceConfig());
  }

  /**
   * CORS安全配置
   */
  getCORSSecurityConfig() {
    return {
      // 生产环境安全配置
      production: {
        origin: (origin, callback) => {
          const allowedOrigins = [
            'https://your-domain.com',
            'https://api.your-domain.com',
            'https://admin.your-domain.com'
          ];
          
          // 允许移动应用访问
          const mobileOrigins = process.env.MOBILE_ALLOWED_ORIGINS?.split(',') || [];
          const allAllowed = [...allowedOrigins, ...mobileOrigins];
          
          if (!origin || allAllowed.includes(origin)) {
            callback(null, true);
          } else {
            this.logSecurityEvent('cors_origin_blocked', { origin });
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: [
          'Content-Type',
          'Authorization', 
          'X-Requested-With',
          'X-Client-Version',
          'X-Request-ID'
        ],
        exposedHeaders: [
          'X-Total-Count',
          'X-Rate-Limit-Remaining'
        ],
        maxAge: 3600, // 1小时预检缓存
        optionsSuccessStatus: 204
      },
      
      // 开发环境配置
      development: {
        origin: true, // 开发阶段允许所有来源
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['*'],
        maxAge: 86400
      },
      
      // 安全中间件
      middleware: `
        const corsSecure = (req, res, next) => {
          const origin = req.headers.origin;
          const userAgent = req.headers['user-agent'];
          
          // 检测可疑请求
          if (this.detectSuspiciousOrigin(origin, userAgent)) {
            return res.status(403).json({ 
              error: 'Forbidden: Suspicious origin detected' 
            });
          }
          
          // 添加安全头
          res.header('X-Content-Type-Options', 'nosniff');
          res.header('X-Frame-Options', 'DENY');
          res.header('X-XSS-Protection', '1; mode=block');
          res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
          
          next();
        };
      `
    };
  }

  /**
   * CSP安全策略配置
   */
  getCSPSecurityConfig() {
    return {
      // 渐进式CSP实施
      phases: {
        // 阶段1: 报告模式(不阻止, 仅收集违规)
        reportOnly: {
          'Content-Security-Policy-Report-Only': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.trusted-cdn.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' wss://*.im-platform.com https://*.api.com ws://localhost:*",
            "frame-src 'self' https://*.trusted-domain.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
            "report-uri /api/csp-violation-report"
          ].join('; ')
        },
        
        // 阶段2: 限制模式(使用nonce)
        restrictive: {
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'",
            "style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com",
            "img-src 'self' data: https:",
            "connect-src 'self' wss://*.verified-im.com",
            "frame-src 'none'",
            "font-src 'self' https://fonts.gstatic.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
          ].join('; ')
        },
        
        // 阶段3: 严格模式(Trusted Types)
        strict: {
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
            "trusted-types dompurify angular-sanitizer"
          ].join('; ')
        }
      },
      
      // CSP nonce生成中间件
      nonceGenerator: `
        const crypto = require('crypto');
        
        function generateCSPMiddleware(phase = 'reportOnly') {
          return (req, res, next) => {
            const nonce = crypto.randomBytes(16).toString('base64');
            res.locals.cspNonce = nonce;
            
            const cspConfig = this.getCSPConfig(phase);
            const cspHeader = this.buildCSPHeader(cspConfig, nonce);
            
            res.setHeader(
              phase === 'reportOnly' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
              cspHeader
            );
            
            next();
          };
        }
      `,
      
      // IM蒙层特殊配置
      overlaySpecific: {
        allowInlineStyles: true, // 蒙层动态定位需要
        websocketDomains: [
          'wss://*.wechat.com',
          'wss://*.qq.com', 
          'wss://*.dingtalk.com',
          'wss://*.feishu.cn'
        ],
        trustedScriptDomains: [
          'https://res.wx.qq.com',
          'https://cdn.jsdelivr.net'
        ]
      }
    };
  }

  /**
   * 令牌安全管理配置
   */
  getTokenSecurityConfig() {
    return {
      // 存储策略
      storage: {
        accessToken: {
          method: 'memory', // 内存存储
          ttl: 15 * 60 * 1000, // 15分钟
          autoRefresh: true
        },
        refreshToken: {
          method: 'httpOnlyCookie',
          ttl: 7 * 24 * 60 * 60 * 1000, // 7天
          secure: true,
          sameSite: 'strict',
          httpOnly: true
        }
      },
      
      // JWT配置
      jwt: {
        algorithm: 'ES256', // ECDSA with P-256 and SHA-256
        issuer: 'im-integration-platform',
        audience: 'im-clients',
        
        // 私钥和公钥配置
        keys: {
          private: process.env.JWT_PRIVATE_KEY,
          public: process.env.JWT_PUBLIC_KEY,
          keyId: process.env.JWT_KEY_ID
        },
        
        // 声明配置
        claims: {
          sub: 'user_id',
          iat: 'issued_at',
          exp: 'expires_at',
          aud: 'audience',
          iss: 'issuer',
          custom: ['platform', 'permissions', 'session_id']
        }
      },
      
      // 令牌轮换策略
      rotation: {
        enabled: true,
        rotateOnUse: true, // 每次使用刷新令牌时轮换
        gracePeriod: 5 * 60 * 1000, // 5分钟重叠期
        maxRotations: 5 // 最大轮换次数
      },
      
      // 安全实现
      implementation: `
        class SecureTokenManager {
          constructor() {
            this.memoryStore = new Map();
            this.rotationHistory = new Map();
          }
          
          async issueTokenPair(userId, platform) {
            const accessToken = await this.generateAccessToken(userId, platform);
            const refreshToken = await this.generateRefreshToken(userId, platform);
            
            // 内存存储访问令牌
            this.memoryStore.set(\`\${userId}:\${platform}\`, {
              token: accessToken,
              expires: Date.now() + 15 * 60 * 1000,
              platform: platform
            });
            
            return { accessToken, refreshToken };
          }
          
          async refreshTokens(refreshToken) {
            const payload = await this.verifyRefreshToken(refreshToken);
            
            // 检查令牌轮换历史
            if (this.isTokenReplayed(refreshToken)) {
              await this.revokeAllTokens(payload.sub);
              throw new SecurityError('Token replay detected');
            }
            
            // 生成新令牌对
            const newTokens = await this.issueTokenPair(payload.sub, payload.platform);
            
            // 记录轮换历史
            this.recordTokenRotation(refreshToken, newTokens.refreshToken);
            
            return newTokens;
          }
        }
      `
    };
  }

  /**
   * 加密配置
   */
  getEncryptionConfig() {
    return {
      // 传输层加密
      transport: {
        tls: {
          minVersion: 'TLSv1.3',
          maxVersion: 'TLSv1.3',
          ciphers: [
            'TLS_AES_256_GCM_SHA384',
            'TLS_CHACHA20_POLY1305_SHA256',
            'TLS_AES_128_GCM_SHA256'
          ],
          honorCipherOrder: true,
          
          // HSTS配置
          hsts: {
            maxAge: 31536000, // 1年
            includeSubDomains: true,
            preload: true
          }
        },
        
        websocket: {
          secure: true, // 强制WSS
          verifyClient: true,
          perMessageDeflate: false, // 避免压缩攻击
          maxPayload: 16 * 1024 // 限制消息大小
        }
      },
      
      // 应用层加密
      application: {
        symmetric: {
          algorithm: 'AES-256-GCM',
          keyLength: 256,
          ivLength: 12,
          tagLength: 16
        },
        
        asymmetric: {
          algorithm: 'ECDH',
          namedCurve: 'P-256',
          keyUsage: ['deriveKey']
        },
        
        hashing: {
          algorithm: 'SHA-256',
          iterations: 100000, // PBKDF2迭代次数
          saltLength: 32
        },
        
        signing: {
          algorithm: 'ECDSA',
          namedCurve: 'P-256',
          hash: 'SHA-256'
        }
      },
      
      // 前端加密库选择
      frontend: {
        primary: 'WebCryptoAPI',
        fallback: 'libsodium.js',
        
        webCryptoCheck: `
          function isWebCryptoSupported() {
            return typeof crypto !== 'undefined' && 
                   typeof crypto.subtle !== 'undefined';
          }
        `,
        
        libsodiumSetup: `
          import sodium from 'libsodium-wrappers';
          
          class SodiumCrypto {
            async initialize() {
              await sodium.ready;
              return true;
            }
            
            encrypt(message, recipientPublicKey, senderPrivateKey) {
              const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
              const ciphertext = sodium.crypto_box_easy(
                message, nonce, recipientPublicKey, senderPrivateKey
              );
              return { ciphertext, nonce };
            }
          }
        `
      },
      
      // 密钥管理
      keyManagement: {
        generation: {
          entropy: 'crypto.getRandomValues', // 使用安全随机数
          keyDerivation: 'PBKDF2',
          keyWrap: 'AES-KW'
        },
        
        storage: {
          method: 'hardware_backed', // 硬件支持的密钥存储
          extractable: false, // 密钥不可导出
          keyUsage: ['encrypt', 'decrypt', 'sign', 'verify']
        },
        
        rotation: {
          schedule: 'monthly',
          gracePeriod: '7days',
          automaticRotation: true
        }
      }
    };
  }

  /**
   * 合规配置
   */
  getComplianceConfig() {
    return {
      // GDPR合规
      gdpr: {
        dataProcessingBases: [
          'consent',
          'contract', 
          'legal_obligation',
          'vital_interests',
          'public_task',
          'legitimate_interests'
        ],
        
        dataSubjectRights: {
          access: {
            enabled: true,
            responseTime: '30days',
            freeOfCharge: true
          },
          rectification: {
            enabled: true,
            responseTime: '30days'
          },
          erasure: {
            enabled: true,
            responseTime: '30days',
            exceptions: ['legal_obligation', 'public_interest']
          },
          portability: {
            enabled: true,
            format: 'JSON',
            responseTime: '30days'
          }
        },
        
        consentManagement: `
          class ConsentManager {
            async recordConsent(userId, purpose, consentData) {
              const consent = {
                userId: userId,
                purpose: purpose,
                timestamp: new Date().toISOString(),
                consentType: 'explicit',
                withdrawable: true,
                granular: true,
                lawfulBasis: this.determineLawfulBasis(purpose),
                version: '1.0'
              };
              
              await this.storeConsent(consent);
              await this.updateProcessingRights(userId, purpose, true);
              
              return consent;
            }
            
            async withdrawConsent(userId, purposeId) {
              await this.updateProcessingRights(userId, purposeId, false);
              await this.scheduleDataDeletion(userId, purposeId);
              
              this.auditLog('consent_withdrawn', { userId, purposeId });
            }
          }
        `
      },
      
      // 中国法规合规
      china: {
        pipl: {
          sensitiveDataHandling: {
            biometric: 'explicit_consent_required',
            health: 'explicit_consent_required',
            location: 'explicit_consent_required',
            minors: 'parental_consent_required'
          },
          
          crossBorderTransfer: {
            assessment: {
              dataVolume: 'evaluate',
              sensitivity: 'classify',
              recipient: 'verify',
              safeguards: 'implement'
            },
            
            mechanisms: [
              'standard_contractual_clauses',
              'certification',
              'adequacy_decision'
            ]
          }
        },
        
        dsl: {
          dataClassification: {
            levels: ['general', 'important', 'critical'],
            categories: ['personal', 'business', 'operational'],
            
            protectionMeasures: {
              critical: ['encryption', 'access_control', 'audit', 'backup'],
              important: ['encryption', 'access_control', 'basic_audit'],
              general: ['basic_access_control']
            }
          }
        }
      },
      
      // 审计和监控
      audit: {
        logging: {
          events: [
            'data_access',
            'data_modification', 
            'consent_changes',
            'cross_border_transfer',
            'security_events'
          ],
          
          retention: {
            security_logs: '2years',
            audit_logs: '7years',
            access_logs: '1year'
          },
          
          format: 'structured_json',
          encryption: true
        },
        
        monitoring: {
          realTime: true,
          alerting: true,
          dashboard: true,
          reporting: 'monthly'
        }
      },
      
      // 数据处理记录
      recordOfProcessing: `
        class ProcessingRecordManager {
          generateRecord() {
            return {
              controller: {
                name: 'IM Integration Platform',
                contact: 'privacy@company.com',
                dpo: 'dpo@company.com'
              },
              
              processing: [
                {
                  purpose: 'IM message forwarding',
                  categories: ['communication_content', 'metadata'],
                  subjects: ['platform_users'],
                  recipients: ['third_party_im_platforms'],
                  retention: '7_days',
                  security: ['encryption', 'access_control'],
                  crossBorderTransfers: {
                    countries: ['US', 'SG'],
                    safeguards: 'standard_contractual_clauses'
                  }
                }
              ]
            };
          }
        }
      `
    };
  }

  /**
   * 获取指定类型的配置
   */
  getConfig(type) {
    return this.configurations.get(type);
  }

  /**
   * 获取完整配置
   */
  getAllConfigurations() {
    return Object.fromEntries(this.configurations);
  }

  /**
   * 验证配置完整性
   */
  validateConfigurations() {
    const validationResults = {};
    
    for (const [type, config] of this.configurations) {
      validationResults[type] = this.validateConfig(type, config);
    }
    
    return validationResults;
  }

  validateConfig(type, config) {
    // 实现配置验证逻辑
    const validators = {
      cors: this.validateCORSConfig,
      csp: this.validateCSPConfig,
      token: this.validateTokenConfig,
      encryption: this.validateEncryptionConfig,
      compliance: this.validateComplianceConfig
    };
    
    const validator = validators[type];
    return validator ? validator.call(this, config) : { valid: true };
  }

  validateCORSConfig(config) {
    const errors = [];
    
    if (config.production?.origin === '*') {
      errors.push('Production CORS origin should not be wildcard');
    }
    
    if (!config.production?.credentials) {
      errors.push('CORS credentials should be enabled for authenticated requests');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // 其他验证方法...
}

module.exports = { SecurityBestPractices };