/**
 * Helpers to encrypt/decrypt Google OAuth tokens before DB writes.
 * Use these at every boundary that persists access/refresh tokens.
 */
import { encryptToken, tryDecryptToken } from './tokenCrypto.ts';

/** Google access tokens typically start with ya29.; refresh with 1// */
export function looksLikePlaintextToken(value: string | null | undefined): boolean {
  if (!value) return false;
  return (
    value.startsWith('ya29.') ||
    value.startsWith('1//') ||
    value.startsWith('mock_') ||
    value.startsWith('ya29.mock') ||
    value.length < 40
  );
}

/** Encrypt if plaintext; pass through if already ciphertext */
export function ensureEncryptedToken(value: string | null | undefined): string | null {
  if (!value) return null;
  if (looksLikePlaintextToken(value)) {
    return encryptToken(value);
  }
  return value;
}

export function decryptStoredToken(value: string | null | undefined): string | null {
  return tryDecryptToken(value);
}

export { encryptToken, tryDecryptToken };
