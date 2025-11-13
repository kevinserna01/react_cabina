import React, { useState } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavbarProps {
  navItems: NavItem[];
  activeSection: string;
  onNavigate: (id: string) => void;
}

const BottomNavbar: React.FC<BottomNavbarProps> = ({
  navItems,
  activeSection,
  onNavigate
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 hidden lg:block">
      <div className="dark:bg-white/10 light:bg-white backdrop-blur-xl border dark:border-white/20 light:border-gray-200 rounded-2xl shadow-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Tooltip - Aparece al hacer hover */}
              {hoveredId === item.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none">
                  <div className="dark:bg-white/90 light:bg-gray-900 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <span className="text-sm font-medium dark:text-gray-900 light:text-white">
                      {item.label}
                    </span>
                    {/* Flecha del tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-0.5">
                      <div className="w-2 h-2 dark:bg-white/90 light:bg-gray-900 rotate-45"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Icono del botón */}
              <button
                onClick={() => onNavigate(item.id)}
                className={`
                  relative p-3 rounded-xl transition-all duration-200
                  ${activeSection === item.id
                    ? 'dark:bg-white/20 dark:text-white light:bg-blue-500 light:text-white scale-110'
                    : 'dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white light:text-gray-600 light:hover:bg-gray-100 light:hover:text-gray-900 hover:scale-110'
                  }
                `}
                aria-label={item.label}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                <span className="block w-5 h-5">
                  {item.icon}
                </span>

                {/* Indicador de activo */}
                {activeSection === item.id && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 dark:bg-cyan-400 light:bg-blue-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNavbar;

