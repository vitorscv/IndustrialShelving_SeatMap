import { createContext, useContext } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Invalid credentials');
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

// Token lives only in React state for this session — intentionally not
// persisted to localStorage/sessionStorage, so it is lost on page reload.
export interface AuthContextValue {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthContext provider');
  }
  return context;
}
