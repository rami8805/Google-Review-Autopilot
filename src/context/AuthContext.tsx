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
  const [token, setToken] = useState<string>('mock_access_token');
  const [userId, setUserId] = useState<string>('usr_demo_01');
  const [email, setEmail] = useState<string>('owner@downtowndental-sf.com');
  const [name, setName] = useState<string>('Dr. Sarah Lin');
  const [tenantId, setTenantId] = useState<string>('saas_cust_demo_01');
  const [role, setRole] = useState<UserRole>('OWNER');

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
            // If user's email matches admin email, assign SUPER_ADMIN
            if (fbUser.email === 'ouaretchoayb@gmail.com') {
              setRole('SUPER_ADMIN');
            }
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
        if (cred.user.email === 'ouaretchoayb@gmail.com') {
          setRole('SUPER_ADMIN');
        }
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
    const newToken = `test_token_usr_${Date.now()}_${targetTenantId}_${newRole.toLowerCase()}`;
    setToken(newToken);
    setRole(newRole);
    setTenantId(targetTenantId);
    setUserId(`usr_${newRole.toLowerCase()}`);
    setEmail(`${newRole.toLowerCase()}@${targetTenantId}.com`);
    setName(newRole === 'OWNER' ? 'Dr. Sarah Lin' : `${newRole} User`);
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
