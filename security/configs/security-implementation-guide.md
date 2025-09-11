# IM集成系统安全实施指南

## 概述

本指南基于安全风险评估报告，提供具体的技术实施方案和代码示例，帮助开发团队快速实现安全防护措施。

## 1. 立即修复的高危安全问题

### 1.1 CORS配置修复

**问题**: 当前CORS配置使用通配符`*`，存在严重安全风险。

**解决方案**:

```javascript
// ❌ 不安全的配置
app.use(cors({
  origin: '*',
  credentials: true
}));

// ✅ 安全的配置
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    
    // 允许无origin的请求(如移动应用)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // 记录被阻止的请求
      securityLogger.warn('CORS origin blocked', { 
        origin, 
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString() 
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Client-Version'
  ],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 3600,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
```

**实施检查清单**:
- [ ] 环境变量配置允许的域名列表
- [ ] 移除所有通配符配置
- [ ] 添加Origin验证日志
- [ ] 测试各平台客户端连接

### 1.2 令牌存储安全修复

**问题**: 令牌存储在localStorage中，容易受到XSS攻击。

**解决方案**:

```javascript
// 安全的令牌管理器
class SecureTokenManager {
  constructor() {
    this.memoryTokens = new Map();
    this.refreshTokenRotation = new Map();
  }

  // 安全存储令牌对
  async storeTokens(userId, accessToken, refreshToken, platform) {
    // 访问令牌存储在内存中(15分钟过期)
    const accessKey = `${userId}:${platform}:access`;
    this.memoryTokens.set(accessKey, {
      token: accessToken,
      expires: Date.now() + 15 * 60 * 1000,
      platform: platform
    });

    // 刷新令牌存储在httpOnly Cookie中
    this.setRefreshTokenCookie(refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      domain: process.env.COOKIE_DOMAIN
    });

    // 清理过期的内存令牌
    this.cleanupExpiredTokens();
  }

  // 获取访问令牌
  getAccessToken(userId, platform) {
    const key = `${userId}:${platform}:access`;
    const tokenData = this.memoryTokens.get(key);
    
    if (!tokenData || tokenData.expires < Date.now()) {
      return null;
    }
    
    return tokenData.token;
  }

  // 令牌刷新机制
  async refreshTokens(refreshToken) {
    try {
      // 验证刷新令牌
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // 检查令牌是否已被轮换
      if (this.isTokenRotated(refreshToken)) {
        // 检测到令牌重放攻击，撤销所有令牌
        await this.revokeAllUserTokens(payload.userId);
        throw new SecurityError('Token replay attack detected');
      }
      
      // 生成新的令牌对
      const newAccessToken = this.generateAccessToken(payload);
      const newRefreshToken = this.generateRefreshToken(payload);
      
      // 记录令牌轮换
      this.recordTokenRotation(refreshToken, newRefreshToken);
      
      // 存储新令牌
      await this.storeTokens(
        payload.userId, 
        newAccessToken, 
        newRefreshToken, 
        payload.platform
      );
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
      
    } catch (error) {
      this.logSecurityEvent('token_refresh_failed', { error: error.message });
      throw error;
    }
  }

  // 安全的Cookie设置
  setRefreshTokenCookie(token, options) {
    const cookieName = '__Host-refresh-token'; // __Host前缀增强安全性
    
    // 加密Cookie值
    const encryptedToken = this.encryptCookieValue(token);
    
    res.cookie(cookieName, encryptedToken, {
      ...options,
      path: '/', // __Host前缀要求
      secure: true, // __Host前缀要求
      httpOnly: true,
      sameSite: 'strict'
    });
  }
}
```

**实施检查清单**:
- [ ] 移除localStorage中的令牌存储
- [ ] 实现内存令牌管理
- [ ] 配置httpOnly Cookie
- [ ] 实现令牌轮换机制
- [ ] 添加令牌重放检测

### 1.3 CSP策略部署

**问题**: 缺乏内容安全策略，容易受到XSS攻击。

**解决方案**:

