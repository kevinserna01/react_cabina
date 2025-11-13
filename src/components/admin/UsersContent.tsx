import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  status: 'active' | 'inactive';
}

const UsersContent: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker' as 'admin' | 'worker',
    status: 'active' as 'active' | 'inactive'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/getUsersapi', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        throw new Error(errorData.message || 'Error al cargar usuarios');
      }

      const data = await response.json();
      
      if (data.status === "Success" && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status
    });
    setShowModal(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setError(null);
    try {
      const response = await fetch(`https://back-papeleria-two.vercel.app/v1/papeleria/deleteUserapi/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el usuario');
      }
      setShowDeleteModal(false);
      setUserToDelete(null);
      setShowDeleteSuccess(true);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      let response;
      
      if (selectedUser) {
        const updateData: { email?: string; password?: string; status?: 'active' | 'inactive' } = {};
        
        if (formData.email !== selectedUser.email) {
          updateData.email = formData.email;
        }
        if (formData.password) {
          updateData.password = formData.password;
        }
        if (formData.status !== selectedUser.status) {
          updateData.status = formData.status;
        }

        if (Object.keys(updateData).length === 0) {
          setShowModal(false);
          return;
        }

        response = await fetch(
          `https://back-papeleria-two.vercel.app/v1/papeleria/updateUserapi/${selectedUser.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al actualizar el usuario');
        }

        const result = await response.json();
        
        if (result.status === "Success") {
          setShowModal(false);
          setSelectedUser(null);
          setFormData({
            name: '',
            email: '',
            password: '',
            role: 'worker',
            status: 'active'
          });
          fetchUsers();
        } else {
          throw new Error(result.message || 'Error en la operación');
        }
      } else {
        response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/createUserapi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al crear el usuario');
        }

        const result = await response.json();
        
        if (result.status === "Success") {
          setShowModal(false);
          setSelectedUser(null);
          setCreatedUserInfo({ email: formData.email, password: formData.password });
          setShowSuccessModal(true);
          setFormData({
            name: '',
            email: '',
            password: '',
            role: 'worker',
            status: 'active'
          });
          fetchUsers();
        } else {
          throw new Error(result.message || 'Error en la operación');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        <button
          onClick={() => {
            setSelectedUser(null);
            setFormData({
              name: '',
              email: '',
              password: '',
              role: 'worker',
              status: 'active'
            });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Nuevo Usuario
        </button>
      </div>

      {users.length === 0 ? (
        <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow p-6 border dark:border-white/20 light:border-gray-200">
          <p className="dark:text-white/80 light:text-gray-600 text-center">
            No hay usuarios registrados. Crea un nuevo usuario para comenzar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y dark:divide-white/10 light:divide-gray-200">
            <thead className="dark:bg-white/5 light:bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="dark:bg-transparent light:bg-white divide-y dark:divide-white/10 light:divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-white light:text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500">
                    {user.role === 'admin' ? 'Administrador' : 'Trabajador'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900"
                      aria-label={`Editar usuario ${user.name}`}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-red-600 hover:text-red-900 ml-2"
                      aria-label={`Eliminar usuario ${user.name}`}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDelete(user); }}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[90] flex items-center justify-center p-2 sm:p-0">
          <div className="relative mx-2 sm:mx-auto w-full max-w-md p-2 sm:p-5 border shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium dark:text-white light:text-gray-900">
                {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              {error && (
                <div className="mt-2 text-sm text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="name" className="block dark:text-white/90 light:text-gray-700 text-sm font-bold mb-2">Nombre</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={!!selectedUser}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 dark:text-white/90 light:text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${selectedUser ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block dark:text-white/90 light:text-gray-700 text-sm font-bold mb-2">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="shadow appearance-none border rounded w-full py-2 px-3 dark:text-white/90 light:text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block dark:text-white/90 light:text-gray-700 text-sm font-bold mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!selectedUser}
                      className="shadow appearance-none border rounded w-full py-2 px-3 dark:text-white/90 light:text-gray-700 leading-tight focus:outline-none focus:shadow-outline pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={0}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 flex items-center dark:text-white/70 light:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block dark:text-white/90 light:text-gray-700 text-sm font-bold mb-2">Rol</label>
                  <select
                    name="role"
                    value="worker"
                    disabled
                    className="shadow appearance-none border rounded w-full py-2 px-3 dark:text-white/90 light:text-gray-700 bg-gray-100 cursor-not-allowed"
                  >
                    <option value="worker">Trabajador</option>
                  </select>
                </div>
                {selectedUser && (
                  <div>
                    <label className="block dark:text-white/90 light:text-gray-700 text-sm font-bold mb-2">Estado</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="shadow appearance-none border rounded w-full py-2 px-3 dark:text-white/90 light:text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                )}
                <div className="flex items-center justify-end mt-6 gap-2">
                  <button
                    type="button"
                    className="bg-gray-300 dark:text-white/90 light:text-gray-700 px-4 py-2 rounded hover:bg-gray-400 w-full sm:w-auto"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full sm:w-auto"
                  >
                    {selectedUser ? 'Actualizar' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[90] flex items-center justify-center p-2 sm:p-0" aria-modal="true" role="dialog" tabIndex={0}>
          <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow-lg p-2 sm:p-6 max-w-sm w-full text-center mx-2 sm:mx-auto border dark:border-white/20 light:border-gray-200">
            <h3 className="text-lg font-bold dark:text-white light:text-gray-900 mb-4">¿Eliminar trabajador?</h3>
            <p className="dark:text-white/90 light:text-gray-700 mb-6">¿Estás seguro de que deseas eliminar al trabajador <span className="font-semibold">{userToDelete.name}</span>? Esta acción no se puede deshacer.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                className="bg-gray-300 dark:text-white/90 light:text-gray-700 px-4 py-2 rounded hover:bg-gray-400 w-full sm:w-auto"
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
              >
                Cancelar
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full sm:w-auto"
                onClick={confirmDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito al crear usuario */}
      {showSuccessModal && createdUserInfo && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[90] flex items-center justify-center p-2 sm:p-0" aria-modal="true" role="dialog" tabIndex={0}>
          <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow-lg p-2 sm:p-6 max-w-sm w-full text-center mx-2 sm:mx-auto border dark:border-white/20 light:border-gray-200">
            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center justify-center gap-2">
              <CheckIcon className="w-6 h-6 text-green-600" /> Usuario creado exitosamente
            </h3>
            <div className="mb-2">
              <span className="block dark:text-white/90 light:text-gray-700 font-semibold">Email:</span>
              <span className="block dark:text-white light:text-gray-900 mb-2">{createdUserInfo.email}</span>
              <span className="block dark:text-white/90 light:text-gray-700 font-semibold">Contraseña:</span>
              <span className="block dark:text-white light:text-gray-900 mb-2">{createdUserInfo.password}</span>
            </div>
            <button
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mx-auto mb-4 w-full sm:w-auto"
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${createdUserInfo.email}\nContraseña: ${createdUserInfo.password}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <ClipboardIcon className="w-5 h-5" />
              {copied ? '¡Copiado!' : 'Copiar datos'}
            </button>
            <button
              className="bg-gray-300 dark:text-white/90 light:text-gray-700 px-4 py-2 rounded hover:bg-gray-400 w-full sm:w-auto"
              onClick={() => { setShowSuccessModal(false); setCreatedUserInfo(null); }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de éxito al eliminar usuario */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[90] flex items-center justify-center p-2 sm:p-0" aria-modal="true" role="dialog" tabIndex={0}>
          <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow-lg p-2 sm:p-6 max-w-sm w-full text-center mx-2 sm:mx-auto border dark:border-white/20 light:border-gray-200">
            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center justify-center gap-2">
              <CheckIcon className="w-6 h-6 text-green-600" /> Usuario eliminado exitosamente
            </h3>
            <button
              className="bg-gray-300 dark:text-white/90 light:text-gray-700 px-4 py-2 rounded hover:bg-gray-400 w-full sm:w-auto"
              onClick={() => setShowDeleteSuccess(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersContent; 