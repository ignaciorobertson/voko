import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Shield,
  KeyRound,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { authApi, AuthUser } from '../api/auth.api.js';
import ShapeWaves from '../components/ShapeWaves.js';
import { VokoLogo } from '../components/VokoLogo.js';
import {
  playDewSound,
  playClaspSound,
  playUnclaspSound,
  isSoundEnabled,
  toggleSound,
} from '../utils/soundEffects.js';

type AuthMode = 'login' | 'register' | 'forgot';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [soundActive, setSoundActive] = useState<boolean>(isSoundEnabled());

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar usuario autenticado existente
  useEffect(() => {
    const token = localStorage.getItem('voko_token');
    if (token) {
      authApi
        .getMe()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem('voko_token');
          setCurrentUser(null);
        })
        .finally(() => setIsLoadingUser(false));
    } else {
      setIsLoadingUser(false);
    }
  }, []);

  const handleToggleSound = () => {
    const nextState = toggleSound();
    setSoundActive(nextState);
  };

  // Iniciar sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    playDewSound();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await authApi.login(email.trim(), password);
      setCurrentUser(res.user);
      setSuccessMessage('¡Sesión iniciada con éxito! Redirigiendo...');

      setTimeout(() => {
        if (res.user.isSuperadmin) {
          navigate('/superadmin');
        } else {
          navigate('/portal');
        }
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Credenciales inválidas. Verifica tu correo y contraseña.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Crear cuenta (Registro)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    playDewSound();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await authApi.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });

      setCurrentUser(res.user);
      setSuccessMessage('¡Cuenta creada con éxito! Bienvenido a Voko.');

      setTimeout(() => {
        navigate('/portal');
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Error al crear la cuenta. Intenta con otro correo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recuperar contraseña
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    playDewSound();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword(email.trim());
      setSuccessMessage(
        'Si el correo está registrado, recibirás un enlace seguro para restablecer tu contraseña.',
      );
    } catch (err: any) {
      setErrorMessage('Ocurrió un error al procesar tu solicitud. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    playDewSound();
    localStorage.removeItem('voko_token');
    setCurrentUser(null);
  };

  // Rellenar credenciales de prueba rápidas
  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    playDewSound();
    setEmail(demoEmail);
    setPassword(demoPass);
    setMode('login');
    setErrorMessage(null);
    setSuccessMessage('Credenciales de demostración cargadas.');
  };

  const switchToLogin = () => {
    playClaspSound();
    setMode('login');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchToRegister = () => {
    playUnclaspSound();
    setMode('register');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 overflow-hidden bg-[#120f17]">
      {/* ======================================================== */}
      {/* 1. Fondo Interactivo ShapeWaves (ReactBits Studio)       */}
      {/* ======================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <ShapeWaves
          text="Voko"
          fontFamily='Inter, "Geist Sans", system-ui, sans-serif'
          fontWeight={800}
          textSize={0.55}
          shapes="mixed"
          cellSize={10}
          dotSize={0.75}
          color="#929292"
          hoverColor="#ffffff"
          backgroundColor="#120f17"
          speed={1}
          scale={1}
          contrast={1}
          brightness={0.4}
          flow={0}
          direction={0}
          fade={0.15}
          interactive={true}
          splashRadius={40}
          splashStrength={0.4}
          glow={0.35}
          intro={true}
          introDuration={1.6}
          paused={false}
          className="w-full h-full"
        />
      </div>

      {/* Control flotante discreto de audio para activar/silenciar efectos */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={handleToggleSound}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/15 text-xs font-medium text-zinc-300 hover:text-white hover:border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-all"
          title="Activar / Desactivar efectos de sonido ReactBits"
        >
          {soundActive ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Audio ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">Audio OFF</span>
            </>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. Contenedor Principal (Tarjeta Minimalista Monocromo)   */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-md mx-auto space-y-6">
        {/* Cabecera con Logotipo y Breve Descripción con Alto Contraste */}
        <div className="text-center space-y-3">
          <div className="inline-block transform hover:scale-105 transition-transform duration-300">
            {/* Logo de Voko con halo plata y levitación suave */}
            <div className="relative inline-block">
              <div className="absolute -inset-3 bg-gradient-to-r from-white/10 via-zinc-400/10 to-white/10 rounded-3xl blur-xl opacity-60 pointer-events-none" />
              <VokoLogo
                className="relative h-12 sm:h-14 w-auto mx-auto drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)] animate-float"
              />
            </div>
          </div>

          {/* Caja protectora con sutil frosted glass para máxima legibilidad sobre el fondo */}
          <div className="space-y-2 py-2 px-4 rounded-3xl backdrop-blur-md bg-black/40 border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.7)] max-w-lg mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-300 tracking-tight drop-shadow-[0_2px_15px_rgba(255,255,255,0.2)]">
              Gestión Inteligente de Turnos
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] font-medium">
              La plataforma ágil para administrar citas, clases y reservas en tu negocio sin complicaciones.
            </p>
          </div>
        </div>

        {/* Tarjeta Central Interactiva Monocromo Luxury Glassmorphism */}
        <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-zinc-950/85 border border-white/15 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(255,255,255,0.03)] hover:border-white/25 transition-all duration-500">
          {/* Resplandor sutil plata en el borde superior */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)]" />

          {isLoadingUser ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
              <p className="text-xs text-zinc-400 font-medium">Verificando sesión...</p>
            </div>
          ) : currentUser ? (
            /* Vista para usuario ya autenticado */
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 bg-zinc-900 border border-white/20 rounded-2xl flex items-center justify-center mx-auto text-white font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                {currentUser.firstName.charAt(0)}
                {currentUser.lastName.charAt(0)}
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-0.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.08)]">
                  Sesión Activa
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  ¡Hola, {currentUser.firstName} {currentUser.lastName}!
                </h3>
                <p className="text-xs text-zinc-400">{currentUser.email}</p>
              </div>

              <div className="space-y-2.5 pt-2">
                {currentUser.isSuperadmin && (
                  <Link
                    to="/superadmin"
                    onClick={() => playDewSound()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm border border-zinc-700 shadow-lg transition-all"
                  >
                    <Shield className="w-4 h-4 text-zinc-300" />
                    <span>Consola Superadmin</span>
                  </Link>
                )}

                <Link
                  to="/admin"
                  onClick={() => playDewSound()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Panel de Negocios</span>
                </Link>

                <Link
                  to="/portal"
                  onClick={() => playDewSound()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-sm transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-zinc-400" />
                  <span>Área de Clientes</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/20 text-xs font-semibold transition-colors mt-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          ) : (
            /* Vista de Formulario (Login / Register / Forgot Password) */
            <div className="space-y-5">
              {/* Selector de Modo (Tabs interactivos con sonidos Clasp y Unclasp) */}
              {mode !== 'forgot' && (
                <div className="grid grid-cols-2 p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs font-bold text-zinc-400">
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className={`py-2 rounded-xl transition-all duration-300 ${
                      mode === 'login'
                        ? 'bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.25)] font-black'
                        : 'hover:text-white'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className={`py-2 rounded-xl transition-all duration-300 ${
                      mode === 'register'
                        ? 'bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.25)] font-black'
                        : 'hover:text-white'
                    }`}
                  >
                    Crear Cuenta
                  </button>
                </div>
              )}

              {/* Mensajes de Alerta / Éxito */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 flex items-start gap-2 text-xs text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/20 flex items-start gap-2 text-xs text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* MODO 1: INICIAR SESIÓN */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-sm focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-300">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          playDewSound();
                          setMode('forgot');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-sm focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          playDewSound();
                          setShowPassword(!showPassword);
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-sm tracking-wide shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] disabled:opacity-60 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        Ingresando...
                      </span>
                    ) : (
                      <>
                        <span>Ingresar a Voko</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-zinc-400">
                      ¿No tienes cuenta?{' '}
                      <button
                        type="button"
                        onClick={switchToRegister}
                        className="font-bold text-white hover:text-zinc-300 underline"
                      >
                        Crear una cuenta gratis
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* MODO 2: CREAR CUENTA */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">Nombre</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Juan"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-xs focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">Apellido</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Pérez"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-xs focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="juan.perez@correo.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-xs focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Teléfono de Contacto <span className="text-zinc-500 font-normal">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+54 9 11 1234-5678"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-xs focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Contraseña <span className="text-zinc-500 font-normal">(Mín. 8 caracteres)</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-xs focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          playDewSound();
                          setShowPassword(!showPassword);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-xs tracking-wide shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] disabled:opacity-60 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        Creando cuenta...
                      </span>
                    ) : (
                      <>
                        <span>Crear Cuenta Gratis</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-zinc-400">
                      ¿Ya tienes una cuenta?{' '}
                      <button
                        type="button"
                        onClick={switchToLogin}
                        className="font-bold text-white hover:text-zinc-300 underline"
                      >
                        Iniciar Sesión
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* MODO 3: RECUPERAR CONTRASEÑA */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="text-center space-y-1 pb-1">
                    <div className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-center mx-auto text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      Recuperar Contraseña
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Ingresa tu correo y te enviaremos un enlace seguro para restablecer tu clave.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu.correo@ejemplo.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white text-sm focus:border-white focus:ring-2 focus:ring-white/20 focus:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] disabled:opacity-60 transition-all"
                  >
                    {isSubmitting ? 'Enviando enlace...' : 'Enviar Instrucciones'}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                    >
                      ← Volver a Iniciar Sesión
                    </button>
                  </div>
                </form>
              )}

              {/* Acceso Rápido a Cuentas Demo de Prueba */}
              <div className="pt-3 border-t border-zinc-800/80">
                <details className="group">
                  <summary
                    onClick={() => playDewSound()}
                    className="text-[11px] font-semibold text-zinc-400 hover:text-white cursor-pointer text-center list-none flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>⚡ ¿Probar con credenciales de prueba?</span>
                  </summary>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('owner@vokobarber.test', 'Password123!')}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 font-medium transition-all text-center"
                    >
                      Negocio
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('cliente1@test.com', 'Password123!')}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 font-medium transition-all text-center"
                    >
                      Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('superadmin@voko.test', 'VokoSuperAdmin2026!')}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 font-medium transition-all text-center"
                    >
                      Superadmin
                    </button>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Acceso Elegante al Playground de Demostración para Clientes */}
        <div className="text-center">
          <Link
            to="/playground"
            onClick={() => playDewSound()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white font-semibold text-xs transition-all shadow-[0_4px_25px_rgba(0,0,0,0.8)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] group"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300 group-hover:text-white animate-pulse" />
            <span>¿Querés ver cómo reservan tus clientes?</span>
            <span className="font-bold underline text-white group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Explorar Playground de Negocios
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};