```javascript
// CSP中间件实现
const crypto = require('crypto');

class CSPManager {
  constructor() {
    this.currentPhase = process.env.CSP_PHASE || 'reportOnly';
  }

  // 生成CSP中间件
  generateCSPMiddleware() {
    return (req, res, next) => {
      // 生成随机nonce
      const nonce = crypto.randomBytes(16).toString('base64');
      res.locals.cspNonce = nonce;
      
      // 构建CSP策略
      const cspPolicy = this.buildCSPPolicy(nonce);
      
      // 设置CSP头
      const headerName = this.currentPhase === 'reportOnly' 
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';
      
      res.setHeader(headerName, cspPolicy);
      
      // 添加其他安全头
      this.setSecurityHeaders(res);
      
      next();
    };
  }

  buildCSPPolicy(nonce) {
    const policies = {
      reportOnly: {
        'default-src': "'self'",
        'script-src': `'self' 'nonce-${nonce}' https://trusted-cdn.com`,
        'style-src': `'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
        'img-src': "'self' data: https: blob:",
        'connect-src': "'self' wss://*.im-platform.com https://*.api.com",
        'frame-src': "'self' https://*.trusted-domain.com",
        'font-src': "'self' https://fonts.gstatic.com",
        'object-src': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'",
        'frame-ancestors': "'none'",
        'upgrade-insecure-requests': '',
        'report-uri': '/api/csp-violation-report'
      },
      
      restrictive: {
        'default-src': "'self'",
        'script-src': `'strict-dynamic' 'nonce-${nonce}'`,
        'style-src': `'self' 'nonce-${nonce}'`,
        'img-src': "'self' data:",
        'connect-src': "'self' wss://*.verified-im.com",
        'frame-src': "'none'",
        'font-src': "'self'",
        'object-src': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'",
        'frame-ancestors': "'none'",
        'upgrade-insecure-requests': ''
      }
    };

    const selectedPolicy = policies[this.currentPhase] || policies.reportOnly;
    
    return Object.entries(selectedPolicy)
      .map(([directive, value]) => `${directive} ${value}`)
      .join('; ');
  }

  setSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
}

// 使用CSP中间件
const cspManager = new CSPManager();
app.use(cspManager.generateCSPMiddleware());
```

**实施检查清单**:
- [ ] 部署报告模式CSP
- [ ] 收集违规报告
- [ ] 分析并调整策略
- [ ] 逐步加严CSP策略

## 2. 端到端加密实现

### 2.1 密钥交换与管理

```javascript
// ECDH密钥交换实现
class ECDHKeyExchange {
  constructor() {
    this.keyPairs = new Map();
  }

  // 生成密钥对
  async generateKeyPair(userId, platform) {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false, // 私钥不可导出
      ['deriveKey']
    );

    // 存储密钥对
    const keyId = `${userId}:${platform}`;
    this.keyPairs.set(keyId, keyPair);

    // 返回公钥用于交换
    const publicKeyJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    
    return {
      keyId: keyId,
      publicKey: publicKeyJWK,
      timestamp: Date.now()
    };
  }

  // 派生共享密钥
  async deriveSharedKey(myKeyId, theirPublicKeyJWK) {
    const myKeyPair = this.keyPairs.get(myKeyId);
    if (!myKeyPair) {
      throw new Error('Key pair not found');
    }

    // 导入对方公钥
    const theirPublicKey = await crypto.subtle.importKey(
      'jwk',
      theirPublicKeyJWK,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      []
    );

    // 派生共享密钥
    const sharedKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: theirPublicKey
      },
      myKeyPair.privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // 密钥不可导出
      ['encrypt', 'decrypt']
    );

    return sharedKey;
  }
}
```

### 2.2 消息加密与完整性保护

