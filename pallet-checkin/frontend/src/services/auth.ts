import { createContext, useContext } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export type Role = 'ADMIN' | 'OPERATOR' | 'VENDEDOR';

interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

// Decodes the JWT payload client-side purely to read `role` for UI
// gating (nav visibility, route redirects) — this is NOT a security
// boundary. The token is base64, not encrypted, and every actual
// permission check happens server-side (RolesGuard); a user could edit
// this locally and it would change nothing about what the API allows.
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (response.status === 429) {
    throw new Error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Credenciais inválidas');
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

// Derived from the token itself on every call rather than stored as its
// own piece of state — role only ever changes when the token does (a new
// login), so there's no separate value that could drift out of sync.
export function useRole(): Role | null {
  const { token } = useAuth();
  if (!token) return null;
  return decodeJwtPayload(token)?.role ?? null;
}
