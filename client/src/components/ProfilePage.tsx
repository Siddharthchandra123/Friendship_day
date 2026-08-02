import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Heart,
  Trash2,
  Send,
  Palette,
  BookOpen,
  Image as ImageIcon,
  Sparkles,
  LogOut,
  X,
  User,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";

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
  createdAt?: string;
  timestamp?: number;
}

const THEMES = [
  {
    id: "aurora",
    name: "Classic Aurora",
    desc: "Mystical dark slate with glowing indigo gradients",
    colors: ["#020617", "#a855f7", "#6366f1"],
  },
  {
    id: "pastel",
    name: "Pastel Dream",
    desc: "Soft rose cream interface",
    colors: ["#fafaf9", "#ec4899", "#f43f5e"],
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    desc: "Warm amber highlights",
    colors: ["#0c0a09", "#f97316", "#eab308"],
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    desc: "Deep teal & mint accents",
    colors: ["#022c22", "#10b981", "#06b6d4"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    desc: "Neon pink & cyan",
    colors: ["#000000", "#ff00ff", "#00ffff"],
  },
];

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://friendverse-signaling.onrender.com/api";

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, logout, updateProfile } = useAuth();

  /* ----------------------------- */
  /* UI */
  /* ----------------------------- */

  const [activeTab, setActiveTab] = useState<"feed" | "themes">("feed");

  const [showProfileModal, setShowProfileModal] = useState(false);

  /* ----------------------------- */
  /* POSTS */
  /* ----------------------------- */

  const [posts, setPosts] = useState<Post[]>([]);

  const [newPostContent, setNewPostContent] = useState("");

  const [newPostMedia, setNewPostMedia] =
    useState<string | null>(null);

  const [feedError, setFeedError] =
    useState<string | null>(null);

  const [isPublishing, setIsPublishing] =
    useState(false);

  const postImageRef =
    useRef<HTMLInputElement>(null);

  /* ----------------------------- */
  /* STATS */
  /* ----------------------------- */

  const myPosts = posts.filter(
    (p) => p.user_id === user?.id
  );

  const totalLikes = myPosts.reduce(
    (sum, post) => sum + post.likes.length,
    0
  );

  /* ----------------------------- */
  /* LOAD POSTS */
  /* ----------------------------- */

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);

      if (!res.ok) {
        setPosts([]);
        return;
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setPosts(data);
      } else if (Array.isArray(data.posts)) {
        setPosts(data.posts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error(err);
      setPosts([]);
    }
  };

  /* ----------------------------- */
  /* CREATE POST */
  /* ----------------------------- */

  const handleCreatePost = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !newPostContent.trim() &&
      !newPostMedia
    )
      return;

    setFeedError(null);

    setIsPublishing(true);

    try {
      const res = await fetch(
        `${API_BASE}/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",

          body: JSON.stringify({
            content:
              newPostContent.trim(),
            media: newPostMedia,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();

        setFeedError(
          err.message ||
            err.error ||
            "Unable to publish post."
        );

        return;
      }

      setNewPostContent("");

      setNewPostMedia(null);

      await fetchPosts();
    } catch {
      setFeedError(
        "Network error occurred."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  /* ----------------------------- */
  /* LIKE */
  /* ----------------------------- */

  const handleLikePost = async (
    postId: string
  ) => {
    try {
      const res = await fetch(
        `${API_BASE}/posts/${postId}/like`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) return;

      const data = await res.json();

      const updated =
        data.post || data;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? updated : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ----------------------------- */
  /* DELETE */
  /* ----------------------------- */

  const handleDeletePost = async (
    id: string
  ) => {
    if (
      !window.confirm(
        "Delete this post?"
      )
    )
      return;

    try {
      const res = await fetch(
        `${API_BASE}/posts/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.ok) {
        setPosts((prev) =>
          prev.filter(
            (p) => p.id !== id
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ----------------------------- */
  /* IMAGE */
  /* ----------------------------- */

  const handlePostImage = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (
      file.size >
      800 * 1024
    ) {
      setFeedError(
        "Image must be below 800KB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setNewPostMedia(
        reader.result as string
      );
    };

    reader.readAsDataURL(file);
  };

  /* ----------------------------- */
  /* THEME */
  /* ----------------------------- */

  const handleThemeChange =
    async (theme: string) => {
      try {
        await updateProfile(
          undefined,
          undefined,
          undefined,
          theme
        );
      } catch (err) {
        console.error(err);
      }
    };

return (
  <>
    <div className="min-h-screen w-full relative overflow-y-auto font-sans">

      {/* Animated Background */}
      <div className="aurora-container">
        <div
          className="aurora-blob w-[420px] h-[420px] left-[8%] top-[8%] opacity-20"
          style={{ backgroundColor: "var(--aurora-1)" }}
        />
        <div
          className="aurora-blob w-[460px] h-[460px] right-[8%] bottom-[10%] opacity-20"
          style={{ backgroundColor: "var(--aurora-2)" }}
        />
      </div>

      {/* Header */}

      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5">

        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <button
            onClick={onBack}
            className="glass-panel rounded-2xl px-5 py-3 flex items-center gap-2 hover:bg-white/10 transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className="text-2xl font-black tracking-tight">
            My{" "}
            <span className="text-purple-400">
              Profile
            </span>
          </h1>

          <button
            onClick={logout}
            className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl px-5 py-3 flex items-center gap-2 hover:bg-red-500/20 transition"
          >
            <LogOut size={15} />
            Logout
          </button>

        </div>

      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* LEFT COLUMN */}

        <aside className="space-y-6">

          {/* Profile Card */}

          <div className="glass-panel rounded-3xl p-6">

            <div className="flex flex-col items-center">

              <div className="relative">

                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 bg-slate-900 flex items-center justify-center">

                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl font-black text-purple-300 uppercase">
                      {(user?.nickname || user?.username)?.charAt(0)}
                    </span>
                  )}

                </div>

                <button
                  onClick={() => setShowProfileModal(true)}
                  className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center shadow-lg"
                >
                  <Camera size={14} />
                </button>

              </div>

              <h2 className="mt-5 text-2xl font-bold">
                {user?.nickname}
              </h2>

              <p className="text-slate-400">
                @{user?.username}
              </p>

            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">

              <div className="rounded-2xl bg-white/5 p-4 text-center">

                <div className="text-2xl font-black text-purple-300">
                  {myPosts.length}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Posts
                </div>

              </div>

              <div className="rounded-2xl bg-white/5 p-4 text-center">

                <div className="text-2xl font-black text-pink-400">
                  {totalLikes}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Likes
                </div>

              </div>

              <div className="rounded-2xl bg-white/5 p-4 text-center">

                <div className="text-sm font-bold capitalize text-cyan-300">
                  {user?.theme || "Aurora"}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Theme
                </div>

              </div>

            </div>

            <button
              onClick={() => setShowProfileModal(true)}
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 font-semibold hover:opacity-90 transition"
            >
              Edit Profile
            </button>

          </div>

          {/* Sidebar */}

          <div className="glass-panel rounded-3xl p-3 space-y-2">

            <button
              onClick={() => setActiveTab("feed")}
              className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 transition ${
                activeTab === "feed"
                  ? "bg-purple-600"
                  : "hover:bg-white/5"
              }`}
            >
              <BookOpen size={17} />
              <span>Posts</span>
            </button>

            <button
              onClick={() => setActiveTab("themes")}
              className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 transition ${
                activeTab === "themes"
                  ? "bg-purple-600"
                  : "hover:bg-white/5"
              }`}
            >
              <Palette size={17} />
              <span>Themes</span>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition"
            >
              <User size={17} />
              <span>Edit Profile</span>
            </button>

          </div>

        </aside>

        {/* RIGHT CONTENT */}

        <section className="lg:col-span-3">

          <AnimatePresence mode="wait">

            {activeTab === "feed" && (

              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >

                {/* Create Post */}

                <div className="glass-panel rounded-3xl p-6">

                  <h2 className="text-xl font-bold flex items-center gap-2 mb-5">

                    <Sparkles
                      size={18}
                      className="text-purple-400"
                    />

                    Create Post

                  </h2>

                  <form
                    onSubmit={handleCreatePost}
                    className="space-y-5"
                  >

                      {/* Part 3 starts from here */}
                                          <textarea
                      value={newPostContent}
                      onChange={(e) =>
                        setNewPostContent(e.target.value)
                      }
                      placeholder="What's on your mind?"
                      className="glass-input w-full rounded-2xl border border-white/10 bg-slate-900/30 p-4 min-h-[120px] resize-none text-white placeholder:text-slate-500"
                    />

                    {newPostMedia && (
                      <div className="relative rounded-2xl overflow-hidden border border-white/10">

                        <img
                          src={newPostMedia}
                          className="w-full max-h-96 object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setNewPostMedia(null)
                          }
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
                        >
                          <X size={16} />
                        </button>

                      </div>
                    )}

                    {feedError && (
                      <div className="text-red-400 text-sm">
                        {feedError}
                      </div>
                    )}

                    <div className="flex items-center justify-between">

                      <button
                        type="button"
                        onClick={() =>
                          postImageRef.current?.click()
                        }
                        className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-2 hover:bg-white/10 transition"
                      >
                        <ImageIcon size={15} />
                        Add Photo
                      </button>

                      <input
                        ref={postImageRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePostImage}
                      />

                      <button
                        type="submit"
                        disabled={
                          isPublishing ||
                          (!newPostContent.trim() &&
                            !newPostMedia)
                        }
                        className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isPublishing ? (
                          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        ) : (
                          <>
                            <Send size={15} />
                            Post
                          </>
                        )}
                      </button>

                    </div>

                  </form>

                </div>

                {/* POSTS */}

                <div className="space-y-5">

                  {posts.length === 0 ? (

                    <div className="glass-panel rounded-3xl p-12 text-center">

                      <BookOpen
                        className="mx-auto mb-4 text-slate-500"
                        size={40}
                      />

                      <h3 className="text-xl font-bold">
                        No Posts Yet
                      </h3>

                      <p className="text-slate-500 mt-2">
                        Share your first post with your
                        friends.
                      </p>

                    </div>

                  ) : (

                    posts.map((post) => (

                      <motion.div
                        key={post.id}
                        layout
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="glass-panel rounded-3xl p-6 space-y-5"
                      >

                        {/* Header */}

                        <div className="flex justify-between items-center">

                          <div className="flex gap-3 items-center">

                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">

                              {post.avatar ? (
                                <img
                                  src={post.avatar}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="font-black text-purple-400 uppercase">
                                  {post.nickname.charAt(0)}
                                </span>
                              )}

                            </div>

                            <div>

                              <h3 className="font-bold">
                                {post.nickname}
                              </h3>

                              <p className="text-xs text-slate-500">

                                {new Date(
                                  post.createdAt ??
                                    post.timestamp ??
                                    Date.now()
                                ).toLocaleString()}

                              </p>

                            </div>

                          </div>

                          {post.user_id === user?.id && (

                            <button
                              onClick={() =>
                                handleDeletePost(post.id)
                              }
                              className="hover:text-red-400 transition"
                            >
                              <Trash2 size={18} />
                            </button>

                          )}

                        </div>

                        {/* Content */}

                        <p className="leading-7 whitespace-pre-wrap text-slate-200">

                          {post.content}

                        </p>

                        {post.media && (

                          <div className="rounded-2xl overflow-hidden">

                            <img
                              src={post.media}
                              className="w-full max-h-[500px] object-cover"
                            />

                          </div>

                        )}

                        {/* Footer */}

                        <div className="flex items-center justify-between border-t border-white/5 pt-4">

                          <button
                            onClick={() =>
                              handleLikePost(post.id)
                            }
                            className={`rounded-xl px-4 py-2 flex items-center gap-2 transition ${
                              post.likes.includes(
                                user?.id || ""
                              )
                                ? "bg-red-500/20 text-red-400"
                                : "bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <Heart
                              size={16}
                              className={
                                post.likes.includes(
                                  user?.id || ""
                                )
                                  ? "fill-red-500"
                                  : ""
                              }
                            />

                            {post.likes.length}

                          </button>

                        </div>

                      </motion.div>

                    ))

                  )}

                </div>

              </motion.div>

            )}

            {/* Part 4 starts here */}
                        {activeTab === "themes" && (

              <motion.div
                key="themes"
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                }}
                className="space-y-6"
              >

                <div className="glass-panel rounded-3xl p-6">

                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">

                    <Palette
                      size={20}
                      className="text-purple-400"
                    />

                    Themes

                  </h2>

                  <p className="text-slate-400 text-sm mb-8">
                    Personalize the appearance of FriendVerse.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {THEMES.map((theme) => {

                      const active =
                        (user?.theme || "aurora") ===
                        theme.id;

                      return (

                        <button
                          key={theme.id}
                          onClick={() =>
                            handleThemeChange(theme.id)
                          }
                          className={`text-left rounded-3xl border transition-all duration-300 p-5 hover:scale-[1.02] ${
                            active
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-white/5 bg-white/5 hover:border-white/20"
                          }`}
                        >

                          <div className="flex items-center justify-between">

                            <h3 className="font-bold text-lg">

                              {theme.name}

                            </h3>

                            {active && (

                              <span className="text-xs bg-purple-600 px-3 py-1 rounded-full font-semibold">

                                Active

                              </span>

                            )}

                          </div>

                          <p className="text-sm text-slate-400 mt-3 leading-relaxed">

                            {theme.desc}

                          </p>

                          <div className="flex gap-2 mt-6">

                            {theme.colors.map((color, index) => (

                              <div
                                key={index}
                                className="w-7 h-7 rounded-full border border-white/10"
                                style={{
                                  background: color,
                                }}
                              />

                            ))}

                          </div>

                        </button>

                      );

                    })}

                  </div>

                </div>

              </motion.div>

            )}

          </AnimatePresence>

        </section>

      </main>

    </div>

    <ProfileModal
      isOpen={showProfileModal}
      onClose={() =>
        setShowProfileModal(false)
      }
    />

  </>

);

};

export default ProfilePage;