```javascript
// 端到端消息加密
class E2EMessageCrypto {
  constructor() {
    this.keyExchange = new ECDHKeyExchange();
    this.sessionKeys = new Map();
  }

  // 建立加密会话
  async establishSession(fromUser, toUser, fromPlatform, toPlatform) {
    // 生成发送方密钥对
    const senderKeyInfo = await this.keyExchange.generateKeyPair(fromUser, fromPlatform);
    
    // 获取接收方公钥(通过安全通道)
    const receiverPublicKey = await this.getReceiverPublicKey(toUser, toPlatform);
    
    // 派生会话密钥
    const sessionKey = await this.keyExchange.deriveSharedKey(
      senderKeyInfo.keyId,
      receiverPublicKey
    );

    const sessionId = `${fromUser}:${fromPlatform}->${toUser}:${toPlatform}`;
    this.sessionKeys.set(sessionId, sessionKey);

    return sessionId;
  }

  // 加密消息
  async encryptMessage(sessionId, message) {
    const sessionKey = this.sessionKeys.get(sessionId);
    if (!sessionKey) {
      throw new Error('Session not established');
    }

    // 生成随机IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 编码消息
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(JSON.stringify(message));

    // AES-GCM加密
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      sessionKey,
      messageBuffer
    );

    // 组合加密数据
    const encryptedData = {
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(encryptedBuffer)),
      timestamp: Date.now(),
      sessionId: sessionId
    };

    // 生成消息完整性校验
    const hmac = await this.generateHMAC(encryptedData);
    encryptedData.hmac = hmac;

    return encryptedData;
  }

  // 解密消息
  async decryptMessage(encryptedData) {
    // 验证消息完整性
    const isValid = await this.verifyHMAC(encryptedData);
    if (!isValid) {
      throw new SecurityError('Message integrity check failed');
    }

    const sessionKey = this.sessionKeys.get(encryptedData.sessionId);
    if (!sessionKey) {
      throw new Error('Session key not found');
    }

    // 解密
    const ciphertextBuffer = new Uint8Array(encryptedData.ciphertext);
    const iv = new Uint8Array(encryptedData.iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      sessionKey,
      ciphertextBuffer
    );

    // 解码消息
    const decoder = new TextDecoder();
    const messageString = decoder.decode(decryptedBuffer);
    
    return JSON.parse(messageString);
  }

  // 生成HMAC
  async generateHMAC(data) {
    const key = await crypto.subtle.generateKey(
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    return Array.from(new Uint8Array(signature));
  }

  // 验证HMAC
  async verifyHMAC(data) {
    const { hmac, ...dataToVerify } = data;
    const expectedHMAC = await this.generateHMAC(dataToVerify);
    
    // 常数时间比较
    return this.constantTimeCompare(hmac, expectedHMAC);
  }

  constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    
    return result === 0;
  }
}
```

## 3. 零信任访问控制

### 3.1 多因素认证实现

