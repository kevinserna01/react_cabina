import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginResponse {
  status: string;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'worker';
    status: 'active' | 'inactive';
  };
  // Campos para OTP
  requiresVerification?: boolean;
  userId?: string;
  userType?: 'trabajador' | 'admin';
  emailSent?: boolean;
  emailMessage?: string;
  // Token de autenticación
  token?: string;
}

const LoginGeneral: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  
  // Estados para OTP
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<'trabajador' | 'admin' | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Función para verificar código OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setOtpLoading(true);

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: otpCode,
          userId: userId,
          userType: userType
        }),
      });

      const data = await response.json();

      if (data.status === "Success" && data.user) {
        // Login exitoso
        // Mapear el role del backend al formato esperado por el frontend
        const mappedRole = (data.user.role as string) === 'trabajador' ? 'worker' : data.user.role;
        
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userRole', mappedRole);
        localStorage.setItem('userStatus', data.user.status);
        // Guardar token si viene en la respuesta
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        setWelcomeName(data.user.name);
        setShowWelcomeModal(true);
        setTimeout(() => {
          setShowWelcomeModal(false);
          if (mappedRole === 'admin') {
            navigate('/admin');
          } else {
            navigate('/sales');
          }
        }, 1500);
        return;
      } else {
        throw new Error(data.message || 'Código inválido o expirado');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setOtpError(err instanceof Error ? err.message : 'Error al verificar código');
    } finally {
      setOtpLoading(false);
    }
  };

  // Función para reenviar código OTP
  const handleResendOTP = async () => {
    if (!userId || !userType) return;
    
    setOtpError(null);
    setOtpLoading(true);

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          userType: userType
        }),
      });

      const data = await response.json();

      if (data.status === "Success" && data.emailSent) {
        setTimeLeft(300); // Resetear contador a 5 minutos
        setCanResend(false);
        setOtpError(null);
        setOtpCode('');
      } else {
        throw new Error(data.message || 'Error al reenviar código');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setOtpError(err instanceof Error ? err.message : 'Error al reenviar código');
    } finally {
      setOtpLoading(false);
    }
  };

  // Función para volver al login
  const handleBackToLogin = () => {
    setRequiresVerification(false);
    setOtpCode('');
    setUserId(null);
    setUserType(null);
    setOtpError(null);
    setTimeLeft(0);
    setCanResend(false);
  };

  // useEffect para el contador de tiempo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/loginUserapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();
      console.log('API Response:', data);

      if (data.status === "Error" || !response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      if (data.status === "Success") {
        // Verificar si requiere verificación OTP
        if (data.requiresVerification && data.userId && data.userType) {
          setRequiresVerification(true);
          setUserId(data.userId);
          setUserType(data.userType);
          setTimeLeft(300); // 5 minutos en segundos
          setCanResend(false);
          setOtpError(null);
          setOtpCode('');
          return;
        }
        
        // Login directo (sin OTP)
        if (data.user) {
          if (data.user.status === 'inactive') {
            throw new Error('Tu cuenta está inactiva. Por favor, contacta al administrador.');
          }
          
          // Mapear el role del backend al formato esperado por el frontend
          const mappedRole = (data.user.role as string) === 'trabajador' ? 'worker' : data.user.role;
          
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('userRole', mappedRole);
          localStorage.setItem('userStatus', data.user.status);
          // Guardar token si viene en la respuesta
          if (data.token) {
            localStorage.setItem('token', data.token);
          }
          setWelcomeName(data.user.name);
          setShowWelcomeModal(true);
          setTimeout(() => {
            setShowWelcomeModal(false);
            if (mappedRole === 'admin') {
              navigate('/admin');
            } else {
              navigate('/sales');
            }
          }, 1500);
          return;
        }
      }
      
      throw new Error('Respuesta inválida del servidor');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear tiempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {!requiresVerification ? (
          // Formulario de Login
          <>
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Iniciar Sesión
              </h2>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : null}
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
          </>
        ) : (
          // Formulario de Verificación OTP
          <>
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Verificación de Código
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Hemos enviado un código de verificación a tu email
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
              {otpError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {otpError}
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                <p className="text-sm">
                  <strong>Instrucciones:</strong> Revisa tu correo electrónico y ingresa el código de 6 dígitos que te enviamos.
                </p>
                {timeLeft > 0 && (
                  <p className="text-sm mt-1">
                    El código expira en: <strong>{formatTime(timeLeft)}</strong>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="otpCode" className="sr-only">
                  Código de Verificación
                </label>
                <input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpLoading ? (
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  ) : null}
                  {otpLoading ? 'Verificando...' : 'Verificar Código'}
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={!canResend || otpLoading}
                    className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otpLoading ? 'Enviando...' : 'Reenviar Código'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={otpLoading}
                    className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Volver al Login
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-modal="true" role="dialog" tabIndex={0}>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center focus:outline-none" role="alertdialog" aria-label="Bienvenida">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Bienvenido{welcomeName ? `, ${welcomeName}` : ''}!</h3>
            <p className="text-gray-600">Redirigiendo a tu panel...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginGeneral; 