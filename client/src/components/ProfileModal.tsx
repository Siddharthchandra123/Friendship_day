import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { X, Camera, Lock, CheckCircle, AlertCircle, LogOut } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, logout } = useAuth();
  
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1000 * 1024) { // Limit to 1MB to avoid database bloat
      setError('Profile picture must be smaller than 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    if (nickname.trim().length < 2) {
      setError('Nickname must be at least 2 characters.');
      setIsLoading(false);
      return;
    }

    if (password && password.length < 6) {
      setError('New password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await updateProfile(nickname.trim(), avatar, password || undefined);
      if (res.success) {
        setSuccess(true);
        setPassword('');
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      onClose();
      await logout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl z-10 text-white"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h2 className="text-2xl font-bold tracking-tight mb-6 font-display">Edit Profile</h2>

        {/* Success/Error Alerts */}
        {success && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm mb-5">
            <CheckCircle size={16} className="shrink-0" />
            <span>Profile settings updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Picture Uploader */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border border-white/10 overflow-hidden bg-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
                {avatar ? (
                  <img src={avatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-extrabold text-purple-300 uppercase select-none">
                    {nickname ? nickname.charAt(0) : user.username.charAt(0)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full border-2 border-slate-900 cursor-pointer shadow transition-all duration-200"
                title="Change Avatar"
              >
                <Camera size={14} />
              </button>
            </div>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <span className="text-xs text-slate-500">Max size 1MB (jpg/png)</span>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Nickname
            </label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full glass-input px-4 py-3 text-base text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all bg-slate-950/20"
              disabled={isLoading}
              maxLength={15}
            />
          </div>

          {/* Change Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
              <Lock size={12} />
              New Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input px-4 py-3 text-sm text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-600 bg-slate-950/20"
              disabled={isLoading}
            />
          </div>

          {/* Button Layout */}
          <div className="flex gap-3 pt-3 border-t border-white/5">
            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/35 text-red-300 rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-[0.98]"
              title="Log Out"
            >
              <LogOut size={18} />
            </button>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-base border border-white/10 rounded-2xl shadow-lg cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                'Update Profile'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
export default ProfileModal;
