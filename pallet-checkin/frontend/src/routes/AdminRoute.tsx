import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../services/auth';

interface AdminRouteProps {
  children: ReactElement;
}

// Sits INSIDE ProtectedRoute (so `token` is already guaranteed) and adds
// the role check on top — an OPERATOR who navigates straight to a
// restricted URL (not just one who clicks a hidden nav item) still gets
// redirected, rather than the page attempting to render and failing on
// its own 403 responses.
export function AdminRoute({ children }: AdminRouteProps) {
  const role = useRole();

  if (role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
