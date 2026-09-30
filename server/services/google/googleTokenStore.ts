/**
 * Server-Side Secure Token Store & OAuth State Manager
 *
 * Rules:
 * 1. Tokens remain strictly server-side. Never exposed in API responses or logs.
 * 2. Tokens are stored encrypted (AES-256-GCM) with key derived from server secrets.
 * 3. OAuth state is cryptographically signed (HMAC-SHA256) with nonce and TTL to prevent CSRF.
 * 4. Token logging is prohibited: all logging must pass through sanitizeForLogging().
 */

import crypto from 'crypto';
import type { GoogleTokens, StoredGoogleCredential } from './types';

// Encryption key derivation
const MASTER_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  'google-review-autopilot-internal-server-secret-key-32b';

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(MASTER_SECRET).digest();
}

/**
 * Encrypt a plain token string using AES-256-GCM.
 */
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted (hex encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a stored encrypted token string.
 */
export function decryptToken(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Redacts tokens, keys, and authorization headers from logging outputs.
 */
export function sanitizeForLogging(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('cookie') ||
      lowerKey.includes('password')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface OAuthStatePayload {
  saasCustomerId: string;
  nonce: string;
  expiresAt: number; // TTL (ms)
  metadata?: Record<string, string>;
}

/**
 * OAuth State Manager: creates and validates anti-CSRF signed state tokens.
 */
export class OAuthStateManager {
  private static STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  static generateState(saasCustomerId: string, metadata?: Record<string, string>): string {
    const payload: OAuthStatePayload = {
      saasCustomerId,
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + this.STATE_TTL_MS,
      metadata,
    };

    const payloadJson = JSON.stringify(payload);
    const encodedPayload = Buffer.from(payloadJson).toString('base64url');
    const signature = crypto
      .createHmac('sha256', MASTER_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  static validateState(stateString: string, expectedSaasCustomerId?: string): OAuthStatePayload {
    if (!stateString || !stateString.includes('.')) {
      throw new Error('Malformed OAuth state parameter');
    }

    const [encodedPayload, signature] = stateString.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', MASTER_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('OAuth state signature mismatch (possible CSRF attempt)');
    }

    let payload: OAuthStatePayload;
    try {
      const json = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      payload = JSON.parse(json);
    } catch {
      throw new Error('Invalid OAuth state payload format');
    }

    if (Date.now() > payload.expiresAt) {
      throw new Error('OAuth state expired. Please re-initiate connection.');
    }

    if (expectedSaasCustomerId && payload.saasCustomerId !== expectedSaasCustomerId) {
      throw new Error('OAuth state tenant mismatch (unauthorized cross-tenant callback)');
    }

    return payload;
  }
}

/**
 * In-Memory Secure Token Storage repository (keyed by saasCustomerId)
 */
class GoogleTokenStore {
  private credentials = new Map<string, StoredGoogleCredential>();

  saveTokens(params: {
    saasCustomerId: string;
    tokens: GoogleTokens;
    scopes?: string[];
    googleAccountId?: string;
    googleLocationName?: string;
  }): void {
    const { saasCustomerId, tokens, scopes, googleAccountId, googleLocationName } = params;
    const expiresAt = tokens.receivedAt + tokens.expiresIn * 1000;

    const existing = this.credentials.get(saasCustomerId);

    const encryptedAccessToken = encryptToken(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? encryptToken(tokens.refreshToken)
      : existing?.encryptedRefreshToken;

    this.credentials.set(saasCustomerId, {
      saasCustomerId,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      scopes: scopes || (tokens.scope ? tokens.scope.split(' ') : ['https://www.googleapis.com/auth/business.manage']),
      googleAccountId: googleAccountId || existing?.googleAccountId,
      googleLocationName: googleLocationName || existing?.googleLocationName,
      updatedAt: new Date().toISOString(),
    });
  }

  getCredentials(saasCustomerId: string): StoredGoogleCredential | null {
    return this.credentials.get(saasCustomerId) || null;
  }

  getDecryptedAccessToken(saasCustomerId: string): { accessToken: string; isExpired: boolean } | null {
    const cred = this.credentials.get(saasCustomerId);
    if (!cred) return null;

    try {
      const accessToken = decryptToken(cred.encryptedAccessToken);
      const isExpired = Date.now() >= cred.expiresAt - 60000; // 60s buffer
      return { accessToken, isExpired };
    } catch {
      return null;
    }
  }

  getDecryptedRefreshToken(saasCustomerId: string): string | null {
    const cred = this.credentials.get(saasCustomerId);
    if (!cred || !cred.encryptedRefreshToken) return null;

    try {
      return decryptToken(cred.encryptedRefreshToken);
    } catch {
      return null;
    }
  }

  removeCredentials(saasCustomerId: string): void {
    this.credentials.delete(saasCustomerId);
  }

  hasCredentials(saasCustomerId: string): boolean {
    return this.credentials.has(saasCustomerId);
  }

  clearAll(): void {
    this.credentials.clear();
  }
}

export const googleTokenStore = new GoogleTokenStore();