```javascript
// 多因素认证管理器
class MFAManager {
  constructor() {
    this.totpService = new TOTPService();
    this.smsService = new SMSService();
    this.behaviorAnalyzer = new BehaviorAnalyzer();
  }

  // 评估认证要求
  async evaluateAuthRequirements(userId, loginContext) {
    const riskScore = await this.calculateRiskScore(userId, loginContext);
    
    const authRequirements = {
      password: true, // 总是需要密码
      totp: riskScore > 0.3,
      sms: riskScore > 0.6,
      biometric: riskScore > 0.8,
      adminApproval: riskScore > 0.9
    };

    return authRequirements;
  }

  // 计算风险评分
  async calculateRiskScore(userId, context) {
    const riskFactors = await Promise.all([
      this.assessLocationRisk(userId, context.location),
      this.assessDeviceRisk(userId, context.device),
      this.assessTimeRisk(userId, context.timestamp),
      this.assessBehaviorRisk(userId, context.behavior)
    ]);

    // 加权平均风险评分
    const weights = [0.3, 0.3, 0.2, 0.2];
    const totalRisk = riskFactors.reduce((sum, risk, index) => 
      sum + risk * weights[index], 0
    );

    return Math.min(totalRisk, 1.0);
  }

  // 位置风险评估
  async assessLocationRisk(userId, location) {
    const userProfile = await this.getUserProfile(userId);
    const knownLocations = userProfile.knownLocations || [];
    
    // 检查IP地址是否在已知位置范围内
    const isKnownLocation = knownLocations.some(known => 
      this.isLocationMatch(location, known)
    );

    if (isKnownLocation) {
      return 0.1; // 低风险
    }

    // 检查是否为高风险地区
    const isHighRiskRegion = await this.checkHighRiskRegions(location);
    if (isHighRiskRegion) {
      return 0.9; // 高风险
    }

    return 0.5; // 中等风险
  }

  // 设备风险评估
  async assessDeviceRisk(userId, deviceFingerprint) {
    const userDevices = await this.getUserDevices(userId);
    
    // 检查是否为已知设备
    const isKnownDevice = userDevices.some(device => 
      device.fingerprint === deviceFingerprint
    );

    if (isKnownDevice) {
      return 0.1;
    }

    // 检查设备安全特征
    const deviceSecurityScore = this.analyzeDeviceSecurity(deviceFingerprint);
    return 1.0 - deviceSecurityScore;
  }

  // 执行MFA验证
  async verifyMFA(userId, factors, requirements) {
    const results = {};

    if (requirements.password) {
      results.password = await this.verifyPassword(userId, factors.password);
    }

    if (requirements.totp) {
      results.totp = await this.totpService.verify(userId, factors.totp);
    }

    if (requirements.sms) {
      results.sms = await this.smsService.verify(userId, factors.sms);
    }

    // 计算通过的认证因素数量
    const passedFactors = Object.values(results).filter(Boolean).length;
    const requiredFactors = Object.values(requirements).filter(Boolean).length;

    // 至少需要通过50%的认证因素
    const isValid = passedFactors >= Math.ceil(requiredFactors * 0.5);

    return {
      valid: isValid,
      results: results,
      score: passedFactors / requiredFactors
    };
  }
}
```

### 3.2 自适应访问控制

```javascript
// 自适应访问控制
class AdaptiveAccessControl {
  constructor() {
    this.mfaManager = new MFAManager();
    this.policyEngine = new PolicyEngine();
    this.sessionManager = new SessionManager();
  }

  // 访问决策入口
  async makeAccessDecision(request) {
    try {
      // 1. 基础认证检查
      const authResult = await this.verifyAuthentication(request);
      if (!authResult.valid) {
        return this.denyAccess('Authentication failed', authResult.reason);
      }

      // 2. 风险评估
      const riskAssessment = await this.assessRisk(request, authResult.user);
      
      // 3. 策略评估
      const policyDecision = await this.evaluatePolicy(request, riskAssessment);
      
      // 4. 自适应控制
      return await this.applyAdaptiveControls(request, riskAssessment, policyDecision);
      
    } catch (error) {
      this.logSecurityEvent('access_decision_error', { 
        error: error.message, 
        request: this.sanitizeRequest(request) 
      });
      
      return this.denyAccess('Internal error', 'system_error');
    }
  }

  // 应用自适应控制
  async applyAdaptiveControls(request, riskAssessment, policyDecision) {
    const riskLevel = riskAssessment.level;
    
    switch (riskLevel) {
      case 'LOW':
        return this.allowAccess(request, { restrictions: [] });
        
      case 'MEDIUM':
        return this.allowWithRestrictions(request, {
          sessionTimeout: 30 * 60 * 1000, // 30分钟
          requireReauth: ['sensitive_operations'],
          monitoring: 'enhanced'
        });
        
      case 'HIGH':
        // 需要额外认证
        const mfaRequired = await this.requireAdditionalAuth(request, riskAssessment);
        if (!mfaRequired.satisfied) {
          return this.challengeForMFA(mfaRequired.methods);
        }
        
        return this.allowWithRestrictions(request, {
          sessionTimeout: 15 * 60 * 1000, // 15分钟
          requireReauth: ['all_operations'],
          monitoring: 'continuous',
          restrictions: ['no_data_export', 'admin_approval_required']
        });
        
      case 'CRITICAL':
        // 阻止访问或需要管理员审批
        await this.notifySecurityTeam(request, riskAssessment);
        return this.denyAccess('High risk detected', 'risk_threshold_exceeded');
        
      default:
        return this.denyAccess('Unknown risk level', 'invalid_assessment');
    }
  }

  // 持续风险监控
  async continuousRiskMonitoring(sessionId) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) return;

    setInterval(async () => {
      const currentActivity = await this.getCurrentActivity(sessionId);
      const updatedRisk = await this.assessRisk(currentActivity, session.user);
      
      if (updatedRisk.level === 'CRITICAL') {
        await this.terminateSession(sessionId, 'Risk level escalated');
      } else if (updatedRisk.level === 'HIGH') {
        await this.requireReAuthentication(sessionId);
      }
      
    }, 5 * 60 * 1000); // 每5分钟检查一次
  }
}
```

