import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardContent from '../components/admin/DashboardContent';
import InventoryContent from '../components/admin/InventoryContent';
import ProductsContent from '../components/admin/ProductsContent';
import SalesContent from '../components/admin/SalesContent';
import ReportsContent from '../components/admin/ReportsContent';
import UsersContent from '../components/admin/UsersContent';
import CustomersContent from '../components/admin/CustomersContent';
import InvoicesContent from '../components/admin/InvoicesContent';
import AccountStatementContent from '../components/admin/AccountStatementContent';
import CarteraReportsContent from '../components/admin/CarteraReportsContent';
import HeaderDropdownMenu from '../components/layout/HeaderDropdownMenu';
import BottomNavbar from '../components/layout/BottomNavbar';
import GlassSurface from '../components/ui/GlassSurface';
import { useTheme } from '../context/ThemeContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: 'products',
      label: 'Productos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      id: 'sales',
      label: 'Ventas',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'invoices',
      label: 'Facturación',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 8h10M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
      ),
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'carteraReports',
      label: 'Rep. Cartera',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 11V7a4 4 0 118 0v4m-9 4h10M5 9h4m-4 4h4m-4 4h4" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Estado de Cuenta',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4M3 11h18" />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'customers',
      label: 'Clientes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-3M9 20H4v-2a4 4 0 014-4h3m0-4a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      ),
    },
  ];

  const handleNavigation = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent />;
      case 'inventory':
        return <InventoryContent />;
      case 'products':
        return <ProductsContent />;
      case 'sales':
        return <SalesContent />;
      case 'reports':
        return <ReportsContent />;
      case 'users':
        return <UsersContent />;
      case 'customers':
        return <CustomersContent />;
      case 'invoices':
        return <InvoicesContent />;
      case 'account':
        return <AccountStatementContent />;
      case 'carteraReports':
        return <CarteraReportsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen dark:bg-[#0a0a1f] light:bg-gray-50 relative">
      {/* Navbar with GlassSurface - Fixed Header */}
      <div className="w-full flex justify-center pt-6 px-6 lg:px-12 fixed top-0 left-0 right-0 z-[60] bg-gradient-to-b from-black/20 to-transparent backdrop-blur-sm">
        <GlassSurface width="100%" height={70}>
          <nav className="w-full h-full flex items-center justify-between px-6 lg:px-12">
            {/* Logo PymeTrack (izquierda) */}
            <div className="flex items-center gap-4">
              {/* Menu toggle button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-lg transition-all duration-200 
                  ${isMenuOpen 
                    ? 'dark:bg-white/20 dark:text-white light:bg-gray-200 light:text-gray-900' 
                    : 'dark:text-white light:text-gray-900 dark:hover:bg-white/10 light:hover:bg-gray-100'
                  }`}
                aria-label="Toggle menú"
                aria-expanded={isMenuOpen}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <h1 className="text-2xl dark:text-white light:text-gray-900 flex items-center">
                <span className="font-bold">Pyme</span>
                <span className="font-light">Track</span>
              </h1>
            </div>

            {/* Botones (derecha) */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/20 dark:text-white light:text-gray-900 rounded-lg transition-all duration-300"
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white hover:border-white dark:text-gray-300 dark:hover:text-gray-700 light:text-gray-700 light:hover:text-gray-900 font-semibold rounded-lg transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </nav>
        </GlassSurface>
      </div>

      {/* Dropdown Menu from Header */}
      <HeaderDropdownMenu
        navItems={navItems}
        activeSection={activeSection}
        onNavigate={handleNavigation}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="pt-24 px-4 lg:px-8 pb-8 lg:pb-28">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNavbar
        navItems={navItems}
        activeSection={activeSection}
        onNavigate={handleNavigation}
      />
    </div>
  );
};

export default AdminDashboard; 