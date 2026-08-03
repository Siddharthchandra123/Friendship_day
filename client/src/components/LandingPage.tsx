import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  X,
  User as UserIcon,
  Palette,
} from "lucide-react";

import { useWebRTC } from "../context/WebRTCContext";
import { useAuth } from "../context/AuthContext";
import { useMedia } from "../context/MediaContext";
import { ambientSynth } from "../utils/WebAudioSynth";

const quotes = [
  "Distance means nothing when friendship means everything. ❤️",
  "A real friend is one who walks in when the rest of the world walks out. 🌟",
  "Friendship is the only cement that will ever hold the world together. 🤝",
  "A single rose can be my garden... a single friend, my world. 🌹",
  "Friends are the siblings God never gave us. ✨",
  "There is nothing on this earth more to be prized than true friendship. 🏆",
  "Good friends are like stars. You don't always see them, but you know they're always there. 💫",
];

interface LandingPageProps {
  onGoToProfile: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToProfile,
}) => {
  /* -------------------------------------------------------------------------- */
  /*                                  Contexts                                  */
  /* -------------------------------------------------------------------------- */

  const { createRoom, joinRoom, roomFullError } = useWebRTC();

  const { user } = useAuth();

  const { initializeMedia } = useMedia();

  /* -------------------------------------------------------------------------- */
  /*                                    State                                   */
  /* -------------------------------------------------------------------------- */

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const [roomCodeInput, setRoomCodeInput] = useState("");

  const [showJoinModal, setShowJoinModal] = useState(false);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  /* -------------------------------------------------------------------------- */
  /*                             Initialize Media                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (mounted) {
          await initializeMedia();
        }
      } catch (err) {
        console.warn("Media initialization failed:", err);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initializeMedia]);

  /* -------------------------------------------------------------------------- */
  /*                           Auto Join From URL                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const room = params.get("room");

    if (!room || !user) return;

    const cleanRoom = room.trim().toUpperCase();

    if (cleanRoom.length !== 8) return;

    console.log(`Auto joining ${cleanRoom}`);

    joinRoom(cleanRoom, user.nickname);

    // Remove ?room= from the URL after joining
    window.history.replaceState({}, "", window.location.pathname);

}, [joinRoom, user]);

  /* -------------------------------------------------------------------------- */
  /*                             Quote Animation                                */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                              Music Controls                                */
  /* -------------------------------------------------------------------------- */

  const handleToggleAudio = useCallback(() => {
    if (isAudioPlaying) {
      ambientSynth.stop();
      setIsAudioPlaying(false);
    } else {
      ambientSynth.start();
      setIsAudioPlaying(true);
    }
  }, [isAudioPlaying]);

  /* -------------------------------------------------------------------------- */
  /*                              Room Creation                                 */
  /* -------------------------------------------------------------------------- */

  const handleCreateRoom = useCallback(() => {
    if (!user) return;

    createRoom(user.nickname);
  }, [createRoom, user]);

  /* -------------------------------------------------------------------------- */
  /*                                Join Room                                   */
  /* -------------------------------------------------------------------------- */

  const handleJoin = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!user) return;

      const room = roomCodeInput.trim().toUpperCase();

      if (room.length !== 8) return;

      joinRoom(room, user.nickname);

      setShowJoinModal(false);
    },
    [joinRoom, roomCodeInput, user]
  );

  /* -------------------------------------------------------------------------- */
  /*                            JSX CONTINUES BELOW                             */
  /* -------------------------------------------------------------------------- */
