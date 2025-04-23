import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import SalesDashboard from './pages/SalesDashboard'
import AdminDashboard from './pages/AdminDashboard'
import LoginGeneral from './components/auth/LoginGeneral'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

// Verificar si hay un usuario autenticado usando los datos del usuario
const isAuthenticated = !!localStorage.getItem('user')
const userRole = localStorage.getItem('userRole')

const router = createBrowserRouter([
  {
    path: '/',
    element: isAuthenticated ? 
      (userRole === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/sales" replace />) 
      : <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: isAuthenticated ? 
      (userRole === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/sales" replace />) 
      : <LoginGeneral />
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/sales',
    element: (
      <ProtectedRoute allowedRoles={['worker']}>
        <SalesDashboard />
      </ProtectedRoute>
    )
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
) 