import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const user = localStorage.getItem('user');
  const userRole = localStorage.getItem('userRole');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    // Redirect admins to admin dashboard and workers to sales dashboard
    return <Navigate to={userRole === 'admin' ? '/admin' : '/sales'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 