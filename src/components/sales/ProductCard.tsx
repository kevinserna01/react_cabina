import { Plus } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const formatPrice = (price: number | undefined): string => {
  if (typeof price !== 'number') return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const isLowStock = product.stock <= 5;
  const isOutOfStock = product.stock <= 0;

  return (
    <button
      onClick={() => !isOutOfStock && onAddToCart(product)}
      disabled={isOutOfStock}
      className={`flex flex-col items-center p-4 bg-white rounded-lg shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'}`}
    >
      <div className="w-full text-left mb-2">
        <h3 className="font-medium text-gray-900 truncate">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500">
          Código: {product.code}
        </p>
      </div>

      <div className="w-full flex justify-between items-center mt-2">
        <span className="text-lg font-semibold text-gray-900">
          {formatPrice(product.price)}
        </span>
        <div className="flex items-center">
          <span className={`text-sm mr-2 ${
            isOutOfStock ? 'text-red-600 font-medium' : 
            isLowStock ? 'text-orange-500' : 
            'text-gray-500'
          }`}>
            {isOutOfStock ? 'Sin stock' : `Stock: ${product.stock}`}
          </span>
          {!isOutOfStock && <Plus className="h-5 w-5 text-indigo-600" />}
        </div>
      </div>
    </button>
  );
};

export default ProductCard; 