import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lock,
  MessageSquare,
  Play,
  Shield,
  Sparkles,
  Send,
  ShieldCheck,
  Star,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
  User as UserIcon,
} from "lucide-react";

import { useWebRTC } from "../context/WebRTCContext";
import { useAuth } from "../context/AuthContext";
import { useMedia } from "../context/MediaContext";
import { ambientSynth } from "../utils/WebAudioSynth";

const spotlightItems = [
  {
    title: "Private room orchestration",
    description: "Create secure spaces with one-click room codes and live presence indicators.",
    icon: ShieldCheck,
  },
  {
    title: "Real-time collaboration",
    description: "Keep chat, video, whiteboard, and activities in sync across every participant.",
    icon: MessageSquare,
  },
  {
    title: "Rich celebration toolkit",
    description: "Launch memories, games, reactions, and themed moments from one unified entry point.",
    icon: Sparkles,
  },
];

const trustStats = [
  { value: "99.9%", label: "session continuity" },
  { value: "6+", label: "interactive modules" },
  { value: "< 2s", label: "room handoff" },
  { value: "24/7", label: "availability" },
];

const featureCards = [
  {
    title: "Enterprise-grade room access",
    text: "Create or join a room with clear access control, responsive entry states, and clean handoff behavior.",
    icon: Lock,
  },
  {
    title: "Synchronized live experience",
    text: "Chat, drawing, memory walls, and games stay aligned so every participant sees the same celebration.",
    icon: Video,
  },
  {
    title: "Operational clarity",
    text: "A focused landing page with direct call-to-action paths, status cues, and high-signal information.",
    icon: Shield,
  },
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
  /*                             Spotlight Rotation                              */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % spotlightItems.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                              Room Actions                                  */
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

  const handleCreateRoom = useCallback(() => {
    if (!user) return;

    createRoom(user.nickname);
  }, [createRoom, user]);

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

  /*                            JSX CONTINUES BELOW                             */

  return (
  <div className="relative min-h-screen w-full overflow-hidden select-none bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_right,rgba(168,85,247,0.18),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_45%,#0b1120_100%)] text-white">

    <div className="absolute inset-0 pointer-events-none opacity-60">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/5 to-transparent" />
      <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
    </div>

    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">

      <header className="sticky top-4 z-30 mb-8 rounded-3xl border border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur-xl shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                FriendVerse Platform
              </div>
              <h1 className="mt-1 text-lg font-semibold text-white sm:text-xl">
                Enterprise Celebration Entry
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToProfile}
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 sm:flex"
            >
              {user?.avatar ? (
                <img src={user.avatar} className="h-7 w-7 rounded-full object-cover" alt="Avatar" />
              ) : (
                <UserIcon size={16} />
              )}
              Profile
            </button>

            <button
              onClick={handleToggleAudio}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              {isAudioPlaying ? <Volume2 size={16} className="text-cyan-300" /> : <VolumeX size={16} className="text-slate-400" />}
              Ambient
            </button>
          </div>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_30%,rgba(255,255,255,0.03))]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">

            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                <BadgeCheck size={14} />
                Secure / Live / Collaborative
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-400">
                  Welcome {user?.nickname ?? "friend"}
                </p>
                <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-7xl">
                  Run your celebration like a polished digital experience.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  FriendVerse gives you a clean, enterprise-style entry point for private rooms, live chat, video, collaborative tools, and shared moments with the people who matter.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCreateRoom}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:translate-y-[-1px] hover:brightness-110"
                >
                  <Play size={16} className="fill-white" />
                  Create Room
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setShowJoinModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <Send size={16} />
                  Join Room
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {trustStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-2xl font-semibold text-white">{stat.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Platform overview</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Built for a clean launch experience</h3>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Live
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{card.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{card.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/65 to-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <Shield size={14} className="text-cyan-300" />
              Current spotlight
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuoteIndex}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35 }}
                className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                {(() => {
                  const CurrentIcon = spotlightItems[currentQuoteIndex].icon;
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-300">
                          <CurrentIcon size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{spotlightItems[currentQuoteIndex].title}</p>
                          <h4 className="mt-1 text-lg font-semibold text-white">Enterprise-ready entry design</h4>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-300">
                        {spotlightItems[currentQuoteIndex].description}
                      </p>
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Users size={16} className="text-sky-300" />
                  Private sessions
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">Invite only, room-code driven, and designed for small trusted groups.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Clock3 size={16} className="text-emerald-300" />
                  Fast access
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">Enter, connect, and start celebrating with a minimal setup path.</p>
              </div>
            </div>
          </section>
        </aside>

      </main>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Step 1",
            icon: CalendarDays,
            text: "Create a new private room for your celebration session.",
          },
          {
            title: "Step 2",
            icon: CheckCircle2,
            text: "Share the room code and bring your best friend in.",
          },
          {
            title: "Step 3",
            icon: Star,
            text: "Use chat, video, memory wall, drawing, and games together.",
          },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{step.title}</p>
                  <h3 className="mt-1 text-base font-semibold text-white">Quick launch workflow</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{step.text}</p>
            </div>
          );
        })}
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
  </div>
  );
};

export default LandingPage;