import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole } from '../../shared/types/domain.ts';

export interface AuthContextType {
  token: string | null;
  userId: string;
  email: string;
  tenantId: string;
  role: UserRole;
  isAuthenticated: boolean;
  loginAs: (role: UserRole, tenantId?: string) => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string>('mock_access_token');
  const [userId, setUserId] = useState<string>('usr_demo_01');
  const [email, setEmail] = useState<string>('owner@downtowndental-sf.com');
  const [tenantId, setTenantId] = useState<string>('saas_cust_demo_01');
  const [role, setRole] = useState<UserRole>('OWNER');

  const loginAs = (newRole: UserRole, targetTenantId = 'saas_cust_demo_01') => {
    const newToken = `test_token_usr_${Date.now()}_${targetTenantId}_${newRole.toLowerCase()}`;
    setToken(newToken);
    setRole(newRole);
    setTenantId(targetTenantId);
    setUserId(`usr_${newRole.toLowerCase()}`);
    setEmail(`${newRole.toLowerCase()}@${targetTenantId}.com`);
  };

  const getAuthHeaders = (): Record<string, string> => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        email,
        tenantId,
        role,
        isAuthenticated: Boolean(token),
        loginAs,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
