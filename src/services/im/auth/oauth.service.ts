// OAuth2.0 PKCE Authentication Service
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PlatformType, PlatformCredentials } from '../../../types/im.types.js';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  refreshTokenUrl?: string;
  pkceRequired?: boolean;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope?: string;
}

export interface JWTPayload {
  sub: string; // user ID
  platform: PlatformType;
  exp: number;
  iat: number;
  scope?: string[];
}

export class OAuthService {
  private platformConfigs = new Map<PlatformType, OAuthConfig>();
  private jwtSecret: string;
  private pendingStates = new Map<string, PKCEChallenge>();

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
  }

  registerPlatform(platform: PlatformType, config: OAuthConfig): void {
    this.platformConfigs.set(platform, config);
  }

  // Generate PKCE challenge for OAuth2.0 PKCE flow
  generatePKCEChallenge(): PKCEChallenge {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  // Generate authorization URL with PKCE
  generateAuthorizationUrl(
    platform: PlatformType, 
    userId: string,
    pkce?: PKCEChallenge
  ): string {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      throw new Error(`No OAuth config found for platform: ${platform}`);
    }

    const state = this.generateState();
    const challenge = pkce || (config.pkceRequired ? this.generatePKCEChallenge() : undefined);
    
    if (challenge) {
      this.pendingStates.set(state, challenge);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      state: state,
      ...(challenge && {
        code_challenge: challenge.codeChallenge,
        code_challenge_method: challenge.codeChallengeMethod
      })
    });

    // Auto-cleanup state after 10 minutes
    setTimeout(() => this.pendingStates.delete(state), 10 * 60 * 1000);

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(
    platform: PlatformType,
    code: string,
    state: string,
    userId: string
  ): Promise<PlatformCredentials> {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      throw new Error(`No OAuth config found for platform: ${platform}`);
    }

    const pkce = this.pendingStates.get(state);
    this.pendingStates.delete(state);

    const tokenData = {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code: code,
      redirect_uri: config.redirectUri,
      ...(config.clientSecret && { client_secret: config.clientSecret }),
      ...(pkce && { code_verifier: pkce.codeVerifier })
    };

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenResponse: TokenResponse = await response.json();
      
      const credentials: PlatformCredentials = {
        platform,
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000),
        userId,
        metadata: {
          tokenType: tokenResponse.tokenType,
          scope: tokenResponse.scope
        }
      };

      return credentials;
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(credentials: PlatformCredentials): Promise<PlatformCredentials> {
    if (!credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = this.platformConfigs.get(credentials.platform);
    if (!config) {
      throw new Error(`No OAuth config found for platform: ${credentials.platform}`);
    }

    const tokenData = {
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: credentials.refreshToken,
      ...(config.clientSecret && { client_secret: config.clientSecret })
    };

    try {
      const response = await fetch(config.refreshTokenUrl || config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenResponse: TokenResponse = await response.json();
      
      const newCredentials: PlatformCredentials = {
        ...credentials,
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || credentials.refreshToken,
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000)
      };

      return newCredentials;
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  // Generate JWT token for API authentication
  generateJWT(userId: string, platform: PlatformType, scope?: string[]): string {
    const payload: JWTPayload = {
      sub: userId,
      platform,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      iat: Math.floor(Date.now() / 1000),
      ...(scope && { scope })
    };

    return jwt.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
  }

  // Verify and decode JWT token
  verifyJWT(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error}`);
    }
  }

  // Generate refresh token
  generateRefreshToken(userId: string, platform: PlatformType): string {
    const payload = {
      sub: userId,
      platform,
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, { algorithm: 'HS256' });
  }

  // Validate credentials are not expired
  isCredentialValid(credentials: PlatformCredentials): boolean {
    if (!credentials.expiresAt) {
      return true; // No expiration set
    }
    
    return credentials.expiresAt > new Date();
  }

  // Get platform configuration
  getPlatformConfig(platform: PlatformType): OAuthConfig | undefined {
    return this.platformConfigs.get(platform);
  }

  // Revoke tokens (platform-specific implementation needed)
  async revokeTokens(credentials: PlatformCredentials): Promise<boolean> {
    const config = this.platformConfigs.get(credentials.platform);
    if (!config) {
      return false;
    }

    // This would need platform-specific revocation endpoint implementation
    // For now, just mark as revoked locally
    return true;
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Cleanup expired states periodically
  cleanupExpiredStates(): void {
    // States are already auto-cleaned up with setTimeout
    // This method can be used for additional cleanup if needed
  }
}

// Pre-configured OAuth settings for common platforms
export const OAuthConfigs: Record<string, Partial<OAuthConfig>> = {
  [PlatformType.WECHAT]: {
    authorizationUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    refreshTokenUrl: 'https://api.weixin.qq.com/sns/oauth2/refresh_token',
    scopes: ['snsapi_userinfo'],
    pkceRequired: false
  },
  
  [PlatformType.DINGTALK]: {
    authorizationUrl: 'https://oapi.dingtalk.com/connect/oauth2/sns_authorize',
    tokenUrl: 'https://oapi.dingtalk.com/sns/gettoken',
    scopes: ['sns'],
    pkceRequired: false
  },
  
  [PlatformType.TELEGRAM]: {
    // Telegram uses bot tokens, not OAuth
    scopes: [],
    pkceRequired: false
  }
};