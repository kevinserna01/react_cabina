import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Product } from '../../types';

interface SearchBarProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
}

const SearchBar = ({ products, onProductSelect }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredProducts = (products || []).filter(product => {
    if (!product) return false;
    
    const searchQuery = query.toLowerCase();
    const productName = (product.name || '').toLowerCase();
    const productCode = (product.code || '').toLowerCase();
    
    return productName.includes(searchQuery) || productCode.includes(searchQuery);
  }).slice(0, 5);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
  };

  const handleProductClick = (product: Product) => {
    if (product.stock > 0) {
      onProductSelect(product);
      setQuery('');
      setShowResults(false);
    }
  };

  // Cerrar los resultados cuando se hace clic fuera del componente
  const handleClickOutside = () => {
    setShowResults(false);
  };

  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSearchContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="relative w-full max-w-xl" onClick={handleSearchContainerClick}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          className="w-full px-4 py-2 pl-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Buscar productos por nombre o código..."
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {showResults && query && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
          {filteredProducts.length > 0 ? (
            <ul className="py-1">
              {filteredProducts.map(product => (
                <li
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className={`px-4 py-2 cursor-pointer ${
                    product.stock > 0 
                      ? 'hover:bg-gray-100' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{product.name}</span>
                    <span className={`text-sm ${
                      product.stock === 0 
                        ? 'text-red-500' 
                        : product.stock <= 5 
                          ? 'text-orange-500' 
                          : 'text-gray-500'
                    }`}>
                      {product.stock === 0 ? 'Sin stock' : `Stock: ${product.stock}`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Código: {product.code}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              No se encontraron productos
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 