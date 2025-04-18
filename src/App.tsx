import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import AdminDashboard from './pages/AdminDashboard';
import SalesDashboard from './pages/SalesDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

const App: React.FC = () => {
  // Verificar si hay un usuario autenticado
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        {/* Ruta pública */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/sales" replace />
            ) : (
              <Login />
            )
          } 
        />

        {/* Rutas protegidas */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales/*"
          element={
            <ProtectedRoute allowedRoles={['worker']}>
              <SalesDashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/sales" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Router>
  );
};

export default App; 