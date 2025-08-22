'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        // We try to get the token silently first
        user.getIdTokenResult().then(idTokenResult => {
            const credential = GoogleAuthProvider.credential(idTokenResult.token);
            // This is a bit of a trick. The access token is not directly available on the user object.
            // We need to re-authenticate or get it from the sign-in result.
            // For simplicity in this flow, we will rely on the accessToken set during signIn.
        }).catch(error => {
            console.error("Error getting id token:", error)
        }).finally(() => setLoading(false));

      } else {
        setUser(null);
        setAccessToken(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    // Request access to the user's Google Drive app data folder.
    provider.addScope('https://www.googleapis.com/auth/drive.appdata');
    // Also request file scope to ensure file searching capabilities
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
      setUser(result.user);
    } catch (error) {
      console.error("Error during sign-in:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAccessToken(null);
    } catch (error) {
        console.error("Error during sign-out:", error);
    }
  };

  const value = {
    user,
    accessToken,
    loading,
    signIn,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
