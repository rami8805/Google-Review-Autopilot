import { TenantGuard } from '../../server/services/data/tenantGuard';
import { ForbiddenError, UnauthorizedError } from '../../server/services/data/errors';
import type { TenantContext } from '../../shared/types/database';

export function runUnauthorizedAccessTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // 1. Unauthenticated context throws UnauthorizedError
  try {
    TenantGuard.assertTenantAccess(null as any, 'tenant_123', 'test op');
    assert(false, 'Null context should fail authentication');
  } catch (err) {
    assert(err instanceof UnauthorizedError, 'Null context throws UnauthorizedError');
  }

  // 2. Missing saasCustomerId in non-admin context throws UnauthorizedError
  try {
    TenantGuard.assertTenantAccess({ saasCustomerId: '', role: 'MEMBER' }, 'tenant_123', 'test op');
    assert(false, 'Empty tenant context should fail');
  } catch (err) {
    assert(err instanceof UnauthorizedError, 'Empty tenant ID throws UnauthorizedError');
  }

  // 3. MEMBER role attempting OWNER-only operation throws ForbiddenError
  const memberContext: TenantContext = { saasCustomerId: 'tenant_123', role: 'MEMBER' };
  try {
    TenantGuard.assertRoleAccess(memberContext, ['OWNER'], 'manage billing payment methods');
    assert(false, 'MEMBER should not be able to execute OWNER-only actions');
  } catch (err) {
    assert(err instanceof ForbiddenError, 'MEMBER attempting OWNER action throws ForbiddenError');
  }

  // 4. ADMIN role allowed when ADMIN is included
  let adminAllowed = false;
  try {
    TenantGuard.assertRoleAccess(
      { saasCustomerId: 'tenant_123', role: 'ADMIN' },
      ['OWNER', 'ADMIN'],
      'update automation rules'
    );
    adminAllowed = true;
  } catch {
    adminAllowed = false;
  }
  assert(adminAllowed, 'ADMIN role is permitted for operations requiring OWNER or ADMIN');

  return { passed, failed, results };
}
