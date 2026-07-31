import React, { useEffect } from 'react';
import { HelpCircle, Star, Award, CheckCircle, RefreshCw } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Who is more likely to fall asleep during a movie? 🍿",
    options: ["Definitely Me", "Definitely My Bestie", "We both do! 💤", "Neither of us"]
  },
  {
    id: 2,
    question: "What is our ultimate weekend plan? 🚀",
    options: ["Road trip adventure 🚗", "Gaming all night 🎮", "Netflix marathon 🛋️", "Sleeping in late 💤"]
  },
  {
    id: 3,
    question: "Who is more likely to spend money on something useless? 💸",
    options: ["Definitely Me", "Definitely My Bestie", "Both of us (bad influence!)", "Neither"]
  },
  {
    id: 4,
    question: "What is our absolute go-to comfort food? 🍔",
    options: ["Pizza 🍕", "Burgers & Fries 🍔", "Sushi 🍣", "Tacos 🌮"]
  },
  {
    id: 5,
    question: "Who is more likely to get lost in a new city? 🗺️",
    options: ["Me (Directionally challenged)", "My Bestie", "Both of us", "Neither, we are maps experts"]
  }
];

export const FriendshipQuiz: React.FC = () => {
  const { quizState, sendQuizAction, resetQuiz, isConnected } = useWebRTC();
  const { currentQuestionIndex, myScore, mySelection, peerSelection, quizEnded } = quizState;

  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];

  const handleOptionSelect = (optionIndex: number) => {
    if (mySelection !== null) return; // Answer locked in

    // Update local choice and sync to peer
    sendQuizAction('quiz-selection', {
      mySelection: optionIndex
    });
  };

  // Check if both selections are locked in
  useEffect(() => {
    if (mySelection !== null && peerSelection !== null) {
      // If selections match, increment score for both
      if (mySelection === peerSelection) {
        const matchesAward = myScore + 1;
        setTimeout(() => {
          sendQuizAction('quiz-score-increment', {
            myScore: matchesAward,
            peerScore: matchesAward
          });
        }, 1200);
      }
    }
  }, [mySelection, peerSelection]);

  const handleNext = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < QUIZ_QUESTIONS.length) {
      sendQuizAction('quiz-next', {
        currentQuestionIndex: nextIndex,
        mySelection: null,
        peerSelection: null
      });
    } else {
      sendQuizAction('quiz-end', {
        quizEnded: true
      });
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          Friendship Quiz Trivia 📝
        </h2>
        <p className="text-slate-400 text-sm">
          Cooperative choice: Pick the same option as your bestie to match answers and raise your connection points.
        </p>
      </div>

      {!isConnected ? (
        <div className="p-8 rounded-2xl glass-panel text-center text-slate-400 max-w-md mx-auto">
          <HelpCircle size={32} className="mx-auto mb-3 text-purple-400 animate-pulse" />
          <h4 className="font-bold text-white mb-1">Waiting for Peer Connection</h4>
          <p className="text-xs">Connect with a friend to start the multiplayer quiz challenge!</p>
        </div>
      ) : (
        <div className="w-full max-w-xl mx-auto p-6 md:p-8 rounded-2xl glass-panel border border-white/10 shadow-2xl relative">
          
          {quizEnded ? (
            /* QUIZ SUMMARY OUTCOME */
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto animate-bounce mb-2">
                <Award size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white">Quiz Finished!</h3>
                <p className="text-xs text-slate-400">Here is your final friendship score matching</p>
              </div>

              <div className="py-6 px-8 bg-slate-950/40 border border-white/5 rounded-2xl max-w-xs mx-auto space-y-3">
                <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                  {Math.round((myScore / QUIZ_QUESTIONS.length) * 100)}%
                </div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  Match Compatibility
                </div>
                <div className="text-[10px] text-purple-300 font-semibold">
                  You matched {myScore} out of {QUIZ_QUESTIONS.length} questions!
                </div>
              </div>

              <button
                onClick={resetQuiz}
                className="btn-secondary py-2.5 px-5 mx-auto text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} /> Restart Quiz
              </button>
            </div>
          ) : (
            /* ACTIVE QUIZ QUESTION */
            <div className="space-y-6">
              
              {/* Question progress and scores */}
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-3">
                <span className="text-slate-400 font-bold uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}
                </span>
                <span className="px-2.5 py-1 rounded bg-purple-500/15 text-purple-300 font-semibold flex items-center gap-1">
                  <Star size={10} className="fill-purple-300" /> Matches: {myScore}
                </span>
              </div>

              {/* Question body */}
              <div className="space-y-2 text-center py-4">
                <h3 className="text-lg md:text-xl font-bold text-white leading-snug">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Options layout */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const isMyChoice = mySelection === idx;
                  const isPeerChoice = peerSelection === idx;
                  const bothAnswered = mySelection !== null && peerSelection !== null;
                  
                  let borderClass = 'border-white/10 hover:border-purple-500/40 hover:bg-white/5';
                  let bgClass = 'glass-panel-light';
                  let badge = null;

                  if (isMyChoice) {
                    borderClass = 'border-purple-500';
                    bgClass = 'bg-purple-950/20';
                  }

                  if (bothAnswered) {
                    if (isMyChoice && isPeerChoice) {
                      borderClass = 'border-green-500';
                      bgClass = 'bg-green-500/10';
                      badge = (
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <CheckCircle size={10} /> Match!
                        </span>
                      );
                    } else if (isMyChoice) {
                      borderClass = 'border-purple-500';
                      bgClass = 'bg-purple-950/10';
                      badge = <span className="text-[9px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">You</span>;
                    } else if (isPeerChoice) {
                      borderClass = 'border-pink-500';
                      bgClass = 'bg-pink-950/10';
                      badge = <span className="text-[9px] text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded">Friend</span>;
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={mySelection !== null}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-left transition-all ${borderClass} ${bgClass} ${
                        mySelection === null ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-100">{option}</span>
                      {badge}
                    </button>
                  );
                })}
              </div>

              {/* Status footer message */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-slate-400">
                  {mySelection !== null && peerSelection === null && (
                    <span className="text-purple-300 font-semibold animate-pulse">✓ Choice locked. Waiting for Bestie...</span>
                  )}
                  {mySelection === null && (
                    <span>Make your choice!</span>
                  )}
                  {mySelection !== null && peerSelection !== null && (
                    <span className={mySelection === peerSelection ? "text-green-400 font-bold" : "text-amber-400 font-semibold"}>
                      {mySelection === peerSelection ? "Awesome, you matched! 🎉" : "Different choices! Next time."}
                    </span>
                  )}
                </div>

                {mySelection !== null && peerSelection !== null && (
                  <button
                    onClick={handleNext}
                    className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer"
                  >
                    {currentQuestionIndex + 1 === QUIZ_QUESTIONS.length ? 'Finish Quiz' : 'Next Question →'}
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default FriendshipQuiz;
