import React, { useState, useEffect } from 'react';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../services/categories';

interface Product {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  price: number; // compatibilidad
  costPrice?: number;
  salePrice?: number;
  profitMargin?: number;
  category: string;
  description: string;
  createdAt?: Date;
  lastUpdate?: Date;
}

interface NewProduct {
  name: string;
  code: string;
  costPrice: number;
  salePrice: number;
  category: string; // nombre de categoría o vacío
  description: string;
  createNewCategory?: boolean;
}

interface ApiResponse {
  status: string;
  message: string;
  data?: Product;
}

const ProductsContent = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    code: '',
    costPrice: 0,
    salePrice: 0,
    category: '',
    description: '',
    createNewCategory: false,
  });

  const [products, setProducts] = useState<Product[]>([]);

  interface CategoryRow { id: string; name: string; description?: string }
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const categoryNames = ['all', ...categories.map(c => c.name)];
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);

  // Cargar productos al montar el componente
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/getProductsapi');
      if (!response.ok) throw new Error('Error al cargar productos');
      const data = await response.json();
      const mapped = (data.data || []).map((p: any) => ({
        ...p,
        // Normalizar siempre números para evitar NaN en la UI
        price: Number(p.salePrice ?? p.precio ?? p.price ?? 0),
        costPrice: Number(p.costPrice ?? p.precioCosto ?? 0),
        salePrice: Number(p.salePrice ?? p.precio ?? p.price ?? 0),
        profitMargin: p.profitMargin ?? p.margenGanancia,
      }));
      setProducts(mapped);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error al cargar los productos');
    }
  };

  const fetchCategories = async () => {
    try {
      const list = await listCategories();
      const mapped = (list || []).map((c: any) => ({ id: c.id || c._id || c.value || c.name, name: c.name || c.nombre, description: c.description || c.descripcion })).filter(c => c.name);
      setCategories(mapped);
    } catch {
      setCategories([]);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory({ name: newCategory.name.trim(), description: newCategory.description.trim() || undefined });
      setNewCategory({ name: '', description: '' });
      await fetchCategories();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await updateCategory(editingCategory.id, { name: editingCategory.name, description: editingCategory.description });
      setEditingCategory(null);
      await fetchCategories();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (row: CategoryRow) => {
    if (!confirm(`¿Eliminar la categoría "${row.name}"?`)) return;
    try {
      await deleteCategory(row.id);
      await fetchCategories();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo eliminar la categoría (puede estar en uso)');
    }
  };

  // Función para generar el código automáticamente
  const generateCode = (productName: string) => {
    if (!productName) return '';
    
    // Tomar las dos primeras letras del nombre del producto en mayúsculas
    const prefix = productName.substring(0, 2).toUpperCase();
    
    // Encontrar el último código con el mismo prefijo
    const similarCodes = products
      .map(p => p.code)
      .filter(code => code.startsWith(prefix))
      .map(code => parseInt(code.substring(2)) || 0);
    
    // Obtener el siguiente número
    const nextNumber = similarCodes.length > 0 ? Math.max(...similarCodes) + 1 : 1;
    
    // Formatear el número con ceros a la izquierda
    const suffix = nextNumber.toString().padStart(3, '0');
    
    return `${prefix}${suffix}`;
  };

  // Función para formatear el precio en COP
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
      const newCode = generateCode(value);
      setNewProduct(prev => ({
        ...prev,
        [name]: value,
        code: newCode
      }));
    } else if (name === 'costPrice' || name === 'salePrice') {
      // Eliminar cualquier carácter que no sea número
      const numericValue = value.replace(/[^0-9]/g, '');
      setNewProduct(prev => ({
        ...prev,
        [name]: numericValue ? parseInt(numericValue) : 0
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Validaciones básicas
      if (newProduct.costPrice < 0 || newProduct.salePrice < 0) {
        throw new Error('Los precios no pueden ser negativos');
      }
      if (newProduct.salePrice < newProduct.costPrice) {
        throw new Error('El precio de venta no puede ser menor al precio de costo');
      }
      if (newProduct.createNewCategory && !newProduct.category.trim()) {
        throw new Error('Ingrese el nombre de la nueva categoría o desmarque la opción');
      }
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/newproductapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newProduct)
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al crear el producto');
      }

      if (result.data) {
        const p: any = result.data;
        const mapped: Product = {
          ...(p as any),
          price: Number(p.salePrice ?? p.precio ?? p.price ?? 0),
          costPrice: p.costPrice ?? p.precioCosto,
          salePrice: p.salePrice ?? p.precio ?? p.price,
          profitMargin: p.profitMargin ?? p.margenGanancia,
        };
        setProducts(prev => [...prev, mapped]);
        // refrescar categorías si se creó una nueva
        if (newProduct.createNewCategory && newProduct.category) {
          await fetchCategories();
        }
        setIsAddModalOpen(false);
        setNewProduct({ name: '', code: '', costPrice: 0, salePrice: 0, category: '', description: '', createNewCategory: false });
        setSuccessMessage('Producto agregado correctamente');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al crear el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/updateProductapi', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: editingProduct.code,
          costPrice: editingProduct.costPrice,
          salePrice: editingProduct.salePrice ?? editingProduct.price,
          category: editingProduct.category,
          description: editingProduct.description,
          createNewCategory: false,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar el producto');
      }

      setProducts(prev => prev.map(p => {
        if (p.code !== editingProduct.code) return p;
        const r: any = result.producto || result.data || result;
        const mapped: Product = {
          ...(r as any),
          price: Number(r.salePrice ?? r.price ?? p.price ?? 0),
          costPrice: r.costPrice ?? r.precioCosto ?? p.costPrice,
          salePrice: r.salePrice ?? r.precio ?? p.salePrice,
          profitMargin: r.profitMargin ?? r.margenGanancia ?? p.profitMargin,
        };
        return mapped;
      }));

      setIsEditModalOpen(false);
      setEditingProduct(null);
      setSuccessMessage('Producto actualizado con éxito');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/deleteproductapi', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code: productToDelete.code })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al eliminar el producto');
      }

      // Actualizar la lista de productos eliminando el producto
      setProducts(prev => prev.filter(p => p.code !== productToDelete.code));
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      setSuccessMessage('Producto eliminado correctamente');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al eliminar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const nameMatch = product.name.toLowerCase().includes((searchTerm || '').toLowerCase());
    const codeMatch = product.code.toLowerCase().includes((searchTerm || '').toLowerCase());
    const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    return (nameMatch || codeMatch) && categoryMatch;
  });

  return (
    <div className="space-y-6">
      {/* Mensaje de éxito */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md shadow-lg z-50 animate-fade-in-down">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {errorMessage && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50 animate-fade-in-down">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

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
            {categoryNames.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'Todas las categorías' : category}
              </option>
            ))}
          </select>
          <button onClick={() => setIsCategoriesModalOpen(true)} className="px-3 py-2 border rounded">Gestionar Categorías</button>
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
            key={product.code}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.code}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {formatPrice(product.price)}
                </span>
              </div>
              
              <p className="mt-2 text-sm text-gray-600">{product.description}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {product.category}
                </span>
              <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Editar producto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(product)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Eliminar producto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {typeof product.costPrice === 'number' && typeof product.salePrice === 'number' && (
                    <span>
                      Costo: {formatPrice(product.costPrice)} · Venta: {formatPrice(product.salePrice)}
                    </span>
                  )}
                  {typeof product.profitMargin === 'number' && (
                    <div>Margen: {product.profitMargin.toFixed(1)}%</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirmar Eliminación</h2>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar el producto "{productToDelete.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
                disabled={isLoading}
              >
                {isLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Producto */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Editar Producto</h2>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit-code" className="block text-sm font-medium text-gray-700">
                  Código
                </label>
                <input
                  type="text"
                  id="edit-code"
                  value={editingProduct.code}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 shadow-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700">
                  Precio
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    id="edit-price"
                    name="price"
                    value={editingProduct.price ? formatPrice(editingProduct.price).replace('COP', '').trim() : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '');
                      setEditingProduct({
                        ...editingProduct,
                        price: numericValue ? parseInt(numericValue) : 0
                      });
                    }}
                    required
                    className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <select
                  id="edit-category"
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="edit-description"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingProduct(null);
                  }}
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
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de categorías */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Categorías</h2>
              <button onClick={() => setIsCategoriesModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="Nombre"
                value={editingCategory ? editingCategory.name : newCategory.name}
                onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, name: e.target.value}) : setNewCategory({...newCategory, name: e.target.value})}
                className="px-3 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Descripción"
                value={editingCategory ? (editingCategory.description || '') : newCategory.description}
                onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, description: e.target.value}) : setNewCategory({...newCategory, description: e.target.value})}
                className="px-3 py-2 border rounded"
              />
              <div className="flex gap-2">
                {editingCategory ? (
                  <>
                    <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Actualizar</button>
                    <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-2 border rounded">Cancelar</button>
                  </>
                ) : (
                  <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Crear</button>
                )}
              </div>
            </form>
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-6 text-center text-gray-500">Sin categorías</td></tr>
                  ) : categories.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{c.description || '-'}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCategory(c)} className="px-3 py-1 border rounded">Editar</button>
                          <button onClick={() => handleDeleteCategory(c)} className="px-3 py-1 border rounded text-red-600">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio de Costo</label>
                  <input
                    type="text"
                    name="costPrice"
                    value={newProduct.costPrice ? formatPrice(newProduct.costPrice).replace('COP', '').trim() : ''}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio de Venta</label>
                  <input
                    type="text"
                    name="salePrice"
                    value={newProduct.salePrice ? formatPrice(newProduct.salePrice).replace('COP', '').trim() : ''}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <div className="flex gap-2">
                  <select
                    id="category"
                    name="category"
                    value={newProduct.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-2 mt-1 text-sm text-gray-700">
                    <input type="checkbox" checked={!!newProduct.createNewCategory} onChange={(e) => setNewProduct(prev => ({ ...prev, createNewCategory: e.target.checked }))} />
                  Crear categoría si no existe
                  </label>
                </div>
                {newProduct.createNewCategory && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Nombre nueva categoría"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                )}
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