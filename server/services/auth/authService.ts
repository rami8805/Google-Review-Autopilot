import crypto from 'crypto';
import type { User, SaaSCustomer, Business, UserRole, Subscription } from '../../../shared/types/domain';
import { DEFAULT_TRIAL_DURATION_DAYS } from '../../../shared/constants/billing';

export interface TokenPayload {
  userId: string;
  saasCustomerId: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private users = new Map<string, User & { passwordHash: string; salt: string }>();
  private saasCustomers = new Map<string, SaaSCustomer>();
  private businesses = new Map<string, Business>();
  private jwtSecret: string;

  constructor(jwtSecret = process.env.JWT_SECRET || 'dev_super_secret_jwt_key_32_bytes_long_minimum!') {
    this.jwtSecret = jwtSecret;
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed initial demo tenant and user matching repository baseline
    const demoCustomerId = 'saas_cust_demo_01';
    const demoCustomer: SaaSCustomer = {
      id: demoCustomerId,
      name: 'Downtown Dental SF',
      billingEmail: 'billing@downtowndental-sf.com',
      status: 'ACTIVE',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
    };
    this.saasCustomers.set(demoCustomerId, demoCustomer);

    const demoBusiness: Business = {
      id: 'biz_001',
      saasCustomerId: demoCustomerId,
      name: 'Downtown Dental Practice',
      industryCategory: 'Dentist',
      websiteUrl: 'https://downtowndental-sf.com',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
    };
    this.businesses.set(demoBusiness.id, demoBusiness);

    const { salt, hash } = this.hashPassword('Password123!');
    const demoOwner: User & { passwordHash: string; salt: string } = {
      id: 'usr_demo_01',
      email: 'owner@downtowndental-sf.com',
      name: 'Dr. Sarah Lin',
      role: 'CUSTOMER_OWNER',
      saasCustomerId: demoCustomerId,
      emailVerified: true,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
      passwordHash: hash,
      salt,
    };
    this.users.set(demoOwner.id, demoOwner);

    // Seed Platform Admin for testing & admin routes
    const { salt: adminSalt, hash: adminHash } = this.hashPassword('AdminMaster2026!');
    const platformAdmin: User & { passwordHash: string; salt: string } = {
      id: 'usr_admin_01',
      email: 'admin@google-review-autopilot.internal',
      name: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
      saasCustomerId: 'saas_platform_internal',
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      passwordHash: adminHash,
      salt: adminSalt,
    };
    this.users.set(platformAdmin.id, platformAdmin);
  }

  private hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
    const salt = existingSalt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  public generateToken(user: User): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      userId: user.id,
      saasCustomerId: user.saasCustomerId,
      role: user.role,
      email: user.email,
      iat: now,
      exp: now + 7 * 86400, // 7 days expiration
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  public verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;

      const expectedSignature = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as TokenPayload;
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Expired
      }
      return payload;
    } catch {
      return null;
    }
  }

  public async signup(params: {
    email: string;
    password: string;
    name: string;
    businessName: string;
  }): Promise<{
    token: string;
    user: User;
    saasCustomer: SaaSCustomer;
    business: Business;
    trialDays: number;
  }> {
    const normalizedEmail = params.email.trim().toLowerCase();

    // Check duplicate email
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        throw new Error('EMAIL_EXISTS: An account with this email address already exists');
      }
    }

    if (params.password.length < 8) {
      throw new Error('WEAK_PASSWORD: Password must be at least 8 characters long');
    }

    const saasCustomerId = `saas_cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const businessId = `biz_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    // 1. Create SaaSCustomer (paying entity)
    const saasCustomer: SaaSCustomer = {
      id: saasCustomerId,
      name: params.businessName.trim(),
      billingEmail: normalizedEmail,
      status: 'TRIAL',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.saasCustomers.set(saasCustomerId, saasCustomer);

    // 2. Create User (initial CUSTOMER_OWNER)
    const { salt, hash } = this.hashPassword(params.password);
    const user: User & { passwordHash: string; salt: string } = {
      id: userId,
      email: normalizedEmail,
      name: params.name.trim(),
      role: 'CUSTOMER_OWNER',
      saasCustomerId,
      emailVerified: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      passwordHash: hash,
      salt,
    };
    this.users.set(userId, user);

    // 3. Create initial Business
    const business: Business = {
      id: businessId,
      saasCustomerId,
      name: params.businessName.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.businesses.set(businessId, business);

    const token = this.generateToken(user);
    const publicUser = this.sanitizeUser(user);

    return {
      token,
      user: publicUser,
      saasCustomer,
      business,
      trialDays: DEFAULT_TRIAL_DURATION_DAYS,
    };
  }

  public async login(params: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: User; saasCustomer: SaaSCustomer }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    let matchedUser: (User & { passwordHash: string; salt: string }) | undefined;

    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      throw new Error('INVALID_CREDENTIALS: Invalid email or password');
    }

    const { hash } = this.hashPassword(params.password, matchedUser.salt);
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(matchedUser.passwordHash))) {
      throw new Error('INVALID_CREDENTIALS: Invalid email or password');
    }

    const saasCustomer = this.saasCustomers.get(matchedUser.saasCustomerId);
    if (!saasCustomer) {
      throw new Error('TENANT_NOT_FOUND: The associated tenant account was not found');
    }

    const token = this.generateToken(matchedUser);
    return {
      token,
      user: this.sanitizeUser(matchedUser),
      saasCustomer,
    };
  }

  public async inviteMember(
    requesterUserId: string,
    params: { email: string; name: string; role?: 'CUSTOMER_MEMBER' | 'MEMBER' }
  ): Promise<User> {
    const requester = this.users.get(requesterUserId);
    if (!requester) {
      throw new Error('USER_NOT_FOUND');
    }

    const normalizedEmail = params.email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        throw new Error('EMAIL_EXISTS: A user with this email already exists');
      }
    }

    const nowIso = new Date().toISOString();
    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const temporaryPassword = crypto.randomBytes(8).toString('hex') + 'A1!';
    const { salt, hash } = this.hashPassword(temporaryPassword);

    const newUser: User & { passwordHash: string; salt: string } = {
      id: userId,
      email: normalizedEmail,
      name: params.name.trim(),
      role: params.role || 'CUSTOMER_MEMBER',
      saasCustomerId: requester.saasCustomerId,
      emailVerified: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      passwordHash: hash,
      salt,
    };
    this.users.set(userId, newUser);

    return this.sanitizeUser(newUser);
  }

  public getUserById(id: string): User | null {
    const user = this.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  }

  public getUserByEmail(email: string): User | null {
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return this.sanitizeUser(u);
      }
    }
    return null;
  }

  public getSaaSCustomer(id: string): SaaSCustomer | null {
    return this.saasCustomers.get(id) || null;
  }

  public updateSaaSCustomerStatus(id: string, status: SaaSCustomer['status']): void {
    const customer = this.saasCustomers.get(id);
    if (customer) {
      customer.status = status;
      customer.updatedAt = new Date().toISOString();
    }
  }

  public listTenants(): SaaSCustomer[] {
    return Array.from(this.saasCustomers.values());
  }

  private sanitizeUser(user: User & { passwordHash?: string; salt?: string }): User {
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
