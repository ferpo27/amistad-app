import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_ID_KEY = 'userId';
const USER_EMAIL_KEY = 'userEmail';

const storeSecure = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value);
};

const getSecure = async (key: string): Promise<string | null> => {
  return await SecureStore.getItemAsync(key);
};

const deleteSecure = async (key: string) => {
  await SecureStore.deleteItemAsync(key);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStoredAuth = async () => {
    try {
      const [accessToken, refreshToken, id, email] = await Promise.all([
        getSecure(ACCESS_TOKEN_KEY),
        getSecure(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_ID_KEY),
        AsyncStorage.getItem(USER_EMAIL_KEY),
      ]);

      if (accessToken && refreshToken && id && email) {
        setUser({
          id,
          email,
          accessToken,
          refreshToken,
        });
      }
    } catch (e) {
      console.error('Error loading stored auth', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('https://your-api.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();

      const { accessToken, refreshToken, userId } = data;

      await Promise.all([
        storeSecure(ACCESS_TOKEN_KEY, accessToken),
        storeSecure(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(USER_ID_KEY, userId),
        AsyncStorage.setItem(USER_EMAIL_KEY, email),
      ]);

      setUser({
        id: userId,
        email,
        accessToken,
        refreshToken,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await Promise.all([
        deleteSecure(ACCESS_TOKEN_KEY),
        deleteSecure(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_ID_KEY),
        AsyncStorage.removeItem(USER_EMAIL_KEY),
      ]);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    if (!user?.refreshToken) {
      await logout();
      return;
    }

    try {
      const response = await fetch('https://your-api.com/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: user.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh token failed');
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = data;

      await Promise.all([
        storeSecure(ACCESS_TOKEN_KEY, accessToken),
        storeSecure(REFRESH_TOKEN_KEY, newRefreshToken),
      ]);

      setUser(prev => prev ? { ...prev, accessToken, refreshToken: newRefreshToken } : null);
    } catch (e) {
      console.error(e);
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};