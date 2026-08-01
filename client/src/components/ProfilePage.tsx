import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Heart, Trash2, Send, Palette, BookOpen, Settings, Smile, Image as ImageIcon, Sparkles, X } from 'lucide-react';

interface ProfilePageProps {
  onBack: () => void;
}

interface Post {
  id: string;
  user_id: string;
  nickname: string;
  avatar: string | null;
  content: string;
  media: string | null;
  likes: string[];
  timestamp: number;
}

const THEMES = [
  { id: 'aurora', name: 'Classic Aurora', desc: 'Mystical dark slate with glowing indigo & purple gradients', colors: ['#020617', '#a855f7', '#6366f1'] },
  { id: 'pastel', name: 'Pastel Dream', desc: 'Soft rose cream light mode with peach & pink accents', colors: ['#fafaf9', '#ec4899', '#f43f5e'] },
  { id: 'sunset', name: 'Sunset Glow', desc: 'Warm charcoal dark mode with golden amber & orange rays', colors: ['#0c0a09', '#f97316', '#eab308'] },
  { id: 'emerald', name: 'Emerald Forest', desc: 'Fresh deep teal wilderness with glowing mint accents', colors: ['#022c22', '#10b981', '#06b6d4'] },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Retro-futurist pitch black with cyan borders & hot pink glow', colors: ['#000000', '#ff00ff', '#00ffff'] },
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, updateProfile, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'feed' | 'themes' | 'settings'>('feed');
  
  // Feed States
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Settings States
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const postImageRef = useRef<HTMLInputElement | null>(null);

  const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://friendverse-signaling.onrender.com/api';

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostMedia) return;

    setIsPublishing(true);
    setFeedError(null);

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPostContent.trim(), media: newPostMedia }),
        credentials: 'include',
      });

      if (res.ok) {
        setNewPostContent('');
        setNewPostMedia(null);
        await fetchPosts();
      } else {
        const data = await res.json();
        setFeedError(data.error || 'Failed to publish post');
      }
    } catch (err) {
      setFeedError('Network error occurred');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p));
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Delete this post permanently?')) return;

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handlePostMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      setFeedError('Images must be smaller than 800KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPostMedia(reader.result as string);
      setFeedError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setSettingsError('Avatars must be smaller than 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setSettingsError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(false);
    setIsSavingSettings(true);

    if (nickname.trim().length < 2) {
      setSettingsError('Nickname must be at least 2 characters.');
      setIsSavingSettings(false);
      return;
    }

    if (password && password.length < 6) {
      setSettingsError('Password must be at least 6 characters.');
      setIsSavingSettings(false);
      return;
    }

    try {
      const res = await updateProfile(nickname.trim(), avatar, password || undefined);
      if (res.success) {
        setSettingsSuccess(true);
        setPassword('');
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        setSettingsError(res.error || 'Failed to update profile');
      }
    } catch (err) {
      setSettingsError('Network error occurred');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (!user) return;
    try {
      await updateProfile(undefined, undefined, undefined, themeId);
    } catch (err) {
      console.error('Failed to update theme:', err);
    }
  };

  return (
    <div className="min-h-screen w-full relative z-10 flex flex-col font-sans select-none overflow-y-auto">
      {/* Background Blobs (Dynamic Theme Variables mapping) */}
      <div className="aurora-container">
        <div className="aurora-blob w-[400px] h-[400px] left-[10%] top-[10%] opacity-20" style={{ backgroundColor: 'var(--aurora-1)' }} />
        <div className="aurora-blob w-[450px] h-[450px] right-[10%] bottom-[10%] opacity-20" style={{ backgroundColor: 'var(--aurora-2)' }} />
      </div>

      {/* Navigation Header */}
      <header className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between z-10">
        <button
          onClick={onBack}
          className="p-3 glass-panel rounded-2xl hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-semibold">Back to Lobby</span>
        </button>

        <h1 className="text-2xl font-black font-display tracking-tight">
          Friend<span className="text-purple-400">Verse</span> Profiles
        </h1>

        <button
          onClick={logout}
          className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-2xl text-xs font-bold cursor-pointer transition-all active:scale-95"
        >
          Log Out
        </button>
      </header>

      {/* Main Profile Grid Dashboard */}
      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pb-16 grid grid-cols-1 md:grid-cols-3 gap-8 z-10 flex-1">
        
        {/* Left Column: User Summary Card */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 flex flex-col items-center text-center shadow-lg border border-white/5">
            {/* Avatar block */}
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full border-2 border-white/10 overflow-hidden bg-slate-800 flex items-center justify-center text-slate-400">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-extrabold text-purple-300 uppercase">
                    {user?.nickname.charAt(0) || user?.username.charAt(0)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="absolute bottom-0 right-0 p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full border-2 border-slate-950 cursor-pointer shadow transition-all duration-200"
                title="Edit Avatar"
              >
                <Camera size={14} />
              </button>
            </div>

            <h2 className="text-2xl font-bold font-display">{user?.nickname}</h2>
            <p className="text-slate-500 text-sm mb-6">@{user?.username}</p>

            <div className="w-full h-[1px] bg-white/5 mb-6" />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 w-full text-left">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-xs text-slate-500 block">Current Theme</span>
                <span className="text-sm font-semibold capitalize font-display mt-0.5 block text-purple-300">
                  {user?.theme || 'Aurora'}
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-xs text-slate-500 block">Total Stories</span>
                <span className="text-sm font-semibold font-display mt-0.5 block text-pink-300">
                  {posts.filter(p => p.user_id === user?.id).length} posts
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Options */}
          <div className="glass-panel rounded-3xl p-4 flex flex-col gap-2 shadow">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'feed' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/15' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <BookOpen size={16} />
              <span>Posts & Feed</span>
            </button>
            
            <button
              onClick={() => setActiveTab('themes')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'themes' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/15' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <Palette size={16} />
              <span>Theme Switcher</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'settings' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/15' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <Settings size={16} />
              <span>Account Settings</span>
            </button>
          </div>
        </div>

        {/* Right Column: Tab View Switcher (takes remaining space) */}
        <div className="md:col-span-2 min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: USER POSTS & STORIES FEED */}
            {activeTab === 'feed' && (
              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Create Post Container */}
                <div className="glass-panel rounded-3xl p-5 shadow-lg border border-white/5">
                  <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400 animate-pulse" />
                    Share a Story
                  </h3>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <div className="relative">
                      <textarea
                        required
                        placeholder="Write something nice about your best friends or upload a memorable photo..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full glass-input px-4 py-3 text-base text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-600 bg-slate-900/30 h-24 resize-none"
                      />
                    </div>

                    {/* Show preview of post image */}
                    {newPostMedia && (
                      <div className="relative w-full max-h-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                        <img src={newPostMedia} alt="Media upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPostMedia(null)}
                          className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-slate-950 text-white rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {feedError && (
                      <div className="text-xs text-red-400 font-semibold pl-1">⚠️ {feedError}</div>
                    )}

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <button
                        type="button"
                        onClick={() => postImageRef.current?.click()}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-2 cursor-pointer transition-colors border border-white/5 text-xs font-semibold"
                      >
                        <ImageIcon size={14} className="text-pink-400" />
                        <span>Add Photo</span>
                      </button>
                      <input
                        type="file"
                        ref={postImageRef}
                        accept="image/*"
                        onChange={handlePostMediaUpload}
                        className="hidden"
                      />

                      <button
                        type="submit"
                        disabled={isPublishing || (!newPostContent.trim() && !newPostMedia)}
                        className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow disabled:opacity-50"
                      >
                        {isPublishing ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Publish</span>
                            <Send size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Posts Feed Streams */}
                <div className="space-y-5">
                  {posts.length === 0 ? (
                    <div className="glass-panel rounded-3xl p-8 text-center text-slate-500 text-sm">
                      No stories published yet. Be the first to share a post!
                    </div>
                  ) : (
                    posts.map((post) => (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel rounded-3xl p-5 shadow border border-white/5 space-y-4"
                      >
                        {/* Post Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-400">
                              {post.avatar ? (
                                <img src={post.avatar} alt="Author Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold uppercase text-purple-300">
                                  {post.nickname.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-semibold font-display text-sm block">{post.nickname}</span>
                              <span className="text-[10px] text-slate-500 block">
                                {new Date(post.timestamp).toLocaleDateString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Delete Button (If creator matches user ID) */}
                          {post.user_id === user?.id && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                              title="Delete Post"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Post content */}
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-1 select-text">
                          {post.content}
                        </p>

                        {/* Attached Image */}
                        {post.media && (
                          <div className="w-full rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
                            <img src={post.media} alt="Shared memory photo" className="w-full max-h-80 object-cover" />
                          </div>
                        )}

                        {/* Actions bar (Likes) */}
                        <div className="border-t border-white/5 pt-3 flex items-center">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                              post.likes.includes(user?.id || '')
                                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <Heart size={13} className={post.likes.includes(user?.id || '') ? 'fill-red-500 text-red-500' : ''} />
                            <span>{post.likes.length || 0} Likes</span>
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: THEME SWITCHER */}
            {activeTab === 'themes' && (
              <motion.div
                key="themes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="glass-panel rounded-3xl p-5 border border-white/5">
                  <h3 className="text-lg font-bold font-display mb-2 flex items-center gap-2">
                    <Palette className="text-purple-400" size={18} />
                    App Theme Switcher
                  </h3>
                  <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                    Select one of our premium themes. Clicking a card updates the application design dynamically and saves it to your account.
                  </p>

                  {/* Themes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {THEMES.map((theme) => {
                      const isActive = (user?.theme || 'aurora') === theme.id;
                      return (
                        <div
                          key={theme.id}
                          onClick={() => handleThemeChange(theme.id)}
                          className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex flex-col gap-3 relative ${
                            isActive
                              ? 'bg-slate-900 border-purple-500 shadow-lg shadow-purple-500/10 scale-[1.01]'
                              : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {/* Top bar with select indicator */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold font-display text-sm text-white">{theme.name}</span>
                            {isActive && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-600 text-white rounded-md">
                                Active
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed flex-1">
                            {theme.desc}
                          </p>

                          {/* Color bar preview */}
                          <div className="flex gap-1.5 mt-2">
                            {theme.colors.map((c, i) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full border border-slate-950"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: ACCOUNT SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="glass-panel rounded-3xl p-6 shadow-lg border border-white/5">
                  <h3 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                    <Settings className="text-purple-400 animate-spin" style={{ animationDuration: '6s' }} size={18} />
                    Profile & Settings
                  </h3>

                  {settingsSuccess && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-green-500/15 border border-green-500/25 text-green-300 text-sm mb-5">
                      <Smile size={16} />
                      <span>Settings updated successfully!</span>
                    </div>
                  )}

                  {settingsError && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm mb-5">
                      <span>⚠️ {settingsError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveSettings} className="space-y-5">
                    {/* Avatar edit in settings */}
                    <div className="flex flex-col items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 mb-2">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border border-white/10 overflow-hidden bg-slate-800 flex items-center justify-center text-slate-400">
                          {avatar ? (
                            <img src={avatar} alt="Settings Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold uppercase text-purple-300">
                              {nickname ? nickname.charAt(0) : user?.username.charAt(0)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full border border-slate-950 cursor-pointer shadow"
                        >
                          <Camera size={12} />
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <span className="text-[10px] text-slate-500">Square JPG/PNG (Max 500KB)</span>
                    </div>

                    {/* Nickname field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                        Nickname / Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full glass-input px-4 py-3 text-base text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all bg-slate-950/20"
                        disabled={isSavingSettings}
                      />
                    </div>

                    {/* Change Password field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                        Change Password (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Leave blank to keep existing password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full glass-input px-4 py-3 text-sm text-white border border-white/10 rounded-2xl focus:border-purple-500 focus:outline-none transition-all bg-slate-950/20"
                        disabled={isSavingSettings}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-sm border border-white/10 rounded-2xl shadow cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSavingSettings ? (
                        <div className="w-5 h-5 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      ) : (
                        'Save Profiles'
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  );
};
export default ProfilePage;
