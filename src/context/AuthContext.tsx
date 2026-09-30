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
  loginAs: (role: UserRole, targetTenantId?: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [role, setRole] = useState<UserRole>('MEMBER');

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            setToken(idToken);
            setUserId(fbUser.uid);
            setEmail(fbUser.email || 'user@example.com');
            setName(fbUser.displayName || fbUser.email?.split('@')[0] || 'User');
          } catch (e) {
            console.warn('Failed to retrieve ID token from Firebase user:', e);
          }
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase onAuthStateChanged not active:', e);
    }
  }, []);

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      if (cred.user) {
        const idToken = await cred.user.getIdToken();
        setToken(idToken);
        setUserId(cred.user.uid);
        setEmail(cred.user.email || '');
        setName(cred.user.displayName || 'Google User');
      }
    } catch (err) {
      console.error('Failed to sign in with Google:', err);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
    setToken('');
    setUserId('');
    setEmail('');
    setTenantId('');
    setRole('MEMBER');
  };

  const loginAs = (newRole: UserRole, targetTenantId = 'saas_cust_demo_01') => {
    if (import.meta.env.PROD) return;
    const newToken = `test_token_usr_${Date.now()}_${targetTenantId}_${newRole.toLowerCase()}`;
    setToken(newToken);
    setRole(newRole);
    setTenantId(targetTenantId);
    setUserId(`usr_${newRole.toLowerCase()}`);
    setEmail(`${newRole.toLowerCase()}@${targetTenantId}.test.invalid`);
    setName(newRole === 'OWNER' ? 'Demo Owner' : `${newRole} User`);
  };

  const getAuthHeaders = (): Record<string, string> => {
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
