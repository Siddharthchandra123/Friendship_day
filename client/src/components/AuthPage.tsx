import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Lock, User as UserIcon, Smile, Sparkles, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || 'Invalid credentials');
        }
      } else {
        if (nickname.trim().length < 2) {
          setError('Nickname must be at least 2 characters.');
          setIsLoading(false);
          return;
        }
        const res = await register(username, nickname, password);
        if (!res.success) {
          setError(res.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setUsername('');
    setNickname('');
    setPassword('');
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex items-center justify-center overflow-hidden font-sans p-4">
      {/* Aurora Background Effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[150px] animate-pulse pointer-events-none" />

      {/* Auth Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-3xl backdrop-blur-2xl bg-slate-950/40 border border-white/10 p-8 md:p-10 shadow-2xl z-10"
      >
        {/* Glow behind logo */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-purple-500/20 blur-xl pointer-events-none" />

        {/* Logo / Header */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 border border-white/20 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
            <Heart className="fill-white animate-pulse" size={24} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            Friend<span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Verse</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            {isLogin ? 'Welcome back! Log in to join your friend\'s celebration.' : 'Create an account to host or join shared rooms securely.'}
          </p>
        </div>

        {/* Error Notification */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <UserIcon size={16} />
              </span>
              <input
                type="text"
                required
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-3 text-base text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-600 bg-slate-900/30"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Nickname Input (Only for Register) */}
          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-2 overflow-hidden"
              >
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Nickname
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                    <Smile size={16} />
                  </span>
                  <input
                    type="text"
                    required={!isLogin}
                    placeholder="Johnny"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-3 text-base text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-600 bg-slate-900/30"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-3 text-base text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-600 bg-slate-900/30"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 border border-white/10 text-white font-bold text-base cursor-pointer shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
                <Sparkles size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer toggle */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <span>{isLogin ? "Don't have an account? " : 'Already have an account? '}</span>
          <button 
            onClick={toggleAuthMode}
            className="text-purple-400 hover:text-purple-300 font-bold underline transition-colors cursor-pointer bg-transparent border-none p-0"
            disabled={isLoading}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
export default AuthPage;