## 4. 合规实施

### 4.1 GDPR权利实现

```javascript
// GDPR数据主体权利实现
class GDPRRightsManager {
  constructor() {
    this.dataProcessor = new DataProcessor();
    this.consentManager = new ConsentManager();
    this.auditLogger = new AuditLogger();
  }

  // 处理访问权请求
  async handleAccessRequest(userId, requestDetails) {
    try {
      // 验证请求者身份
      const isVerified = await this.verifyDataSubjectIdentity(userId, requestDetails);
      if (!isVerified) {
        throw new Error('Identity verification failed');
      }

      // 收集个人数据
      const personalData = await this.collectPersonalData(userId);
      
      // 生成可移植格式的数据
      const exportData = {
        request: {
          id: generateUUID(),
          timestamp: new Date().toISOString(),
          type: 'access_request'
        },
        
        personal_data: {
          profile: personalData.profile,
          messages: personalData.messages.map(this.anonymizeThirdPartyData),
          preferences: personalData.preferences,
          activity_log: personalData.activities
        },
        
        processing_info: {
          purposes: await this.getProcessingPurposes(userId),
          legal_bases: await this.getLegalBases(userId),
          recipients: await this.getDataRecipients(userId),
          retention_periods: await this.getRetentionPeriods(userId)
        },
        
        metadata: {
          export_date: new Date().toISOString(),
          data_controller: 'IM Integration Platform',
          contact: 'privacy@company.com'
        }
      };

      // 审计日志
      await this.auditLogger.log('gdpr_access_request', {
        userId,
        timestamp: new Date().toISOString(),
        dataCategories: Object.keys(personalData)
      });

      return exportData;
      
    } catch (error) {
      await this.auditLogger.log('gdpr_access_request_failed', {
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // 处理删除权("被遗忘权")请求
  async handleErasureRequest(userId, requestDetails) {
    const erasureProcess = {
      requestId: generateUUID(),
      userId: userId,
      timestamp: new Date().toISOString(),
      status: 'processing'
    };

    try {
      // 评估删除范围
      const erasureScope = await this.evaluateErasureScope(userId, requestDetails);
      
      // 检查删除例外
      const exceptions = await this.checkErasureExceptions(userId, erasureScope);
      
      const deletionPlan = {
        immediate_deletion: [],
        scheduled_deletion: [],
        retention_exceptions: [],
        third_party_notifications: []
      };

      for (const dataType of erasureScope.dataTypes) {
        const hasException = exceptions.find(ex => ex.dataType === dataType);
        
        if (hasException) {
          deletionPlan.retention_exceptions.push({
            dataType,
            reason: hasException.reason,
            retentionEnd: hasException.retentionEnd
          });
        } else {
          deletionPlan.immediate_deletion.push(dataType);
        }
      }

      // 执行删除
      const deletionResults = await this.executeDeletion(userId, deletionPlan);
      
      // 通知第三方
      if (erasureScope.sharedData.length > 0) {
        await this.notifyThirdParties(userId, erasureScope.sharedData);
      }

      // 更新处理状态
      erasureProcess.status = 'completed';
      erasureProcess.results = deletionResults;
      
      return erasureProcess;
      
    } catch (error) {
      erasureProcess.status = 'failed';
      erasureProcess.error = error.message;
      
      await this.auditLogger.log('gdpr_erasure_failed', erasureProcess);
      throw error;
    }
  }

  // 执行技术删除
  async executeTechnicalDeletion(userId, dataTypes) {
    const operations = [];

    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'messages':
          // 1. 软删除标记
          operations.push(this.markMessagesAsDeleted(userId));
          // 2. 清理缓存
          operations.push(this.clearMessageCache(userId));
          // 3. 覆写数据库记录
          operations.push(this.overwriteMessageData(userId));
          // 4. 清理备份
          operations.push(this.scheduleBackupCleaning(userId, dataType));
          break;

        case 'profile':
          operations.push(this.deleteUserProfile(userId));
          operations.push(this.anonymizeProfileReferences(userId));
          break;

        case 'logs':
          // 日志匿名化而非删除(保持审计完整性)
          operations.push(this.anonymizeLogEntries(userId));
          break;

        case 'analytics':
          operations.push(this.removeAnalyticsData(userId));
          operations.push(this.updateAggregatedMetrics(userId));
          break;
      }
    }

    // 并行执行所有删除操作
    const results = await Promise.allSettled(operations);
    
    // 记录失败的操作
    const failures = results
      .map((result, index) => ({ result, operation: operations[index] }))
      .filter(({ result }) => result.status === 'rejected');

    if (failures.length > 0) {
      throw new Error(`Deletion failed for ${failures.length} operations`);
    }

    return {
      deleted_types: dataTypes,
      operations_count: operations.length,
      timestamp: new Date().toISOString()
    };
  }
}
```

