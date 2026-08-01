import React, { useEffect } from 'react';
import { WebRTCProvider, useWebRTC } from './context/WebRTCContext';
import { LandingPage } from './components/LandingPage';
import { CelebrationRoom } from './components/CelebrationRoom';
import { Heart } from 'lucide-react';

const FriendVerseApp: React.FC = () => {
  const { roomId, isConnecting } = useWebRTC();

  // Clean URL when connected to a room to keep routing clean
  useEffect(() => {
    if (roomId) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [roomId]);

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
    <WebRTCProvider>
      <FriendVerseApp />
    </WebRTCProvider>
  );
};

export default App;
