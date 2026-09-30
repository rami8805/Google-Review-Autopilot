/**
 * SaaS Authentication & RBAC Test Suite
 *
 * Verifies:
 * - signup (customer, owner user, business, trial creation)
 * - login (credential verification, password hashing, JWT generation)
 * - tenant isolation (prevents SaaSCustomer A accessing SaaSCustomer B)
 * - role access (RBAC enforcement for CUSTOMER_OWNER, CUSTOMER_MEMBER, PLATFORM_ADMIN)
 */

import { AuthService } from '../../server/services/auth/authService';
import { requireRole, tenantGuard } from '../../server/services/auth/authMiddleware';

export async function runAuthTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  const auth = new AuthService('test_secret_for_auth_verification_key_32_bytes!');

  // Test 1: Signup
  try {
    const signupRes = await auth.signup({
      email: 'dr.john@exampleclinic.com',
      password: 'SecurePassword123!',
      name: 'Dr. John Doe',
      businessName: 'Example Clinic',
    });

    assert(
      !!signupRes.token && signupRes.token.split('.').length === 3,
      'Signup generates valid 3-part JWT token'
    );
    assert(
      signupRes.user.role === 'CUSTOMER_OWNER',
      'Signup creates user with CUSTOMER_OWNER role',
      `Got ${signupRes.user.role}`
    );
    assert(
      signupRes.saasCustomer.name === 'Example Clinic',
      'Signup creates SaaSCustomer tenant with correct name'
    );
    assert(
      signupRes.saasCustomer.status === 'TRIAL',
      'Signup initializes SaaSCustomer in TRIAL status'
    );
    assert(
      signupRes.business.name === 'Example Clinic',
      'Signup creates associated Business for SaaSCustomer'
    );
    assert(
      !(signupRes.user as any).passwordHash,
      'Signup does not leak password hash in public User object'
    );
  } catch (err: any) {
    assert(false, 'Signup flow executed successfully', err.message);
  }

  // Test 2: Login with valid credentials
  try {
    const loginRes = await auth.login({
      email: 'dr.john@exampleclinic.com',
      password: 'SecurePassword123!',
    });

    assert(
      loginRes.user.email === 'dr.john@exampleclinic.com',
      'Login succeeds with valid credentials'
    );
    assert(
      !!loginRes.token,
      'Login returns a valid session token'
    );

    const verified = auth.verifyToken(loginRes.token);
    assert(
      verified?.email === 'dr.john@exampleclinic.com',
      'Session token payload contains correct email'
    );
  } catch (err: any) {
    assert(false, 'Login with valid credentials succeeds', err.message);
  }

  // Test 3: Login with invalid credentials
  try {
    let failedAsExpected = false;
    try {
      await auth.login({
        email: 'dr.john@exampleclinic.com',
        password: 'WrongPassword!',
      });
    } catch {
      failedAsExpected = true;
    }
    assert(failedAsExpected, 'Login fails with incorrect password');
  } catch (err: any) {
    assert(false, 'Login handles bad password', err.message);
  }

  // Test 4: Tenant Isolation Guard
  try {
    const guard = tenantGuard();

    let tenantMismatchBlocked = false;
    const fakeReqA: any = {
      user: { id: 'usr_A', role: 'CUSTOMER_OWNER', saasCustomerId: 'tenant_A' },
      saasCustomerId: 'tenant_A',
      params: { saasCustomerId: 'tenant_B' }, // Attempting to access tenant B
    };
    const fakeResA: any = {
      status: (code: number) => ({
        json: (body: any) => {
          if (code === 403 && body.error?.code === 'TENANT_MISMATCH') {
            tenantMismatchBlocked = true;
          }
        },
      }),
    };
    guard(fakeReqA, fakeResA, () => {
      tenantMismatchBlocked = false; // Next should not be called
    });
    assert(tenantMismatchBlocked, 'Tenant isolation blocks SaaSCustomer A from accessing SaaSCustomer B');

    let sameTenantAllowed = false;
    const fakeReqSame: any = {
      user: { id: 'usr_A', role: 'CUSTOMER_OWNER', saasCustomerId: 'tenant_A' },
      saasCustomerId: 'tenant_A',
      params: { saasCustomerId: 'tenant_A' },
    };
    guard(fakeReqSame, {} as any, () => {
      sameTenantAllowed = true;
    });
    assert(sameTenantAllowed, 'Tenant isolation allows SaaSCustomer accessing their own tenant data');

    let adminBypassAllowed = false;
    const fakeReqAdmin: any = {
      user: { id: 'usr_admin', role: 'PLATFORM_ADMIN', saasCustomerId: 'saas_platform' },
      saasCustomerId: 'saas_platform',
      params: { saasCustomerId: 'tenant_B' },
    };
    guard(fakeReqAdmin, {} as any, () => {
      adminBypassAllowed = true;
    });
    assert(adminBypassAllowed, 'Platform admin is permitted cross-tenant access for administration');
  } catch (err: any) {
    assert(false, 'Tenant isolation test execution', err.message);
  }

  // Test 5: Role Access & RBAC Enforcement
  try {
    const ownerGuard = requireRole(['CUSTOMER_OWNER']);

    let memberBlocked = false;
    const memberReq: any = {
      user: { id: 'usr_member', role: 'CUSTOMER_MEMBER', saasCustomerId: 'tenant_A' },
    };
    const memberRes: any = {
      status: (code: number) => ({
        json: (body: any) => {
          if (code === 403 && body.error?.code === 'FORBIDDEN') {
            memberBlocked = true;
          }
        },
      }),
    };
    ownerGuard(memberReq, memberRes, () => {
      memberBlocked = false;
    });
    assert(memberBlocked, 'RBAC prevents CUSTOMER_MEMBER from performing CUSTOMER_OWNER actions');

    let ownerAllowed = false;
    const ownerReq: any = {
      user: { id: 'usr_owner', role: 'CUSTOMER_OWNER', saasCustomerId: 'tenant_A' },
    };
    ownerGuard(ownerReq, {} as any, () => {
      ownerAllowed = true;
    });
    assert(ownerAllowed, 'RBAC permits CUSTOMER_OWNER to perform owner actions');

    let platformAdminAllowed = false;
    const adminReq: any = {
      user: { id: 'usr_admin', role: 'PLATFORM_ADMIN', saasCustomerId: 'saas_platform' },
    };
    ownerGuard(adminReq, {} as any, () => {
      platformAdminAllowed = true;
    });
    assert(platformAdminAllowed, 'RBAC allows PLATFORM_ADMIN to execute restricted operations');
  } catch (err: any) {
    assert(false, 'Role access test execution', err.message);
  }

  return { passed, failed, results };
}
