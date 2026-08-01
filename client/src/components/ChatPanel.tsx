import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Info } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

const PRESET_EMOJIS = ['❤️', '😂', '🥳', '🎉', '🤗', '😍'];

export const ChatPanel: React.FC = () => {
  const { 
    chatMessages, 
    sendChatMessage, 
    sendEmojiReaction, 
    peerTyping, 
    setMyTyping,
    isConnected,
    peerNicknames
  } = useWebRTC();

  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, peerTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendChatMessage(inputText.trim());
      setInputText('');
      setMyTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Manage typing indicator state
    setMyTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setMyTyping(false);
    }, 2000);
  };

  const triggerPresetReaction = (emoji: string) => {
    sendEmojiReaction(emoji);
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
      {/* Panel Header */}
      <div className="px-6 py-4 bg-slate-900/40 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-bold text-lg font-display text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          Live Chat & Reactions
        </h3>
      </div>

      {/* Preset Reactions Tray */}
      <div className="px-6 py-3 bg-slate-950/20 border-b border-white/5 flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">React:</span>
        <div className="flex items-center gap-2">
          {PRESET_EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.25, rotate: [0, -10, 10, 0] }}
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerPresetReaction(emoji)}
              className="text-2xl hover:bg-white/5 p-1 rounded-lg cursor-pointer transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[250px]">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full glass-panel-light flex items-center justify-center text-purple-400 mb-3">
              <Smile size={24} />
            </div>
            <p className="text-slate-400 text-sm">No messages yet. Send a greeting to your bestie!</p>
          </div>
        ) : (
          <AnimatePresence>
            {chatMessages.map((msg) => {
              const isMe = msg.sender === 'me';
              const isSystem = msg.sender === 'system';

              if (isSystem) {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center my-2"
                  >
                    <span className="px-3.5 py-1 rounded-full bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 font-medium tracking-wide">
                      {msg.text}
                    </span>
                  </motion.div>
                );
              }

              const senderName = isMe ? 'You' : (msg.senderId ? (peerNicknames[msg.senderId] || 'Friend') : 'Friend');

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-[10px] text-slate-400 mb-0.5 px-1.5 font-semibold">
                        {senderName}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${
                        isMe
                          ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white rounded-br-none shadow-md shadow-purple-900/10'
                          : 'bg-slate-800 text-slate-100 rounded-bl-none border border-white/5 shadow-md shadow-black/10'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
 
        {/* Peer Typing Indicator */}
        {peerTyping && (
          <div className="flex justify-start items-center gap-3 py-2">
            <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none border border-white/5 flex items-center min-h-[36px] w-[54px]">
              <div className="dot-typing" />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {Object.values(peerNicknames)[0] || 'Friend'} is typing...
            </span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-900/40 border-t border-white/10">
        {!isConnected ? (
          <div className="flex items-center gap-2 p-2 text-amber-300 bg-amber-500/10 rounded-lg text-xs font-medium border border-amber-500/25">
            <Info size={14} className="shrink-0" />
            <span>Chat is locked. Waiting for your friend to connect...</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <input
              type="text"
              placeholder="Write a message..."
              value={inputText}
              onChange={handleInputChange}
              className="flex-1 glass-input py-3 pl-4 pr-12 text-sm border border-white/10"
              maxLength={200}
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-2 top-1.5 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white cursor-pointer disabled:opacity-40 disabled:hover:bg-purple-600 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default ChatPanel;
