import React, { useEffect } from 'react';
import { WebRTCProvider, useWebRTC } from './context/WebRTCContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { CelebrationRoom } from './components/CelebrationRoom';
import { AuthPage } from './components/AuthPage';
import { Heart } from 'lucide-react';

const FriendVerseApp: React.FC = () => {
  const { roomId, isConnecting } = useWebRTC();
  const { user, isAuthLoading } = useAuth();

  // Update URL to contain the room parameter when in a room to support reloading/refreshing
  useEffect(() => {
    if (roomId) {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      window.history.replaceState({}, document.title, roomUrl);
    } else {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [roomId]);

  // Loading Screen for Authentication Check
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white gap-4 select-none">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-400">Restoring secure session...</span>
      </div>
    );
  }

  // If not logged in, force AuthPage
  if (!user) {
    return <AuthPage />;
  }

  if (isConnecting && !roomId) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white gap-4 select-none">
        <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg font-bold font-display flex items-center gap-1.5">
            Connecting to FriendVerse <Heart className="fill-purple-500 text-purple-500 animate-pulse" size={16} />
          </span>
          <span className="text-xs text-slate-400">Negotiating WebRTC stream connection...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {roomId ? <CelebrationRoom /> : <LandingPage />}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WebRTCProvider>
        <FriendVerseApp />
      </WebRTCProvider>
    </AuthProvider>
  );
};

export default App;
