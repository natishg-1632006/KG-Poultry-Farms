import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoadingState(true);

    try {
      await login(email.trim(), password);
      navigate('/farmer/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoadingState(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setLoadingState(true);
    try {
      await loginWithGoogle();
      navigate('/farmer/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Google Sign-In failed.');
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50/70 via-slate-50 to-teal-50/80 p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Light Radial Glow Effects */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />

      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:28px_28px] opacity-15 pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 border border-slate-200/80 ring-1 ring-slate-900/5 overflow-hidden">
        {/* Top Accent Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        <div className="text-center space-y-2 pt-2">
          <img
            src="/kg-logo.jpg"
            alt="KG Poultry Farms Logo"
            className="mx-auto h-20 w-20 object-contain rounded-2xl shadow-sm ring-1 ring-emerald-500/20 p-1 bg-white"
          />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">KG Poultry Farms</h2>
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 py-1.2 px-3.5 rounded-full inline-block border border-emerald-200/80 shadow-2xs">
            Broiler Farm Operations & Intelligence
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200 animate-fade-in shadow-2xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Registered Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kgpoultryfarms@gmail.com"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingState}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-50 active:scale-95 cursor-pointer mt-2"
          >
            {loadingState ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying Credentials...
              </span>
            ) : (
              <>
                <span>Sign In to Shed Portal</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative border-t border-slate-200/80 pt-4">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-xs font-semibold text-slate-400">
            or continue with
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingState}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
