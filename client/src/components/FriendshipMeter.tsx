import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, RefreshCw } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

const METER_QUESTIONS = [
  {
    question: "How frequently do you stay in touch? 📱",
    options: ["Every single day!", "Every few days", "Once a week or so", "Spontaneous bursts after months"]
  },
  {
    question: "What holds your friendship together the most? 🤝",
    options: ["Shared humor & inside jokes 😂", "Deep late-night life talks 🌌", "Shared hobbies, games & adventures 🎮", "Mutual support in tough times 🛡️"]
  },
  {
    question: "How would you describe your conversational dynamic? 🗣️",
    options: ["I do most of the talking!", "I do most of the listening", "It's an equal, balanced exchange", "Depends entirely on the mood"]
  },
  {
    question: "How long has this bond lasted? ⏳",
    options: ["Under 1 year", "1 to 3 years", "3 to 5 years", "5+ years (Legendary status! 👑)"]
  },
  {
    question: "If your friend calls you at 3:00 AM, what is your reaction? ☎️",
    options: ["Pick up immediately, no questions asked!", "Pick up but complain about the time", "Sleep through it but call back first thing", "Text: 'U alive?'"]
  }
];

export const FriendshipMeter: React.FC = () => {
  const { meterState, sendMeterAction, resetMeter, isConnected } = useWebRTC();
  const { questionsAnswersMe, questionsAnswersPeer, submittedMe, submittedPeer } = meterState;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<number[]>([]);
  const [animatedScore, setAnimatedScore] = useState(0);

  const selectAnswer = (ansIdx: number) => {
    const updated = [...localAnswers, ansIdx];
    setLocalAnswers(updated);

    if (currentIdx + 1 < METER_QUESTIONS.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Completed local questions
      sendMeterAction('meter-submit', {
        questionsAnswersMe: updated,
        submittedMe: true
      });
    }
  };

  // Compute Friendship score when both submit
  const calculateScore = (): number => {
    if (!questionsAnswersMe || !questionsAnswersPeer) return 0;
    if (questionsAnswersMe.length === 0 || questionsAnswersPeer.length === 0) return 0;

    let matches = 0;
    for (let i = 0; i < METER_QUESTIONS.length; i++) {
      if (questionsAnswersMe[i] === questionsAnswersPeer[i]) {
        matches++;
      }
    }

    // Baseline 80% to keep things positive, + 4% per match!
    return 80 + matches * 4;
  };

  const finalScore = calculateScore();

  // Animate compatibility score gauge
  useEffect(() => {
    if (submittedMe && submittedPeer && finalScore > 0) {
      let currentVal = 0;
      const interval = setInterval(() => {
        currentVal += 1;
        setAnimatedScore(currentVal);
        if (currentVal >= finalScore) {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [submittedMe, submittedPeer, finalScore]);

  const handleRestart = () => {
    setLocalAnswers([]);
    setCurrentIdx(0);
    setAnimatedScore(0);
    resetMeter();
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          Friendship Compatibility Meter ❤️
        </h2>
        <p className="text-slate-400 text-sm">
          Answer several questions about your interactions to calculate your customized Friendship Strength index.
        </p>
      </div>

      {!isConnected ? (
        <div className="p-8 rounded-2xl glass-panel text-center text-slate-400 max-w-md mx-auto">
          <Activity size={32} className="mx-auto mb-3 text-purple-400 animate-pulse" />
          <h4 className="font-bold text-white mb-1">Waiting for Peer Connection</h4>
          <p className="text-xs">Connection strength can only be calculated once both participants are in the room!</p>
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto p-6 md:p-8 rounded-2xl glass-panel border border-white/10 shadow-2xl">
          
          {/* PHASE 1: SUBMITTED AND WAITING / SHOW SCORE */}
          {submittedMe ? (
            !submittedPeer ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin mx-auto" />
                <h3 className="text-lg font-bold text-white">Your answers are locked!</h3>
                <p className="text-xs text-slate-400">Waiting for your bestie to finish the survey...</p>
              </div>
            ) : (
              /* CALCULATED COMPATIBILITY RESULTS GAUGE */
              <div className="text-center space-y-6 flex flex-col items-center">
                <h3 className="text-xl font-bold text-white">Analysis Complete</h3>
                
                {/* Circular animated gauge using SVG path */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background circle track */}
                    <circle
                      cx="96"
                      cy="96"
                      r="75"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    {/* Foreground glowing circle track */}
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="75"
                      stroke="url(#purplePinkGradient)"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 75}
                      strokeDashoffset={2 * Math.PI * 75 * (1 - animatedScore / 100)}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="purplePinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Score text overlay in center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <Heart size={28} className="text-pink-500 fill-pink-500 animate-pulse" />
                    <span className="text-3xl font-black text-white font-display">
                      {animatedScore}%
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">
                      Strength
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white text-base">Unbreakable Bond! 🌟</h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-normal">
                    You have extremely high alignment on your friendship routines and values. You are practically siblings!
                  </p>
                </div>

                <button
                  onClick={handleRestart}
                  className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  <RefreshCw size={12} /> Recalculate
                </button>
              </div>
            )
          ) : (
            /* PHASE 2: ANSWERING QUESTIONS SURVEY */
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Question {currentIdx + 1} of {METER_QUESTIONS.length}</span>
                  <span>{Math.round((currentIdx / METER_QUESTIONS.length) * 100)}% Done</span>
                </div>
                <div className="h-1.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${((currentIdx) / METER_QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <h3 className="text-base font-bold text-white leading-snug min-h-[44px]">
                {METER_QUESTIONS[currentIdx].question}
              </h3>

              {/* Options list */}
              <div className="grid grid-cols-1 gap-2.5">
                {METER_QUESTIONS[currentIdx].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => selectAnswer(i)}
                    className="w-full text-left p-3.5 rounded-xl border border-white/10 glass-panel-light hover:border-purple-500/40 hover:bg-white/5 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default FriendshipMeter;



