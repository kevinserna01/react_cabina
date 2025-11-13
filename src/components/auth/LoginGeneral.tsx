import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LightRays from '../ui/LightRays';
import Aurora from '../ui/Aurora';
import GlassSurface from '../ui/GlassSurface';

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
  const [showPassword, setShowPassword] = useState(false);
  
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
    <div className="min-h-screen flex flex-col items-stretch relative overflow-hidden bg-[#0a0a1f]">
      {/* Background - Aurora for Mobile, LightRays for Desktop */}
      <div className="absolute inset-0 w-full h-full lg:hidden">
        <Aurora />
      </div>
      <div className="absolute inset-0 w-full h-full hidden lg:block">
        <LightRays />
      </div>

      {/* Navbar with GlassSurface */}
      <div className="w-full flex justify-center pt-6 px-6 lg:px-12 absolute top-0 left-0 right-0 z-50">
        <GlassSurface
          width="100%"
          height={70}
        >
          <nav className="w-full h-full flex items-center justify-between px-6 lg:px-12">
            {/* Logo Text */}
            <div className="flex items-center">
              <h1 className="text-2xl text-white flex items-center">
                <span className="font-bold">Pyme</span>
                <span className="font-light">Track</span>
              </h1>
            </div>

            {/* Navigation Links - Desktop only */}
            <div className="hidden md:flex items-center gap-8">
              <button
                className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-200"
                onClick={() => {/* TODO: Navigate to Quienes somos */}}
              >
                Quienes somos
              </button>
              <button
                className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-200"
                onClick={() => {/* TODO: Navigate to Haz parte */}}
              >
                Haz parte
              </button>
            </div>
          </nav>
        </GlassSurface>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row w-full pt-32">
        
        {/* Left Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative z-10">
          <div className="w-full max-w-md">
            {!requiresVerification ? (
              // Formulario de Login
              <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-8 space-y-8">
                {/* Avatar Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Iniciar Sesión
                  </h2>
                  <p className="text-sm text-white/60">
                    Ingresa tus credenciales para continuar
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-100 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Email Input */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200"
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                        Contraseña
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/80 transition-colors"
                        >
                          {showPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white hover:border-white text-gray-300 hover:text-gray-700 font-semibold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Iniciando sesión...</span>
                      </>
                    ) : (
                      <>
                        <span>Iniciar Sesión</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              // Formulario de Verificación OTP
              <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-8 space-y-8">
                <div>
                  <h2 className="text-4xl font-bold text-white mb-2">
                    Verificación de Código
                  </h2>
                  <p className="text-sm text-white/60">
                    Hemos enviado un código de verificación a tu email
                  </p>
                </div>

                <form className="space-y-6" onSubmit={handleVerifyOTP}>
                  {otpError && (
                    <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-100 px-4 py-3 rounded-lg text-sm">
                      {otpError}
                    </div>
                  )}
                  
                  <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 text-blue-100 px-4 py-3 rounded-lg">
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
                    <label htmlFor="otpCode" className="block text-sm font-medium text-white/90 mb-2 text-center">
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
                      className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-center text-3xl tracking-[0.5em] font-bold"
                      placeholder="000000"
                    />
                  </div>

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 6}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      {otpLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verificando...
                        </span>
                      ) : (
                        'Verificar Código'
                      )}
                    </button>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={!canResend || otpLoading}
                        className="flex-1 py-2.5 px-4 bg-blue-950/30 backdrop-blur-sm border border-blue-500/30 text-sm font-medium rounded-lg text-white hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {otpLoading ? 'Enviando...' : 'Reenviar Código'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        disabled={otpLoading}
                        className="flex-1 py-2.5 px-4 bg-blue-950/30 backdrop-blur-sm border border-blue-500/30 text-sm font-medium rounded-lg text-white hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Volver al Login
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Welcome Message */}
        <div className="hidden lg:flex w-full lg:w-1/2 items-start justify-center relative p-12 pt-12">
          {/* Welcome Text */}
          <div className="relative z-10 text-center max-w-lg">
            {/* Logo */}
            <div className="flex justify-center">
              <img 
                src="/assets/logopyme.png" 
                alt="PymeTrack Logo" 
                className="h-86 w-86 object-contain drop-shadow-2xl"
              />
            </div>
            
            <h1 className="text-7xl font-bold text-white drop-shadow-2xl -mt-16">
              Bienvenido.
            </h1>
            <div className="space-y-2">
              <p className="text-white/90 text-lg font-medium">
                Bienvenido a PymeTrack
              </p>
              <p className="text-white/50 text-sm">
                Tu automatización al alcance de tu mano
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" aria-modal="true" role="dialog" tabIndex={0}>
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center focus:outline-none transform scale-100 animate-in fade-in zoom-in duration-300" role="alertdialog" aria-label="Bienvenida">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              ¡Bienvenido{welcomeName ? `, ${welcomeName}` : ''}!
            </h3>
            <p className="text-white/80">Redirigiendo a tu panel...</p>
            <div className="mt-4">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginGeneral; 