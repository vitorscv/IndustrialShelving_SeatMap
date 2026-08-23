import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/auth';

interface ProtectedRouteProps {
  children: ReactElement;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
