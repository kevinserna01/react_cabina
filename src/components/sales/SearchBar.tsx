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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.code.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(true);
  };

  const handleProductClick = (product: Product) => {
    onProductSelect(product);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-xl">
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
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-sm text-gray-500">
                      Stock: {product.stock}
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