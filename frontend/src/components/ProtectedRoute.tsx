import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

type AllowedRoles = ('ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS')[];

interface Props {
  allowedRoles?: AllowedRoles;
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
