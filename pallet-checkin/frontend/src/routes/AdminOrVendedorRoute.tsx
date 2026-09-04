import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../services/auth';

interface AdminOrVendedorRouteProps {
  children: ReactElement;
}

// Same "sits inside ProtectedRoute, adds a role check on top" pattern as
// AdminRoute — used for Relatórios, the one area VENDEDOR (a strictly
// read-only role) is allowed into alongside ADMIN. OPERATOR still bounces
// back to /dashboard here, same as it always has.
export function AdminOrVendedorRoute({ children }: AdminOrVendedorRouteProps) {
  const role = useRole();

  if (role !== 'ADMIN' && role !== 'VENDEDOR') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