return (
  <div className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden select-none">

    {/* ===================== Animated Aurora Background ===================== */}

    <div className="absolute inset-0 -z-10 overflow-hidden">

      <motion.div
        className="aurora-blob absolute w-[450px] h-[450px] rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: "var(--aurora-1)" }}
        animate={{
          x: [0, 80, -50, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="aurora-blob absolute right-0 bottom-0 w-[520px] h-[520px] rounded-full blur-3xl opacity-25"
        style={{ backgroundColor: "var(--aurora-2)" }}
        animate={{
          x: [0, -80, 60, 0],
          y: [0, 80, -50, 0],
          scale: [1, .9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="aurora-blob absolute left-1/3 top-1/3 w-[350px] h-[350px] rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: "var(--aurora-3)" }}
        animate={{
          x: [0, 50, -40, 0],
          y: [0, 40, -60, 0],
          scale: [1, 1.05, .95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>

    {/* ===================== Floating Sparkles ===================== */}

    <div className="absolute inset-0 pointer-events-none">

      {Array.from({ length: 25 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-yellow-300/40"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [.15, .8, .15],
            scale: [.7, 1.2, .7],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        >
          <Sparkles size={12 + Math.random() * 10} />
        </motion.div>
      ))}

    </div>

    {/* ===================== Top Buttons ===================== */}

    <div className="fixed top-6 right-6 flex gap-3 z-50">

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: .95 }}
        onClick={onGoToProfile}
        className="glass-panel-light rounded-full p-4 border border-white/20"
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            className="w-6 h-6 rounded-full object-cover"
            alt="Avatar"
          />
        ) : (
          <UserIcon className="text-purple-400" size={22} />
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: .95 }}
        onClick={handleToggleAudio}
        className="glass-panel-light rounded-full p-4 border border-white/20"
      >
        {isAudioPlaying ? (
          <Volume2
            className="text-purple-400 animate-pulse"
            size={22}
          />
        ) : (
          <VolumeX
            className="text-slate-400"
            size={22}
          />
        )}
      </motion.button>

    </div>

    {/* ===================== Hero Section ===================== */}

    <section className="min-h-screen flex flex-col items-center justify-center px-6 relative z-10">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .8 }}
        className="mb-6"
      >

        <div className="glass-panel-light rounded-full px-5 py-2 flex items-center gap-2 border border-purple-500/20">

          <Heart
            size={14}
            className="fill-purple-500 text-purple-500 animate-pulse"
          />

          <span className="text-xs uppercase tracking-widest text-purple-300">

            Welcome {user?.nickname ?? "Friend"}

          </span>

        </div>

      </motion.div>

      <motion.h1
        initial={{ opacity: 0, scale: .92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: .9 }}
        className="text-center text-6xl md:text-8xl font-black font-display bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent"
      >
        Happy Friendship
        <br />
        Day ❤️
      </motion.h1>

      {/* Quote */}

      <div className="mt-8 h-20 flex items-center justify-center max-w-2xl">

        <AnimatePresence mode="wait">

          <motion.p
            key={currentQuoteIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: .45 }}
            className="italic text-center text-lg md:text-2xl text-purple-100"
          >
            "{quotes[currentQuoteIndex]}"
          </motion.p>

        </AnimatePresence>

      </div>

      {/* Buttons */}

      <div className="mt-10 flex flex-col sm:flex-row gap-6 w-full max-w-md">

        <button
          onClick={handleCreateRoom}
          className="btn-primary flex-1 py-4 flex items-center justify-center gap-3 text-lg font-bold"
        >
          <Play
            size={20}
            className="fill-white"
          />
          Create Celebration
        </button>

        <button
          onClick={() => setShowJoinModal(true)}
          className="btn-secondary flex-1 py-4 flex items-center justify-center gap-2 text-lg font-bold"
        >
          <Send size={20} />
          Join Celebration
        </button>

      </div>

      {/* Scroll Hint */}

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        className="absolute bottom-8 flex flex-col items-center gap-2 cursor-pointer opacity-60"
        onClick={() =>
          document
            .getElementById("feature-showcase")
            ?.scrollIntoView({
              behavior: "smooth",
            })
        }
      >

        <span className="text-xs tracking-widest text-slate-400">
          SCROLL FOR FEATURES
        </span>

        <div className="w-[2px] h-6 bg-slate-500 rounded-full" />

      </motion.div>

    </section>
          {/* ===================== Floating Hearts Background ===================== */}

      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none overflow-hidden -z-0">

        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-pink-500/20"
            style={{
              bottom: "-20px",
              left: `${15 + i * 15}%`,
              fontSize: `${Math.random() * 2 + 1}rem`,
            }}
            animate={{
              y: -260,
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 5,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeInOut",
            }}
          >
            ❤️
          </motion.div>
        ))}

      </div>

      {/* ===================== Feature Showcase ===================== */}

      <section
        id="feature-showcase"
        className="relative z-10 max-w-6xl mx-auto px-6 py-24 flex flex-col items-center"
      >

        <div className="text-center mb-16">

          <h2 className="text-4xl md:text-5xl font-black font-display bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">

            Everything You Need To Celebrate

          </h2>

          <p className="mt-4 max-w-2xl mx-auto text-slate-400 leading-relaxed">

            Private, secure and beautifully crafted experiences that make
            celebrating Friendship Day unforgettable no matter where your
            friends are.

          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">

          {/* ================= Card 1 ================= */}

          <motion.div
            whileHover={{
              y: -8,
              scale: 1.02,
            }}
            transition={{
              duration: .25,
            }}
            className="glass-card rounded-3xl p-7 border border-white/10 shadow-xl"
          >

            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5">

              <Heart
                size={28}
                className="text-purple-400 fill-purple-500/20"
              />

            </div>

            <h3 className="text-xl font-bold font-display text-white mb-3">

              Private Video Rooms

            </h3>

            <p className="text-sm text-slate-400 leading-relaxed">

              Create secure WebRTC powered celebration rooms with ultra-low
              latency audio and video. Invite your best friends instantly using
              a room code.

            </p>

          </motion.div>

          {/* ================= Card 2 ================= */}

          <motion.div
            whileHover={{
              y: -8,
              scale: 1.02,
            }}
            transition={{
              duration: .25,
            }}
            className="glass-card rounded-3xl p-7 border border-white/10 shadow-xl"
          >

            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-5">

              <Palette
                size={28}
                className="text-pink-400"
              />

            </div>

            <h3 className="text-xl font-bold font-display text-white mb-3">

              Shared Whiteboard

            </h3>

            <p className="text-sm text-slate-400 leading-relaxed">

              Draw together in real time with synchronized strokes, collaborative
              sketching and multiplayer creativity powered through WebSockets.

            </p>

          </motion.div>

          {/* ================= Card 3 ================= */}

          <motion.div
            whileHover={{
              y: -8,
              scale: 1.02,
            }}
            transition={{
              duration: .25,
            }}
            className="glass-card rounded-3xl p-7 border border-white/10 shadow-xl"
          >

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">

              <Sparkles
                size={28}
                className="text-amber-400"
              />

            </div>

            <h3 className="text-xl font-bold font-display text-white mb-3">

              Memories & Themes

            </h3>

            <p className="text-sm text-slate-400 leading-relaxed">

              Capture beautiful memories, personalize your celebration using
              premium themes and enjoy synchronized interactive experiences
              designed exclusively for Friendship Day.

            </p>

          </motion.div>

        </div>

        {/* Bottom CTA */}

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: .6,
          }}
          className="mt-20 text-center"
        >

          <h3 className="text-3xl font-black font-display text-white mb-4">

            Ready To Celebrate?

          </h3>

          <p className="text-slate-400 max-w-xl mx-auto mb-8">

            Create your own private room or join your friend's celebration in
            just a few seconds.

          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            <button
              onClick={handleCreateRoom}
              className="btn-primary px-8 py-4"
            >
              Create Celebration
            </button>

            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary px-8 py-4"
            >
              Join Celebration
            </button>

          </div>

        </motion.div>

      </section>

      {/* ===================== Join Room Modal ===================== */}

            <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

            {/* Backdrop */}

            <motion.div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
            />

            {/* Modal */}

            <motion.div
              initial={{
                opacity: 0,
                scale: .9,
                y: 30,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: .9,
                y: 30,
              }}
              transition={{
                duration: .25,
              }}
              className="relative z-10 w-full max-w-md rounded-3xl glass-panel border border-white/20 shadow-2xl overflow-hidden"
            >

              {/* Top Accent */}

              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />

              {/* Close */}

              <button
                onClick={() => setShowJoinModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="p-8">

                <h2 className="text-3xl font-black font-display bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">

                  Join Celebration

                </h2>

                <p className="mt-3 text-sm text-slate-400 leading-relaxed">

                  Enter your friend's room code and instantly join the
                  celebration.

                </p>

                {roomFullError && (

                  <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">

                    ⚠️ This room is full or no longer exists.

                  </div>

                )}

                <form
                  onSubmit={handleJoin}
                  className="mt-8 space-y-6"
                >

                  <div>

                    <label
                      htmlFor="roomCode"
                      className="block text-xs uppercase tracking-widest text-slate-400 mb-2"
                    >
                      Room Code
                    </label>

                    <input
                      id="roomCode"
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) =>
                        setRoomCodeInput(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                        )
                      }
                      placeholder="ABCD1234"
                      maxLength={8}
                      autoFocus
                      required
                      className="glass-input w-full px-5 py-4 rounded-xl text-center font-mono text-xl tracking-[0.4em] uppercase"
                    />

                  </div>

                  <button
                    type="submit"
                    disabled={roomCodeInput.trim().length !== 8}
                    className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >

                    <Send size={18} />

                    Join Celebration

                  </button>

                </form>

              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;