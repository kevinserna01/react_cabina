import { useState, useEffect } from 'react';
import { listCategories } from '../../services/categories';

interface Product {
  code: string;
  name: string;
  category: string;
  // precio de venta compatible
  price: number;
  // nuevos campos
  costPrice?: number;
  salePrice?: number;
  profitMargin?: number;
  description: string;
}

interface InventoryItem {
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  lastUpdate?: Date;
}

interface NewInventoryItem {
  code: string;
  stock: string;
  minStock: string;
  name: string;
  category: string;
}

const InventoryContent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isProductSelectionModalOpen, setIsProductSelectionModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [newProduct, setNewProduct] = useState<NewInventoryItem>({
    code: '',
    stock: '',
    minStock: '',
    name: '',
    category: ''
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<InventoryItem | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [stockToAdd, setStockToAdd] = useState<string>('');
  // Estado de vista de costos ya no se usa; costos están integrados en la tabla principal
  const showCostView = false;

  const [categoryNames, setCategoryNames] = useState<string[]>(['all']);

  // Cargar inventario inicial
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/getInventoryProductsapi', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Error al cargar el inventario');
        }

        const result = await response.json();

        if (result.status === "Success") {
          // Asegurarse de que los datos del inventario tengan el formato correcto
          const formattedInventory = result.data.map((item: any) => ({
            code: item.code || '',
            name: item.name || '',
            category: item.category || '',
            stock: item.stock || 0,
            minStock: item.minStock || 0,
            lastUpdate: item.lastUpdate ? new Date(item.lastUpdate) : new Date()
          }));
          
          setInventory(formattedInventory);
        } else {
          setErrorMessage(result.message || 'Error al cargar el inventario');
        }
      } catch (error) {
        console.error('Error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Error al cargar el inventario');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
    // cargar categorías dinámicas
    (async () => {
      try {
        const cats = await listCategories();
        const names = (cats || []).map((c: any) => c.name || c.nombre).filter(Boolean);
        setCategoryNames(['all', ...names]);
      } catch {
        setCategoryNames(['all']);
      }
    })();
    // cargar productos para costos en vista principal
    fetchProducts();
  }, []);

  // La vista de costos está integrada; no se requiere efecto adicional

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/getProductsapi');
      if (!response.ok) throw new Error('Error al cargar productos');
      const data = await response.json();
      const mapped = (Array.isArray(data.data) ? data.data : []).map((p: any) => ({
        code: p.code,
        name: p.name || p.nombre,
        category: p.category || p.categoria || '',
        // compatibilidad de precios
        price: Number(p.salePrice ?? p.precio ?? p.price ?? 0),
        costPrice: Number(p.costPrice ?? p.precioCosto ?? 0),
        salePrice: Number(p.salePrice ?? p.precio ?? p.price ?? 0),
        profitMargin: p.profitMargin ?? p.margenGanancia,
        description: p.description || p.descripcion || '',
      }));
      setProducts(mapped);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error al cargar los productos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProductClick = async () => {
    await fetchProducts();
    setIsProductSelectionModalOpen(true);
  };

  const handleProductSelect = (product: Product) => {
    if (!product) return;
    
    console.log('Producto seleccionado:', product); // Para debug
    
    setNewProduct({
      code: product.code || '',
      name: product.name || '',
      category: product.category || '',
      stock: '',
      minStock: ''
    });
    setIsProductSelectionModalOpen(false);
    setIsAddModalOpen(true);
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
    if (name === 'stock' || name === 'minStock') {
      // Permitir solo números positivos
      const numericValue = value.replace(/[^0-9]/g, '');
      setNewProduct(prev => ({
        ...prev,
        [name]: numericValue
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
      const inventoryItem = {
        code: newProduct.code,
        name: newProduct.name,
        category: newProduct.category,
        stock: Number(newProduct.stock) || 0,
        minStock: Number(newProduct.minStock) || 0,
        lastUpdate: new Date()
      };

      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/assignProductToInventoryapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(inventoryItem)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al asignar el producto al inventario');
      }

      setInventory(prev => [...prev, result.data]);
      setIsAddModalOpen(false);
      setNewProduct({
        code: '',
        stock: '',
        minStock: '',
        name: '',
        category: ''
      });
      setSuccessMessage(`Producto agregado al inventario: ${newProduct.name}`);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al asignar el producto al inventario');
    } finally {
      setIsLoading(false);
    }
  };

  const safeFilter = <T extends { name?: string; code?: string; category?: string }>(
    items: T[],
    searchText: string,
    categoryField: string
  ): T[] => {
    if (!Array.isArray(items)) return [];
    
    const searchLower = (searchText || '').toLowerCase();
    
    return items.filter(item => {
      if (!item) return false;
      
      const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
      const codeMatch = (item.code || '').toLowerCase().includes(searchLower);
      const categoryMatch = categoryField === 'all' || item.category === categoryField;
      
      return (nameMatch || codeMatch) && categoryMatch;
    });
  };

  const filteredProducts = safeFilter(products, productSearchTerm, productCategory);
  const filteredInventory = safeFilter(inventory, searchTerm, selectedCategory);

  // Preparar filas con costos para la vista de costos
  const inventoryCostRows = filteredInventory.map((item) => {
    const product = products.find((p) => p.code === item.code);
    // costo por unidad: preferir costPrice, luego price
    const unitPrice = product?.costPrice ?? product?.price ?? 0;
    const totalCost = unitPrice * (item.stock ?? 0);
    return {
      ...item,
      unitPrice,
      totalCost,
    };
  });
  const grandTotalCost = inventoryCostRows.reduce((sum, row) => sum + (row.totalCost ?? 0), 0);

  const handleEditClick = (item: InventoryItem) => {
    setEditingProduct(item);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/updateInventoryProductapi', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: editingProduct.code,
          stock: Number(editingProduct.stock),
          minStock: Number(editingProduct.minStock)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar el inventario');
      }

      setInventory(prev => prev.map(item => 
        item.code === editingProduct.code ? { ...item, ...result.data } : item
      ));

      setIsEditModalOpen(false);
      setEditingProduct(null);
      setStockToAdd('');
      setSuccessMessage(`Inventario actualizado correctamente: ${editingProduct.name}`);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar el inventario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!editingProduct || !stockToAdd) return;
    
    const quantityToAdd = parseInt(stockToAdd);
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
      setErrorMessage('Por favor ingrese una cantidad válida');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/updateInventoryProductapi', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: editingProduct.code,
          stock: Number(editingProduct.stock) + quantityToAdd,
          minStock: Number(editingProduct.minStock)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar el inventario');
      }

      setInventory(prev => prev.map(item => 
        item.code === editingProduct.code ? { ...item, ...result.data } : item
      ));

      setEditingProduct(prev => prev ? { ...prev, stock: Number(prev.stock) + quantityToAdd } : null);
      setStockToAdd('');
      setSuccessMessage(`Se agregaron ${quantityToAdd} unidades al stock de ${editingProduct.name}`);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar el inventario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!editingProduct) return;

    if (name === 'stock' || name === 'minStock') {
      // Si el valor está vacío o es solo un signo negativo, mantenerlo como string
      if (value === '' || value === '-') {
    setEditingProduct(prev => {
      if (!prev) return prev;
      return {
        ...prev,
            [name]: value
      };
    });
      } else {
        // Convertir a número solo si hay un valor válido
        const numericValue = parseInt(value);
        setEditingProduct(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [name]: isNaN(numericValue) ? 0 : numericValue
          };
        });
      }
    } else {
    setEditingProduct(prev => {
      if (!prev) return prev;
      return {
        ...prev,
          [name]: value
      };
    });
    }
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setProductToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/deleteInventoryProductapi', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: productToDelete.code
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al eliminar el producto del inventario');
      }

      setInventory(prev => prev.filter(item => item.code !== productToDelete.code));
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      setSuccessMessage(`Producto eliminado del inventario: ${productToDelete.name}`);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al eliminar el producto del inventario');
    } finally {
      setIsLoading(false);
    }
  };

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
            placeholder="Buscar por nombre o código..."
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
          <button
            onClick={handleAddProductClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? 'Cargando...' : 'Agregar Producto'}
          </button>
        </div>
      </div>

      {/* Tabla principal / Vista de costos */}
      {showCostView ? (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponibles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {inventoryCostRows.map((row) => (
                  <tr key={row.code}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPrice(row.unitPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatPrice(row.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-700" colSpan={4}>Costo total del inventario</td>
                  <td className="px-6 py-3 text-sm font-bold text-indigo-700">{formatPrice(grandTotalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {showCostView && products.length === 0 && (
            <div className="p-4 text-sm text-gray-600">Cargando costos...</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mínimo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Actualización</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => {
                  const product = products.find((p) => p.code === item.code);
                  const unitPrice = product?.costPrice ?? product?.price ?? 0;
                  const totalCost = unitPrice * (item.stock ?? 0);
                  return (
                <tr key={item.code}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.stock <= item.minStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{item.stock}</span>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.minStock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPrice(unitPrice)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatPrice(totalCost)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.lastUpdate!).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                          <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:text-blue-800" aria-label="Editar inventario">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                          <button onClick={() => handleDeleteClick(item)} className="text-red-600 hover:text-red-800" aria-label="Eliminar del inventario">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal de Selección de Producto */}
      {isProductSelectionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Seleccionar Producto</h2>
            
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categoryNames.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'Todas las categorías' : category}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.code}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleProductSelect(product)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsProductSelectionModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar Producto */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agregar Producto al Inventario</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Código del Producto
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={newProduct.code}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newProduct.name}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={newProduct.category}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                  Stock
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={newProduct.stock}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  id="minStock"
                  name="minStock"
                  value={newProduct.minStock}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="0"
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

      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Editar Producto en Inventario</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="edit-code" className="block text-sm font-medium text-gray-700">
                  Código del Producto
                </label>
                <input
                  type="text"
                  id="edit-code"
                  value={editingProduct.code}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={editingProduct.name}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <input
                  type="text"
                  id="edit-category"
                  value={editingProduct.category}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="edit-stock" className="block text-sm font-medium text-gray-700">
                  Stock Actual
                </label>
                <input
                  type="number"
                  id="edit-stock"
                  name="stock"
                  value={editingProduct.stock}
                  onChange={handleEditInputChange}
                  required
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="add-stock" className="block text-sm font-medium text-gray-700">
                    Agregar al Stock
                  </label>
                  <input
                    type="number"
                    id="add-stock"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(e.target.value.replace(/[^0-9]/g, ''))}
                    min="1"
                    placeholder="Cantidad a agregar"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddStock}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400"
                  disabled={isLoading || !stockToAdd}
                >
                  {isLoading ? 'Agregando...' : 'Agregar'}
                </button>
              </div>

              <div>
                <label htmlFor="edit-minStock" className="block text-sm font-medium text-gray-700">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  id="edit-minStock"
                  name="minStock"
                  value={editingProduct.minStock}
                  onChange={handleEditInputChange}
                  required
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingProduct(null);
                    setStockToAdd('');
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

      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirmar Eliminación</h2>
            <p className="text-gray-700 mb-4">
              ¿Está seguro que desea eliminar el producto "{productToDelete.name}" del inventario?
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
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
    </div>
  );
};

export default InventoryContent; 