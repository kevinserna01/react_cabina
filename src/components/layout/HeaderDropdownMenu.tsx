import React, { useRef, useEffect } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface HeaderDropdownMenuProps {
  navItems: NavItem[];
  activeSection: string;
  onNavigate: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const HeaderDropdownMenu: React.FC<HeaderDropdownMenuProps> = ({
  navItems,
  activeSection,
  onNavigate,
  isOpen,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/30 z-[65] lg:hidden"
        onClick={onClose}
      />

      {/* Dropdown Menu */}
      <div
        ref={menuRef}
        className="fixed top-24 left-6 right-6 lg:left-auto lg:right-auto lg:w-80 
                   dark:bg-white/10 light:bg-white backdrop-blur-xl 
                   border dark:border-white/20 light:border-gray-200 
                   rounded-2xl shadow-2xl z-[70] 
                   animate-in fade-in slide-in-from-top-5 duration-200
                   max-h-[calc(100vh-8rem)] overflow-hidden"
      >
        {/* Header del menú */}
        <div className="p-4 border-b dark:border-white/10 light:border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold dark:text-white light:text-gray-900">
              Menú de Navegación
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg dark:text-white/70 light:text-gray-500 
                       dark:hover:bg-white/10 light:hover:bg-gray-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Items de navegación */}
        <nav className="overflow-y-auto custom-scrollbar max-h-[calc(100vh-12rem)] p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 text-left
                ${activeSection === item.id
                  ? 'dark:bg-white/20 dark:text-white light:bg-blue-50 light:text-blue-600'
                  : 'dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white light:text-gray-600 light:hover:bg-gray-100 light:hover:text-gray-900'
                }
              `}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {activeSection === item.id && (
                <span className="ml-auto">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default HeaderDropdownMenu;

