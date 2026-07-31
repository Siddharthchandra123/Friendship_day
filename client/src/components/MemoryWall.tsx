import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Camera, Mic, Square, Play, Pause, Trash2, Text, 
  Image as ImageIcon 
} from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

export const MemoryWall: React.FC = () => {
  const { memories, addMemoryItem, deleteMemoryItem } = useWebRTC();

  const [memoryText, setMemoryText] = useState('');
  const [memoryTitle, setMemoryTitle] = useState('');
  const [activeType, setActiveType] = useState<'text' | 'photo' | 'voice'>('text');

  // Photo uploading state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlobBase64, setVoiceBlobBase64] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  // Audio playing states for memories
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert("Image is too large. Please select an image smaller than 1.5MB to ensure fast peer syncing.");
      return;
    }

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceBlobBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks on the stream to turn off mic light
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone for recording', err);
      alert('Could not access microphone for voice memo recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Submit Memory
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeType === 'text') {
      if (!memoryText.trim() || !memoryTitle.trim()) return;
      addMemoryItem(memoryTitle.trim(), 'text', memoryText.trim());
    } else if (activeType === 'photo') {
      if (!photoBase64 || !memoryTitle.trim()) return;
      addMemoryItem(memoryTitle.trim(), 'photo', photoBase64);
    } else if (activeType === 'voice') {
      if (!voiceBlobBase64 || !memoryTitle.trim()) return;
      addMemoryItem(memoryTitle.trim(), 'voice', voiceBlobBase64);
    }

    // Reset Form
    setMemoryTitle('');
    setMemoryText('');
    setPhotoBase64(null);
    setPhotoName('');
    setVoiceBlobBase64(null);
    setRecordingSeconds(0);
  };

  // Play voice notes in memory board
  const playVoiceNote = (id: string, base64Audio: string) => {
    if (playingAudioId === id) {
      // Pause
      activeAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      // Stop current audio if playing
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }

      const audio = new Audio(base64Audio);
      activeAudioRef.current = audio;
      setPlayingAudioId(id);
      audio.play();

      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Wall Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Shared Memory Wall 📸
          </h2>
          <p className="text-slate-400 text-sm">
            Collect your favourite road trips, graduation memories, and voices on this digital polaroid board.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CREATE MEMORY FORM (Left column) */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
            <h3 className="text-lg font-bold font-display text-white border-b border-white/5 pb-2">
              Pin a New Memory
            </h3>

            {/* Type selector tabs */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveType('text')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                  activeType === 'text' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Text size={14} />
                Text
              </button>
              <button
                type="button"
                onClick={() => setActiveType('photo')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                  activeType === 'photo' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera size={14} />
                Photo
              </button>
              <button
                type="button"
                onClick={() => setActiveType('voice')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                  activeType === 'voice' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic size={14} />
                Voice
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Common Title input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Memory Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Best Pizza in Rome 🍕"
                  value={memoryTitle}
                  onChange={(e) => setMemoryTitle(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 text-sm"
                  maxLength={40}
                />
              </div>

              {/* Text Memory Fields */}
              {activeType === 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Write your memory
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe that amazing moment..."
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                    className="w-full glass-input px-4 py-2.5 text-sm resize-none"
                    maxLength={200}
                  />
                </div>
              )}

              {/* Photo Upload Fields */}
              {activeType === 'photo' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Select Photograph
                  </label>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {photoBase64 ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/10 aspect-video">
                      <img src={photoBase64} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoBase64(null);
                          setPhotoName('');
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 rounded-md text-white cursor-pointer transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-8 border border-dashed border-white/20 hover:border-purple-500/50 hover:bg-purple-500/5 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-purple-300 transition-all cursor-pointer"
                    >
                      <ImageIcon size={28} />
                      <span className="text-xs font-medium">Browse image file (Max 1.5MB)</span>
                    </button>
                  )}
                  {photoName && <p className="text-[10px] text-slate-500 truncate">Selected: {photoName}</p>}
                </div>
              )}

              {/* Voice Memo Recording Fields */}
              {activeType === 'voice' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Record Voice Memo
                  </label>

                  <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-white/5">
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white cursor-pointer transition-colors"
                      >
                        <Square size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white cursor-pointer transition-colors"
                      >
                        <Mic size={16} />
                      </button>
                    )}

                    <div className="flex-1">
                      {isRecording ? (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          Recording... {recordingSeconds}s
                        </div>
                      ) : voiceBlobBase64 ? (
                        <span className="text-green-400 text-xs font-semibold flex items-center gap-1">
                          ✓ Voice Memo recorded successfully
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs font-medium">Ready to record note</span>
                      )}
                    </div>
                  </div>

                  {voiceBlobBase64 && (
                    <button
                      type="button"
                      onClick={() => setVoiceBlobBase64(null)}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear voice recording
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  !memoryTitle.trim() ||
                  (activeType === 'text' && !memoryText.trim()) ||
                  (activeType === 'photo' && !photoBase64) ||
                  (activeType === 'voice' && !voiceBlobBase64)
                }
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 font-bold disabled:opacity-40 disabled:hover:bg-purple-600 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus size={16} /> Pin to Board
              </button>
            </form>
          </div>
        </div>

        {/* POLAROID WALL SCROLLBOARD (Right 2 columns) */}
        <div className="lg:col-span-2">
          {memories.length === 0 ? (
            <div className="h-full min-h-[350px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-slate-900/10">
              <Camera size={36} className="text-slate-600 mb-3 animate-pulse" />
              <h4 className="font-bold text-white mb-1">Your Memory Wall is Empty</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-normal">
                Type a memory, upload a photo, or record a audio memo on the left to start saving moments together!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[550px] overflow-y-auto pr-2">
              <AnimatePresence>
                {memories.map((memo, index) => {
                  // Give polaroids slight random rotations for premium scrap-book feel
                  const rotation = [2, -2, 1, -1, 3, -3][index % 6];
                  
                  return (
                    <motion.div
                      key={memo.id}
                      initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                      animate={{ opacity: 1, scale: 1, rotate: rotation }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      whileHover={{ scale: 1.03, rotate: 0, zIndex: 10 }}
                      className="bg-white text-slate-900 p-4 pb-6 rounded-md shadow-xl border border-slate-200/50 flex flex-col gap-3 relative transform transition-all duration-300"
                    >
                      {/* Delete Memory pin */}
                      {memo.author === 'me' && (
                        <button
                          onClick={() => deleteMemoryItem(memo.id)}
                          className="absolute top-2 right-2 p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full text-slate-400 cursor-pointer transition-colors z-20 border border-slate-200"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}

                      {/* Polaroid Photo area */}
                      {memo.type === 'photo' && (
                        <div className="bg-slate-100 aspect-video rounded-sm overflow-hidden border border-slate-200">
                          <img src={memo.content} alt={memo.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Polaroid Text area */}
                      {memo.type === 'text' && (
                        <div className="bg-amber-50/70 p-4 rounded-sm border border-amber-100/80 min-h-[100px] flex items-center justify-center text-center">
                          <p className="font-sans text-xs text-slate-700 italic leading-relaxed">
                            "{memo.content}"
                          </p>
                        </div>
                      )}

                      {/* Polaroid Voice area */}
                      {memo.type === 'voice' && (
                        <div className="bg-purple-50 p-4 rounded-sm border border-purple-100 flex flex-col items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => playVoiceNote(memo.id, memo.content)}
                            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-pointer shadow-md transition-colors"
                          >
                            {playingAudioId === memo.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                          </button>
                          <span className="text-[10px] text-purple-700 font-bold tracking-wider uppercase">
                            {playingAudioId === memo.id ? 'Playing Voice memo' : 'Listen to Voice'}
                          </span>
                        </div>
                      )}

                      {/* Polaroid bottom caption */}
                      <div className="mt-2 border-t border-slate-100 pt-2.5 flex flex-col">
                        <span className="font-display font-bold text-sm text-slate-900 leading-snug truncate">
                          {memo.title}
                        </span>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[9px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                            By {memo.author === 'me' ? 'Me' : 'Bestie'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {memo.timestamp}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default MemoryWall;
