import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Image, Palette, Gamepad2, FileText, Activity, 
  Award, LogOut, Gift, Sparkles, MessageCircle, Video, ListCollapse, Bell, Zap, Flame, Star, Radio, AlertTriangle, Cpu 
} from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';
import { VideoGrid } from './VideoGrid';
import { ChatPanel } from './ChatPanel';
import { DrawingBoard } from './DrawingBoard';
import { MemoryWall } from './MemoryWall';
import { FriendshipTimeline } from './FriendshipTimeline';
import { GameCenter } from './GameCenter';
import { FriendshipQuiz } from './FriendshipQuiz';
import { FriendshipMeter } from './FriendshipMeter';
import { CertificateGenerator } from './CertificateGenerator';

type TabType = 'memory' | 'timeline' | 'drawing' | 'games' | 'quiz' | 'meter' | 'certificate';

export const CelebrationRoom: React.FC = () => {
  const { 
    leaveRoom, 
    surpriseNotification, 
    triggerSurprise, 
    roomId,
    myNickname,
    peerNicknames,
    activityFeed
  } = useWebRTC();

  const [activeTab, setActiveTab] = useState<TabType>('memory');
  const [mobileViewMode, setMobileViewMode] = useState<'video' | 'dashboard' | 'chat'>('dashboard');

  const tabs = [
    { id: 'memory', name: 'Memory Wall', icon: <Image size={16} /> },
    { id: 'timeline', name: 'Timeline', icon: <ListCollapse size={16} /> },
    { id: 'drawing', name: 'Whiteboard', icon: <Palette size={16} /> },
    { id: 'games', name: 'Mini-Games', icon: <Gamepad2 size={16} /> },
    { id: 'quiz', name: 'Quiz Trivia', icon: <FileText size={16} /> },
    { id: 'meter', name: 'Friend Meter', icon: <Activity size={16} /> },
    { id: 'certificate', name: 'Certificate', icon: <Award size={16} /> },
  ];

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex flex-col z-10 select-none">
      
      {/* GLOWING SURPRISE NOTIFICATION TOAST */}
      <AnimatePresence>
        {surpriseNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 rounded-xl border border-pink-500/30 bg-slate-900/90 text-white backdrop-blur-xl shadow-2xl flex items-center gap-3 text-sm font-semibold max-w-md text-center"
          >
            <div className="w-8 h-8 rounded-full bg-pink-500/15 flex items-center justify-center text-pink-400 shrink-0 animate-bounce">
              <Gift size={16} className="fill-pink-400" />
            </div>
            <span>{surpriseNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER NAVIGATION */}
      <header className="px-6 py-4 bg-slate-900/40 border-b border-white/10 backdrop-blur-md flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-black text-xl">
            FV
          </div>
          <div>
            <h1 className="font-extrabold text-base font-display text-white tracking-wide leading-none flex items-center gap-1">
              FriendVerse <Heart size={10} className="fill-pink-500 text-pink-500" />
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Live Celebration Room
            </span>
          </div>
        </div>

        {/* Active Participants List */}
        <div className="hidden md:flex items-center gap-3 bg-slate-950/60 border border-white/5 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Live now:
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
              {myNickname || 'You'} (Me)
            </span>
            {Object.entries(peerNicknames).map(([id, name]) => (
              <span key={id} className="px-2.5 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold animate-pulse">
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Room actions: code, leave */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-xs text-slate-400 font-semibold select-text">
            <span>Room Code:</span>
            <span className="font-mono text-purple-300 font-bold tracking-widest">{roomId}</span>
          </div>
          <button
            onClick={leaveRoom}
            className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold"
            title="Leave Celebration Room"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Leave Room</span>
          </button>
        </div>
      </header>

      {/* MOBILE CONTROL MODE TABS (Only visible on screens < md) */}
      <div className="md:hidden grid grid-cols-3 bg-slate-900 border-b border-white/5 sticky top-[72px] z-30">
        <button
          onClick={() => setMobileViewMode('video')}
          className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
            mobileViewMode === 'video' ? 'border-purple-500 text-purple-400 bg-white/5' : 'border-transparent text-slate-400'
          }`}
        >
          <Video size={14} /> Video Stream
        </button>
        <button
          onClick={() => setMobileViewMode('dashboard')}
          className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
            mobileViewMode === 'dashboard' ? 'border-purple-500 text-purple-400 bg-white/5' : 'border-transparent text-slate-400'
          }`}
        >
          <Gamepad2 size={14} /> Dash Tools
        </button>
        <button
          onClick={() => setMobileViewMode('chat')}
          className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
            mobileViewMode === 'chat' ? 'border-purple-500 text-purple-400 bg-white/5' : 'border-transparent text-slate-400'
          }`}
        >
          <MessageCircle size={14} /> Chat Panel
        </button>
      </div>

      {/* CORE CONTENT LAYOUT */}
      <main className="flex-1 w-full flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: VIDEOS + DASHBOARD WIDGETS */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 ${
          mobileViewMode === 'video' ? 'block md:block' : mobileViewMode === 'dashboard' ? 'block md:block' : 'hidden md:block'
        }`}>
          {/* Render video grid only in video mode (on mobile) or always on desktop */}
          <div className={`${mobileViewMode === 'video' ? 'block' : 'hidden md:block'}`}>
            <VideoGrid />
          </div>

          {/* Render dashboard widgets tabbed box in dashboard mode (on mobile) or always on desktop */}
          <div className={`space-y-6 ${mobileViewMode === 'dashboard' ? 'block' : 'hidden md:block'}`}>
            {/* Surprise Triggers Floating Box */}
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-pink-500 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Trigger a Surprise:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => triggerSurprise('confetti')}
                  className="px-3.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={12} /> Confetti
                </button>
                <button
                  onClick={() => triggerSurprise('hearts')}
                  className="px-3.5 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  ❤️ Shower Hearts
                </button>
                <button
                  onClick={() => triggerSurprise('compliment')}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 text-xs font-bold transition-all cursor-pointer"
                >
                  Give Compliment
                </button>
                <button
                  onClick={() => triggerSurprise('joke')}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all cursor-pointer"
                >
                  Share Joke
                </button>
              </div>
            </div>

            {/* Kafka Monitoring Dashboard */}
            <div className="glass-panel p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900/70 to-purple-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-cyan-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Kafka Live Monitor</span>
                </div>
                <span className="text-[11px] text-cyan-300">Pub/sub health • live stream</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-cyan-500/20 bg-slate-900/70 p-3">
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
                    <Cpu size={13} /> Kafka Status
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm text-slate-200">Connected • topic active</span>
                  </div>
                </div>
                <div className="rounded-lg border border-purple-500/20 bg-slate-900/70 p-3">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
                    <Zap size={13} /> Events Processed
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">24</div>
                  <div className="text-[11px] text-slate-400">chat, reaction, memory, timeline</div>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-slate-900/70 p-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                    <AlertTriangle size={13} /> Recent Errors
                  </div>
                  <div className="mt-2 text-sm text-slate-200">No critical errors • cluster healthy</div>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Live log stream</span>
                  <span className="text-[10px] text-emerald-400">● streaming</span>
                </div>
                <div className="space-y-1 text-sm text-slate-300 max-h-28 overflow-y-auto pr-2">
                  <div className="text-cyan-300">[12:34:10] Kafka producer connected</div>
                  <div className="text-emerald-300">[12:34:12] room event published to friendverse-events</div>
                  <div className="text-purple-300">[12:34:15] fan-out delivered to active room sockets</div>
                  <div className="text-slate-400">[12:34:18] latency under threshold</div>
                </div>
              </div>
            </div>

            {/* Social Activity Feed */}
            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-pink-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Live Social Feed</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Zap size={12} className="text-cyan-400" />
                  <span>fast vibes</span>
                </div>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activityFeed.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 bg-slate-900/40 p-3 text-sm text-slate-400">
                    Your room energy will show up here instantly.
                  </div>
                ) : activityFeed.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-purple-300 flex items-center gap-1">
                        {item.type === 'reaction' ? <Flame size={12} /> : item.type === 'presence' ? <Star size={12} /> : <Sparkles size={12} />}
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{item.message}</p>
                    {item.actorName && (
                      <p className="text-[11px] text-slate-400 mt-1">by {item.actorName}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Dashboard Tabs selector bar */}
            <div className="w-full overflow-x-auto flex gap-1 bg-slate-900 border border-white/5 p-1 rounded-xl scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-2.5 px-4 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Selected Tab content box */}
            <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl min-h-[300px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                >
                  {activeTab === 'memory' && <MemoryWall />}
                  {activeTab === 'timeline' && <FriendshipTimeline />}
                  {activeTab === 'drawing' && <DrawingBoard />}
                  {activeTab === 'games' && <GameCenter />}
                  {activeTab === 'quiz' && <FriendshipQuiz />}
                  {activeTab === 'meter' && <FriendshipMeter />}
                  {activeTab === 'certificate' && <CertificateGenerator />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR LIVE CHAT PANEL */}
        <div className={`w-full md:w-80 lg:w-96 border-l border-white/10 p-4 md:p-6 shrink-0 h-auto md:h-auto ${
          mobileViewMode === 'chat' ? 'block md:block' : 'hidden md:block'
        }`}>
          <ChatPanel />
        </div>

      </main>
    </div>
  );
};
export default CelebrationRoom;



