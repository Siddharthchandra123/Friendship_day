import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, Volume2, VolumeX, Sparkles, Send, X } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';
import { ambientSynth } from '../utils/WebAudioSynth';

const quotes = [
  "Distance means nothing when friendship means everything. ❤️",
  "A real friend is one who walks in when the rest of the world walks out. 🌟",
  "Friendship is the only cement that will ever hold the world together. 🤝",
  "A single rose can be my garden... a single friend, my world. 🌹",
  "Friends are the siblings God never gave us. ✨",
  "There is nothing on this earth more to be prized than true friendship. 🏆",
  "Good friends are like stars. You don't always see them, but you know they're always there. 💫"
];

export const LandingPage: React.FC = () => {
  const { createRoom, joinRoom, roomFullError } = useWebRTC();
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Quote rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleToggleAudio = () => {
    if (isAudioPlaying) {
      ambientSynth.stop();
      setIsAudioPlaying(false);
    } else {
      ambientSynth.start();
      setIsAudioPlaying(true);
    }
  };

  const handleCreate = () => {
    const code = createRoom();
    console.log('Created room code:', code);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCodeInput.trim()) {
      joinRoom(roomCodeInput.trim().toUpperCase());
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden z-10 px-4 md:px-8 py-12 select-none">
      
      {/* Aurora Ambient Glowing Blobs */}
      <div className="aurora-container">
        <motion.div 
          animate={{
            x: [0, 80, -50, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="aurora-blob w-[450px] h-[450px] bg-purple-600/30 left-[15%] top-[10%]" 
        />
        <motion.div 
          animate={{
            x: [0, -70, 60, 0],
            y: [0, 80, -50, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="aurora-blob w-[500px] h-[500px] bg-pink-600/25 right-[10%] bottom-[15%]" 
        />
        <motion.div 
          animate={{
            x: [0, 50, -40, 0],
            y: [0, 50, -60, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="aurora-blob w-[350px] h-[350px] bg-blue-600/20 left-[40%] top-[45%]" 
        />
      </div>

      {/* Floating Stars Layer (Background SVGs) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-yellow-300/40"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.1, 0.8, 0.1],
              scale: [0.6, 1.2, 0.6],
              y: [0, -20 - Math.random() * 30, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          >
            <Sparkles size={12 + Math.random() * 12} />
          </motion.div>
        ))}
      </div>

      {/* Music Toggle (Top Right Corner) */}
      <div className="absolute top-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleToggleAudio}
          className="p-4 rounded-full glass-panel-light text-white shadow-lg flex items-center justify-center cursor-pointer border border-white/20 transition-all hover:bg-white/10 hover:border-white/30"
          title="Toggle Ambient Soundtrack"
        >
          {isAudioPlaying ? (
            <Volume2 className="w-6 h-6 text-purple-400 animate-pulse" />
          ) : (
            <VolumeX className="w-6 h-6 text-slate-400" />
          )}
        </motion.button>
      </div>

      {/* Header and Hero Text */}
      <div className="text-center z-10 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-light text-purple-300 text-xs font-semibold uppercase tracking-wider mb-6 border border-purple-500/30"
        >
          <Heart size={12} className="fill-purple-500 text-purple-500" />
          FriendVerse Lobby
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 0.1 }}
          className="text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 tracking-tight leading-none mb-6 drop-shadow-sm select-text text-center font-display"
        >
          Happy Friendship <br />Day <span className="inline-block animate-bounce">❤️</span>
        </motion.h1>

        {/* Dynamic Quote Box */}
        <div className="h-20 flex items-center justify-center mb-12 max-w-xl px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentQuoteIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="text-xl md:text-2xl text-purple-100/90 font-light italic text-center drop-shadow-md leading-relaxed select-text"
            >
              "{quotes[currentQuoteIndex]}"
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Buttons Grid */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-6 w-full max-w-md"
        >
          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="flex-1 btn-primary py-4 px-8 flex items-center justify-center gap-3 text-lg font-bold shadow-2xl relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <Play className="fill-white" size={20} />
            Create Celebration
          </button>

          {/* Join Button */}
          <button
            onClick={() => {
              setShowJoinModal(true);
            }}
            className="flex-1 btn-secondary py-4 px-8 flex items-center justify-center gap-2 text-lg font-bold cursor-pointer"
          >
            <Send size={20} className="text-pink-400" />
            Join Celebration
          </button>
        </motion.div>
      </div>

      {/* Floating Animated Hearts background */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none overflow-hidden z-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-pink-500/20"
            style={{
              bottom: '-20px',
              left: `${15 + i * 15}%`,
              fontSize: `${Math.random() * 2 + 1}rem`,
            }}
            animate={{
              y: -250,
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.7,
            }}
          >
            ❤️
          </motion.div>
        ))}
      </div>

      {/* Scroll Down Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-1.5 opacity-55 text-xs tracking-widest text-slate-400"
      >
        <span>EXPERIENCE PEER-TO-PEER</span>
        <div className="w-[1.5px] h-6 bg-slate-500 rounded-full" />
      </motion.div>

      {/* JOIN ROOM MODAL */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-md p-8 rounded-2xl glass-panel text-white shadow-2xl z-10 overflow-hidden border border-white/20"
            >
              {/* Highlight Gradient Border top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />

              <button
                onClick={() => setShowJoinModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold font-display mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Join Celebration
              </h2>
              <p className="text-slate-300 text-sm mb-6">
                Enter your friend's room code to start the audio/video call.
              </p>

              {roomFullError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">
                  ⚠️ This room is currently full (max 2 friends) or inactive.
                </div>
              )}

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label htmlFor="roomCode" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Room Code
                  </label>
                  <input
                    id="roomCode"
                    type="text"
                    required
                    placeholder="e.g. ABCD1234"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    className="w-full glass-input px-4 py-3 text-lg font-mono font-bold tracking-widest text-center uppercase border border-white/10"
                    maxLength={8}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  Join Room
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default LandingPage;