### 4.2 数据分类分级实现

```javascript
// 数据分类分级管理器
class DataClassificationManager {
  constructor() {
    this.classificationRules = new Map();
    this.initializeClassificationRules();
  }

  initializeClassificationRules() {
    // 敏感度等级定义
    this.classificationRules.set('sensitivity', {
      'HIGHLY_SENSITIVE': {
        examples: ['身份证号', '银行账号', '生物特征', '密码'],
        processing: 'local_only',
        encryption: 'required',
        access: 'restricted',
        retention: 'minimal',
        audit: 'detailed'
      },
      'MODERATELY_SENSITIVE': {
        examples: ['聊天内容', '联系人信息', '位置数据', '使用偏好'],
        processing: 'local_preferred',
        encryption: 'required',
        access: 'controlled',
        retention: 'limited',
        audit: 'standard'
      },
      'LOW_SENSITIVITY': {
        examples: ['系统日志', '性能指标', '聚合统计'],
        processing: 'cloud_allowed',
        encryption: 'recommended',
        access: 'normal',
        retention: 'standard',
        audit: 'basic'
      }
    });

    // 数据类别定义
    this.classificationRules.set('category', {
      'PERSONAL_IDENTIFIABLE': ['name', 'email', 'phone', 'address'],
      'COMMUNICATION_CONTENT': ['message_text', 'media_files', 'voice_notes'],
      'BEHAVIORAL_DATA': ['login_times', 'feature_usage', 'preferences'],
      'TECHNICAL_DATA': ['ip_address', 'device_info', 'session_data'],
      'METADATA': ['timestamps', 'message_counts', 'platform_info']
    });
  }

  // 自动数据分类
  async classifyData(data, context = {}) {
    const classification = {
      sensitivity: 'LOW_SENSITIVITY',
      category: [],
      protectionLevel: 1,
      processingRestrictions: [],
      retentionPeriod: '1year',
      encryptionRequired: false
    };

    // 敏感度分析
    classification.sensitivity = await this.analyzeSensitivity(data);
    
    // 类别识别
    classification.category = await this.identifyCategories(data);
    
    // 保护级别计算
    classification.protectionLevel = this.calculateProtectionLevel(
      classification.sensitivity,
      classification.category
    );
    
    // 处理限制
    classification.processingRestrictions = this.determineProcessingRestrictions(
      classification.sensitivity,
      context
    );
    
    // 保留期限
    classification.retentionPeriod = this.determineRetentionPeriod(
      classification.category,
      context
    );

    return classification;
  }

  // 敏感度分析
  async analyzeSensitivity(data) {
    const sensitivePatterns = {
      'HIGHLY_SENSITIVE': [
        /\b\d{15,19}\b/,                    // 银行卡号
        /\b\d{18}\b|\b\d{17}[xX]\b/,        // 身份证号
        /\b\d{11}\b/,                       // 手机号
        /password|pwd|秘密|密码/i,           // 密码相关
        /token|secret|key/i                 // 令牌相关
      ],
      'MODERATELY_SENSITIVE': [
        /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,    // 邮箱
        /\b(?:\d{1,3}\.){3}\d{1,3}\b/,      // IP地址
        /位置|地址|坐标/,                    // 位置信息
        /聊天|消息|对话/                     // 通信内容
      ]
    };

    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // 检查高敏感度
    for (const pattern of sensitivePatterns.HIGHLY_SENSITIVE) {
      if (pattern.test(dataString)) {
        return 'HIGHLY_SENSITIVE';
      }
    }
    
    // 检查中敏感度
    for (const pattern of sensitivePatterns.MODERATELY_SENSITIVE) {
      if (pattern.test(dataString)) {
        return 'MODERATELY_SENSITIVE';
      }
    }
    
    return 'LOW_SENSITIVITY';
  }

  // 应用数据保护措施
  async applyProtectionMeasures(data, classification) {
    const protectionPlan = {
      encryption: null,
      storage: null,
      access_control: null,
      audit: null,
      retention: null
    };

    // 根据分类应用保护措施
    switch (classification.sensitivity) {
      case 'HIGHLY_SENSITIVE':
        protectionPlan.encryption = await this.applyStrongEncryption(data);
        protectionPlan.storage = 'local_only';
        protectionPlan.access_control = 'strict';
        protectionPlan.audit = 'detailed';
        protectionPlan.retention = 'minimal';
        break;

      case 'MODERATELY_SENSITIVE':
        protectionPlan.encryption = await this.applyStandardEncryption(data);
        protectionPlan.storage = 'local_preferred';
        protectionPlan.access_control = 'controlled';
        protectionPlan.audit = 'standard';
        protectionPlan.retention = 'limited';
        break;

      case 'LOW_SENSITIVITY':
        protectionPlan.encryption = await this.applyBasicEncryption(data);
        protectionPlan.storage = 'cloud_allowed';
        protectionPlan.access_control = 'normal';
        protectionPlan.audit = 'basic';
        protectionPlan.retention = 'standard';
        break;
    }

    return protectionPlan;
  }
}
```

