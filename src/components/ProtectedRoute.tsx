import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const user = localStorage.getItem('user');
  const userRole = localStorage.getItem('userRole');

  console.log('ProtectedRoute - Debug Info:', {
    user: user ? 'Present' : 'Missing',
    userRole,
    allowedRoles,
    isAllowed: allowedRoles.length === 0 || (userRole && allowedRoles.includes(userRole))
  });

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    console.log('ProtectedRoute - User role not allowed, redirecting');
    // Redirect admins to admin dashboard and workers to sales dashboard
    return <Navigate to={userRole === 'admin' ? '/admin' : '/sales'} replace />;
  }

  console.log('ProtectedRoute - Access granted, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute; 