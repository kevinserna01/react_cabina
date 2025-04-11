import { Plus } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const isLowStock = product.stock <= 5;

  return (
    <button
      onClick={() => onAddToCart(product)}
      className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          ${product.price.toFixed(2)}
        </span>
        <div className="flex items-center">
          <span className={`text-sm mr-2 ${isLowStock ? 'text-red-500' : 'text-gray-500'}`}>
            Stock: {product.stock}
          </span>
          <Plus className="h-5 w-5 text-indigo-600" />
        </div>
      </div>
    </button>
  );
};

export default ProductCard; 