## 5. 监控与告警

### 5.1 安全事件监控

```javascript
// 安全事件监控系统
class SecurityEventMonitor {
  constructor() {
    this.eventQueue = [];
    this.alertThresholds = new Map();
    this.setupAlertRules();
  }

  setupAlertRules() {
    this.alertThresholds.set('failed_login', { threshold: 5, window: 300000 }); // 5次/5分钟
    this.alertThresholds.set('cors_blocked', { threshold: 10, window: 60000 });  // 10次/1分钟
    this.alertThresholds.set('token_replay', { threshold: 1, window: 0 });       // 立即告警
    this.alertThresholds.set('csp_violation', { threshold: 20, window: 300000 }); // 20次/5分钟
  }

  // 记录安全事件
  async recordSecurityEvent(eventType, details) {
    const event = {
      id: generateUUID(),
      type: eventType,
      timestamp: new Date().toISOString(),
      details: details,
      severity: this.calculateSeverity(eventType, details)
    };

    // 添加到事件队列
    this.eventQueue.push(event);
    
    // 检查告警阈值
    await this.checkAlertThresholds(eventType);
    
    // 持久化存储
    await this.persistEvent(event);
    
    // 实时流处理
    this.processEventStream(event);
    
    return event;
  }

  // 检查告警阈值
  async checkAlertThresholds(eventType) {
    const rule = this.alertThresholds.get(eventType);
    if (!rule) return;

    const now = Date.now();
    const windowStart = now - rule.window;
    
    const recentEvents = this.eventQueue.filter(event => 
      event.type === eventType && 
      new Date(event.timestamp).getTime() > windowStart
    );

    if (recentEvents.length >= rule.threshold) {
      await this.triggerAlert(eventType, recentEvents);
    }
  }

  // 触发安全告警
  async triggerAlert(eventType, events) {
    const alert = {
      id: generateUUID(),
      type: eventType,
      severity: this.determineAlertSeverity(eventType, events),
      eventCount: events.length,
      timeWindow: this.formatTimeWindow(events),
      details: this.aggregateEventDetails(events),
      timestamp: new Date().toISOString()
    };

    // 发送告警通知
    await Promise.all([
      this.sendEmailAlert(alert),
      this.sendSlackAlert(alert),
      this.updateSecurityDashboard(alert),
      this.logAlert(alert)
    ]);

    // 自动响应措施
    await this.executeAutomaticResponse(alert);
  }

  // 自动响应措施
  async executeAutomaticResponse(alert) {
    const responses = {
      'failed_login': async () => {
        // 临时锁定账户
        const userId = alert.details.userId;
        await this.temporaryLockAccount(userId, 300000); // 5分钟
      },
      
      'token_replay': async () => {
        // 立即撤销所有用户令牌
        const userId = alert.details.userId;
        await this.revokeAllUserTokens(userId);
        await this.forceUserLogout(userId);
      },
      
      'cors_blocked': async () => {
        // 加强CORS检查
        await this.enableStrictCORSMode();
        // 分析攻击源
        await this.analyzeAttackSource(alert.details);
      }
    };

    const responseAction = responses[alert.type];
    if (responseAction) {
      await responseAction();
    }
  }
}
```

