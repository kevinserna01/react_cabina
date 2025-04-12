import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
}

interface NewProduct {
  name: string;
  code: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
}

const ProductsContent = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    code: '',
    price: 0,
    category: '',
    description: '',
    imageUrl: ''
  });

  // Mock data - Replace with real data from your backend
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Cuaderno Universitario',
      code: 'CU001',
      price: 3.50,
      category: 'Cuadernos',
      description: 'Cuaderno universitario de 100 hojas, cuadriculado'
    },
    {
      id: '2',
      name: 'Lápiz 2B',
      code: 'LP002',
      price: 0.75,
      category: 'Útiles',
      description: 'Lápiz de grafito 2B para dibujo'
    }
  ]);

  const categories = ['all', 'Cuadernos', 'Útiles', 'Papelería', 'Arte'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:4000/v1/papeleria/newproductapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Asumiendo que guardas el token en localStorage
        },
        body: JSON.stringify(newProduct)
      });

      if (!response.ok) {
        throw new Error('Error al crear el producto');
      }

      const createdProduct = await response.json();
      setProducts(prev => [...prev, createdProduct]);
      setIsAddModalOpen(false);
      setNewProduct({
        name: '',
        code: '',
        price: 0,
        category: '',
        description: '',
        imageUrl: ''
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header y Controles */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'Todas las categorías' : category}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Imagen del producto (placeholder) */}
            <div className="aspect-w-16 aspect-h-9 bg-gray-100">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Información del producto */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.code}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ${product.price.toFixed(2)}
                </span>
              </div>
              
              <p className="mt-2 text-sm text-gray-600">{product.description}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {product.category}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Editar producto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    aria-label="Eliminar producto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Agregar Producto */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agregar Nuevo Producto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newProduct.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Código
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={newProduct.code}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Precio
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={newProduct.price}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <select
                  id="category"
                  name="category"
                  value={newProduct.category}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newProduct.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                  URL de la imagen
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  value={newProduct.imageUrl}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsContent; 