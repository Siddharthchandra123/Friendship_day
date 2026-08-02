import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, Star, Milestone } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

export const FriendshipTimeline: React.FC = () => {
  const { timelineEvents, addTimelineEvent, deleteTimelineEvent } = useWebRTC();
  const [year, setYear] = useState('');
  const [text, setText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (year.trim() && text.trim()) {
      addTimelineEvent(year.trim(), text.trim());
      setYear('');
      setText('');
      setShowAddForm(false);
    }
  };

  // Sort timeline events chronologically by year text
  const sortedEvents = [...timelineEvents].sort((a, b) => {
    const yearA = parseInt(a.year) || 0;
    const yearB = parseInt(b.year) || 0;
    return yearA - yearB;
  });

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Friendship Timeline 🗺️
          </h2>
          <p className="text-slate-400 text-sm">
            Map out key moments in your history. Add milestones and watch your horizontal timeline grow.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary py-2.5 px-5 flex items-center gap-2 text-sm font-semibold cursor-pointer shrink-0"
        >
          <Plus size={16} />
          {showAddForm ? 'Cancel' : 'Add Milestone'}
        </button>
      </div>

      {/* Add Milestone Form Overlay */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-6 rounded-xl glass-panel border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Year
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2018"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 text-sm"
                  maxLength={10}
                />
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Milestone description
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. We met at university during chemistry lab 🧪"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full glass-input px-4 py-2.5 text-sm"
                    maxLength={100}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2.5 font-bold hover:translate-y-0 text-sm cursor-pointer whitespace-nowrap"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal timeline cards container */}
      <div className="relative w-full overflow-x-auto py-12 px-4 scrollbar-thin">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-white/10 rounded-2xl">
            <Milestone size={32} className="mb-2 text-slate-600" />
            <span className="text-sm font-semibold">No timeline events yet. Add one!</span>
          </div>
        ) : (
          <div className="relative flex items-start gap-12 min-w-max pb-4">
            
            {/* Horizontal Line connector */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/20 via-purple-500 to-pink-500/20 -translate-y-6 z-0" />

            <AnimatePresence>
              {sortedEvents.map((evt, idx) => (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative flex flex-col items-center w-[250px] z-10"
                >
                  {/* Timeline node node connector point */}
                  <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-purple-500 shadow-lg shadow-purple-500/20 flex items-center justify-center text-white mb-6 bg-slate-900/90 backdrop-blur-sm">
                    {idx === 0 ? (
                      <Calendar size={18} className="text-purple-400" />
                    ) : idx === sortedEvents.length - 1 ? (
                      <Star size={18} className="text-amber-400 animate-spin-slow" />
                    ) : (
                      <Milestone size={18} className="text-pink-400" />
                    )}
                  </div>

                  {/* Polaroid Card description */}
                  <div className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-xl text-center relative group flex flex-col gap-2 min-h-[140px]">
                    
                    {/* Delete button */}
                    <button
                      onClick={() => deleteTimelineEvent(evt.id)}
                      className="absolute top-2 right-2 p-1 rounded-md bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/5"
                    >
                      <Trash2 size={10} />
                    </button>

                    <span className="text-2xl font-black font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                      {evt.year}
                    </span>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed flex-1 flex items-center justify-center px-1">
                      {evt.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
export default FriendshipTimeline;



