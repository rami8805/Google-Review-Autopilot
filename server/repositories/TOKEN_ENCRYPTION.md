# Token Encryption Contract

## Required behavior

All Google OAuth access/refresh tokens MUST be encrypted with AES-256-GCM before
being written to `google_connections.access_token_encrypted` /
`refresh_token_encrypted`.

## Implementation

1. **Crypto**: `server/lib/tokenCrypto.ts` — `encryptToken` / `decryptToken` / `tryDecryptToken`
2. **Helpers**: `server/lib/googleTokenHelpers.ts` — `ensureEncryptedToken` / `looksLikePlaintextToken`
3. **Call sites**: Always call `ensureEncryptedToken(plain)` before
   `GoogleConnectionRepository.updateTokens` or `upsert` when supplying tokens.

## Environment

```
TOKEN_ENCRYPTION_KEY=<at least 32 characters, stored in Secret Manager in production>
```

## Example

```ts
import { ensureEncryptedToken } from '../lib/googleTokenHelpers.ts';

await googleRepo.updateTokens(
  tenantId,
  connectionId,
  ensureEncryptedToken(accessToken)!,
  ensureEncryptedToken(refreshToken) || undefined,
  expiryIso
);
```

## Recovery note (2026-10-01)

If `postgresRepositories.ts` was briefly corrupted during a bulk push, restore from main:

```bash
git checkout main -- server/repositories/postgresRepositories.ts
# then re-apply encryptToken inside updateTokens as documented above
```