## 6. 部署清单

### 6.1 生产环境部署检查清单

**基础安全配置**:
- [ ] CORS配置已修复，移除通配符
- [ ] CSP策略已部署，至少报告模式
- [ ] 所有安全头已配置
- [ ] TLS 1.3已启用，HTTP已重定向至HTTPS

**认证与授权**:
- [ ] JWT密钥已轮换，使用ES256算法
- [ ] 令牌存储已迁移到安全方案
- [ ] MFA已启用高风险操作
- [ ] 会话管理已加强

**数据保护**:
- [ ] 数据分类分级已实施
- [ ] 敏感数据加密已启用
- [ ] 数据备份已加密
- [ ] 数据保留策略已配置

**监控与响应**:
- [ ] 安全事件监控已部署
- [ ] 告警规则已配置
- [ ] 日志聚合已启用
- [ ] 事件响应流程已建立

**合规要求**:
- [ ] GDPR权利机制已实现
- [ ] 数据处理记录已建立
- [ ] 隐私声明已更新
- [ ] 同意管理系统已部署

### 6.2 安全测试验证

```bash
#!/bin/bash
# 安全配置验证脚本

echo "=== 安全配置验证 ==="

# 检查CORS配置
echo "检查CORS配置..."
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS https://your-api.com/api/test

# 检查CSP策略
echo "检查CSP策略..."
curl -I https://your-api.com | grep -i content-security-policy

# 检查安全头
echo "检查安全头..."
curl -I https://your-api.com | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)"

# 检查TLS配置
echo "检查TLS配置..."
openssl s_client -connect your-api.com:443 -tls1_3 -quiet

# 检查证书有效性
echo "检查证书..."
openssl s_client -connect your-api.com:443 -servername your-api.com < /dev/null 2>/dev/null | \
openssl x509 -noout -dates

echo "=== 验证完成 ==="
```

通过本实施指南，开发团队可以系统性地修复安全漏洞，建立完善的安全防护体系，确保IM集成系统的安全性和合规性。建议按照优先级逐步实施，重点关注高风险项目的立即修复。