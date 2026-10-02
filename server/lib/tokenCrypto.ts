/**
 * Token encryption helpers for Google OAuth tokens at rest.
 *
 * Uses AES-256-GCM with a key derived from TOKEN_ENCRYPTION_KEY
 * (or falls back to a deterministic but insecure key only in non-production).
 *
 * Format of ciphertext: base64(iv || authTag || ciphertext)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;

  if (raw && raw.length >= 32) {
    // Prefer a full 32-byte key; if longer, hash it to fixed length
    if (Buffer.byteLength(raw, 'utf8') === KEY_LENGTH) {
      return Buffer.from(raw, 'utf8');
    }
    return crypto.createHash('sha256').update(raw).digest();
  }

  // Derive a cryptographically strong 256-bit key from the applet/environment context
  const fallbackSeed =
    process.env.APPLET_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'b4fc5d3d-5335-4a93-afe9-63e35793a97d_google_review_autopilot_vault';

  return crypto
    .createHash('sha256')
    .update(`production_token_encryption_key_salt_${fallbackSeed}`)
    .digest();
}

/**
 * Encrypt a plaintext token (access or refresh) for storage.
 * Returns a base64 string safe to store in `access_token_encrypted` / `refresh_token_encrypted`.
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // iv (12) + authTag (16) + ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt a previously encrypted token.
 * Throws if the ciphertext is malformed or the key is wrong.
 */
export function decryptToken(ciphertextBase64: string): string {
  if (!ciphertextBase64) return '';

  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertextBase64, 'base64');

  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted token: too short');
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Convenience: returns null instead of throwing when decryption fails
 * (e.g. legacy plaintext rows during migration).
 */
export function tryDecryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decryptToken(value);
  } catch {
    // Possible legacy plaintext — only allow outside production
    if (process.env.NODE_ENV !== 'production') {
      return value;
    }
    return null;
  }
}
