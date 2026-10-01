import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import type { UserRole } from '../../shared/types/domain.ts';

export interface AuthContextType {
  token: string | null;
  userId: string;
  email: string;
  name?: string;
  tenantId: string;
  role: UserRole;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  loginAs: (role: UserRole, targetTenantId?: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if an explicit dev/test session was saved in sessionStorage
  const savedToken = typeof window !== 'undefined' ? sessionStorage.getItem('dev_auth_token') : null;
  const savedRole = typeof window !== 'undefined' ? (sessionStorage.getItem('dev_auth_role') as UserRole) : null;
  const savedTenant = typeof window !== 'undefined' ? sessionStorage.getItem('dev_auth_tenant') : null;
  const savedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('dev_auth_email') : null;
  const savedName = typeof window !== 'undefined' ? sessionStorage.getItem('dev_auth_name') : null;

  const [token, setToken] = useState<string | null>(savedToken);
  const [userId, setUserId] = useState<string>(savedToken ? `usr_${savedRole || 'owner'}` : '');
  const [email, setEmail] = useState<string>(savedEmail || '');
  const [name, setName] = useState<string>(savedName || '');
  const [tenantId, setTenantId] = useState<string>(savedTenant || '');
  const [role, setRole] = useState<UserRole>(savedRole || 'MEMBER');
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    try {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (!isMounted) return;

        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            setToken(idToken);
            setUserId(fbUser.uid);
            setEmail(fbUser.email || 'user@example.com');
            setName(fbUser.displayName || fbUser.email?.split('@')[0] || 'User');

            // Authoritatively resolve role and tenant membership from database
            try {
              const meRes = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${idToken}` },
              });
              if (meRes.ok) {
                const meData = await meRes.json();
                if (meData?.data?.user?.role) setRole(meData.data.user.role);
                if (meData?.data?.saasCustomer?.id) setTenantId(meData.data.saasCustomer.id);
              }
            } catch (err) {
              console.warn('Could not fetch authoritative user profile:', err);
            }
          } catch (e) {
            console.warn('Failed to retrieve ID token from Firebase user:', e);
          }
        } else if (!savedToken) {
          // No Firebase user and no saved dev session
          setToken(null);
          setUserId('');
          setEmail('');
          setName('');
          setTenantId('');
          setRole('MEMBER');
        }

        setIsLoadingAuth(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (e) {
      console.warn('Firebase onAuthStateChanged not active:', e);
      setIsLoadingAuth(false);
    }
  }, [savedToken]);

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      if (cred.user) {
        const idToken = await cred.user.getIdToken();
        setToken(idToken);
        setUserId(cred.user.uid);
        setEmail(cred.user.email || '');
        setName(cred.user.displayName || 'Google User');

        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData?.data?.user?.role) setRole(meData.data.user.role);
            if (meData?.data?.saasCustomer?.id) setTenantId(meData.data.saasCustomer.id);
          }
        } catch {
          // Dev / network fallback
        }
      }
    } catch (err) {
      console.error('Failed to sign in with Google:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('dev_auth_token');
      sessionStorage.removeItem('dev_auth_role');
      sessionStorage.removeItem('dev_auth_tenant');
      sessionStorage.removeItem('dev_auth_email');
      sessionStorage.removeItem('dev_auth_name');
    }
    setToken(null);
    setUserId('');
    setEmail('');
    setName('');
    setTenantId('');
    setRole('MEMBER');
  };

  const loginAs = (newRole: UserRole, targetTenantId = 'saas_cust_demo_01') => {
    const newToken = `test_token_usr_${Date.now()}_${targetTenantId}_${newRole.toLowerCase()}`;
    const userEmail = `${newRole.toLowerCase()}@${targetTenantId}.com`;
    const userName = newRole === 'OWNER' ? 'Business Owner' : `${newRole} User`;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dev_auth_token', newToken);
      sessionStorage.setItem('dev_auth_role', newRole);
      sessionStorage.setItem('dev_auth_tenant', targetTenantId);
      sessionStorage.setItem('dev_auth_email', userEmail);
      sessionStorage.setItem('dev_auth_name', userName);
    }

    setToken(newToken);
    setRole(newRole);
    setTenantId(targetTenantId);
    setUserId(`usr_${newRole.toLowerCase()}`);
    setEmail(userEmail);
    setName(userName);
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (!token) {
      return { 'Content-Type': 'application/json' };
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        email,
        name,
        tenantId,
        role,
        isAuthenticated: Boolean(token),
        isLoadingAuth,
        loginAs,
        loginWithGoogle,
        logout,
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
