'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, getAuth, signInWithCredential } from 'firebase/auth';
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

const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar.readonly'
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAccessToken(null);
    } catch (error) {
        console.error("Error during sign-out:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        try {
          // Force refresh the token to get a fresh one with all grants.
          const result = await user.getIdTokenResult(true);
          // With Google as IdP, the access token is in the claims.
          // This might be brittle, but it's a common pattern for getting the OAuth token.
          // In a real app, you might want to handle the OAuth flow more explicitly.
          // However, for this to work on refresh, we must re-trigger the OAuth flow
          // if scopes are missing. A simple way is to re-prompt.
          const provider = new GoogleAuthProvider();
          GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));

          // This will re-authenticate silently if possible, or prompt if new scopes need approval.
          // A better UX might involve asking the user first.
          const signInResult = await signInWithPopup(auth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(signInResult);
          if (credential?.accessToken) {
            setAccessToken(credential.accessToken);
          } else {
             // If we lose the access token, sign out to be safe
             await handleSignOut();
          }
        } catch (error) {
           console.error("Error refreshing token or getting access token:", error);
           // If there's an error getting the token, treat as signed out
           await handleSignOut();
        }
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [handleSignOut]);

  const signIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));
    
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
