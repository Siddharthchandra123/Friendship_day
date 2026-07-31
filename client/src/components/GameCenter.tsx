import React, { useEffect, useState } from 'react';
import { Gamepad2, Heart, Award, RefreshCw } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

export const GameCenter: React.FC = () => {
  const { 
    currentMiniGame, 
    gameState, 
    selectMiniGame, 
    sendGameAction, 
    isConnected 
  } = useWebRTC();

  // 1. TIC TAC TOE LOGIC
  const startTicTacToe = () => {
    sendGameAction('tictactoe-init', {
      tictactoeBoard: Array(9).fill(null),
      tictactoeTurn: 'me', // creator goes first
      tictactoeWinner: null
    });
  };

  const handleTicTacToeCellClick = (index: number) => {
    if (gameState.tictactoeWinner || gameState.tictactoeBoard?.[index]) return;
    if (gameState.tictactoeTurn !== 'me') return; // Not my turn

    const newBoard = [...(gameState.tictactoeBoard || [])];
    newBoard[index] = 'X'; // I am X, peer is O

    // Check winner
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    let winner: string | null = null;
    for (let line of lines) {
      const [a, b, c] = line;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winner = newBoard[a] === 'X' ? 'Me' : 'Bestie';
        break;
      }
    }

    if (!winner && newBoard.every(cell => cell !== null)) {
      winner = 'Draw';
    }

    sendGameAction('tictactoe-move', {
      tictactoeBoard: newBoard,
      tictactoeTurn: 'peer', // Switch turns
      tictactoeWinner: winner
    });
  };

  // Turn map on peer side (flip turns)
  useEffect(() => {
    // When peer plays a move, we flip 'me'/'peer' for display
    // Because peer sends "tictactoeTurn: 'peer'" meaning it's our turn now
  }, [gameState.tictactoeTurn]);

  // 2. ROCK PAPER SCISSORS LOGIC
  const makeRPSChoice = (choice: string) => {
    // We store our choice locally and notify peer
    sendGameAction('rps-choice', {
      // If we are initiator, fill choiceMe. Else fill choicePeer.
      // Wait, let's keep it simple: we submit our selection, and when both are done, we compute winner.
      rpsChoiceMe: choice
    });
  };

  // Resolve RPS when both choices are present
  useEffect(() => {
    if (currentMiniGame !== 'rps') return;

    // Wait, gameState.rpsChoiceMe is our choice, and gameState.rpsChoicePeer is the peer's choice.
    // If they are both filled:
    if (gameState.rpsChoiceMe && gameState.rpsChoicePeer) {
      const c1 = gameState.rpsChoiceMe;
      const c2 = gameState.rpsChoicePeer;
      let result = '';

      if (c1 === c2) {
        result = "It's a tie! 🤝";
      } else if (
        (c1 === 'rock' && c2 === 'scissors') ||
        (c1 === 'paper' && c2 === 'rock') ||
        (c1 === 'scissors' && c2 === 'paper')
      ) {
        result = "You won! 🏆";
      } else {
        result = "Bestie won! 👑";
      }

      // Automatically dispatch result but don't overwrite choices
      sendGameAction('rps-result', { rpsResult: result });
    }
  }, [gameState.rpsChoiceMe, gameState.rpsChoicePeer, currentMiniGame]);

  const resetRPS = () => {
    sendGameAction('rps-reset', {
      rpsChoiceMe: null,
      rpsChoicePeer: null,
      rpsResult: null
    });
  };

  // 3. MEMORY MATCH LOGIC
  // Symbol pairs
  const MEMORY_SYMBOLS = ['❤️', '🐶', '🍕', '🚗', '🎨', '🎮', '💡', '🏆'];
  
  const startMemoryMatch = () => {
    // Create random card deck
    const deck = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS]
      .map((symbol, idx) => ({ id: idx, symbol, matched: false, flipped: false }))
      .sort(() => Math.random() - 0.5);

    sendGameAction('memory-init', {
      memoryCards: deck,
      memoryTurns: 0,
      memoryFlippedIds: [],
      memoryActiveTurn: 'me',
      memoryScore: { me: 0, peer: 0 }
    });
  };

  const handleMemoryCardClick = (id: number) => {
    if (gameState.memoryActiveTurn !== 'me') return; // Not my turn
    const cards = [...(gameState.memoryCards || [])];
    const flippedIds = [...(gameState.memoryFlippedIds || [])];
    const activeCardIndex = cards.findIndex(c => c.id === id);

    if (activeCardIndex === -1 || cards[activeCardIndex].matched || cards[activeCardIndex].flipped || flippedIds.length >= 2) return;

    // Flip card
    cards[activeCardIndex].flipped = true;
    const newFlippedIds = [...flippedIds, id];

    sendGameAction('memory-flip', {
      memoryCards: cards,
      memoryFlippedIds: newFlippedIds
    });

    if (newFlippedIds.length === 2) {
      const firstId = newFlippedIds[0];
      const secondId = newFlippedIds[1];
      const firstCard = cards.find(c => c.id === firstId)!;
      const secondCard = cards.find(c => c.id === secondId)!;

      setTimeout(() => {
        let scores = { ...(gameState.memoryScore || { me: 0, peer: 0 }) };
        let nextTurn = 'me';

        if (firstCard.symbol === secondCard.symbol) {
          // Matched
          firstCard.matched = true;
          secondCard.matched = true;
          scores.me += 1; // I got a point!
          nextTurn = 'me'; // Same player gets another turn
        } else {
          // Unflip
          firstCard.flipped = false;
          secondCard.flipped = false;
          nextTurn = 'peer'; // Turn switches
        }

        sendGameAction('memory-match-check', {
          memoryCards: cards,
          memoryFlippedIds: [],
          memoryScore: scores,
          memoryActiveTurn: nextTurn,
          memoryTurns: (gameState.memoryTurns || 0) + 1
        });
      }, 1000);
    }
  };

  // 4. EMOJI GUESS TRIVIA LOGIC
  const [clueInput, setClueInput] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [guessInput, setGuessInput] = useState('');

  const submitEmojiClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (clueInput.trim() && wordInput.trim()) {
      sendGameAction('emojiguess-clue', {
        emojiGuessClue: clueInput.trim(),
        emojiGuessWord: wordInput.trim().toUpperCase(),
        emojiGuessInputs: [],
        emojiGuessGuessed: false
      });
      setClueInput('');
      setWordInput('');
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGuess = guessInput.trim().toUpperCase();
    if (!cleanGuess || !gameState.emojiGuessWord) return;

    const guesses = [...(gameState.emojiGuessInputs || []), cleanGuess];
    const isCorrect = cleanGuess === gameState.emojiGuessWord;

    sendGameAction('emojiguess-guess', {
      emojiGuessInputs: guesses,
      emojiGuessGuessed: isCorrect
    });
    setGuessInput('');
  };

  const resetEmojiGuess = () => {
    sendGameAction('emojiguess-reset', {
      emojiGuessWord: undefined,
      emojiGuessClue: undefined,
      emojiGuessInputs: undefined,
      emojiGuessGuessed: undefined
    });
  };

  // Game UI selection panels
  const gamesList = [
    { id: 'tictactoe', name: 'Tic Tac Toe', desc: 'Get three in a row to win!', symbol: '❌⭕', init: startTicTacToe },
    { id: 'rps', name: 'Rock Paper Scissors', desc: 'Traditional hand clash.', symbol: '✊✋✌️', init: resetRPS },
    { id: 'memory', name: 'Memory Match', desc: 'Find matched card pairs.', symbol: '🧠✨', init: startMemoryMatch },
    { id: 'emojiguess', name: 'Emoji Guess', desc: 'Riddle your friend with emojis!', symbol: '🦁👑', init: resetEmojiGuess }
  ];

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Multiplayer Games 🎮
          </h2>
          <p className="text-slate-400 text-sm">
            Launch games and play with your friend in real time. Screens are automatically synchronized.
          </p>
        </div>

        {currentMiniGame !== 'none' && (
          <button
            onClick={() => selectMiniGame('none')}
            className="btn-secondary py-2 px-4 text-xs font-semibold cursor-pointer shrink-0"
          >
            ← Back to Games Menu
          </button>
        )}
      </div>

      {!isConnected ? (
        <div className="p-8 rounded-2xl glass-panel text-center text-slate-400 max-w-md mx-auto">
          <Gamepad2 size={32} className="mx-auto mb-3 text-purple-400 animate-bounce" />
          <h4 className="font-bold text-white mb-1">Waiting for Peer Connection</h4>
          <p className="text-xs">You can start playing games as soon as your bestie joins this room!</p>
        </div>
      ) : (
        <div className="w-full">
          {currentMiniGame === 'none' ? (
            /* GAMES DIRECTORY MENU */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gamesList.map((game) => (
                <button
                  key={game.id}
                  onClick={() => {
                    selectMiniGame(game.id as any);
                    game.init();
                  }}
                  className="p-6 rounded-2xl glass-card text-left flex items-start gap-4 cursor-pointer hover:border-purple-500/40 relative overflow-hidden group"
                >
                  <div className="text-4xl bg-slate-950 p-4 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                    {game.symbol}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1 group-hover:text-purple-400 transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-normal">{game.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* GAME ZONE VIEWPORT */
            <div className="p-6 md:p-8 rounded-2xl glass-panel border border-white/10 w-full max-w-xl mx-auto shadow-2xl relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                  {currentMiniGame}
                </span>
              </div>

              {/* A. TIC TAC TOE INTERFACE */}
              {currentMiniGame === 'tictactoe' && (
                <div className="flex flex-col items-center gap-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">Tic Tac Toe</h3>
                    <p className="text-xs text-slate-400">
                      {gameState.tictactoeWinner
                        ? gameState.tictactoeWinner === 'Draw'
                          ? "It's a draw! 🤝"
                          : `${gameState.tictactoeWinner === 'Me' ? 'You' : 'Bestie'} won! 🏆`
                        : gameState.tictactoeTurn === 'me'
                        ? 'Your Turn (X)'
                        : "Bestie's Turn (O)"}
                    </p>
                  </div>

                  {/* 3x3 Grid board */}
                  <div className="grid grid-cols-3 gap-3 w-64 h-64">
                    {(gameState.tictactoeBoard || Array(9).fill(null)).map((cell, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleTicTacToeCellClick(idx)}
                        disabled={!!gameState.tictactoeWinner || gameState.tictactoeTurn !== 'me'}
                        className={`rounded-xl border border-white/10 flex items-center justify-center text-3xl font-black transition-all ${
                          cell ? 'bg-slate-900 text-white' : 'glass-panel-light hover:bg-white/10 cursor-pointer'
                        }`}
                      >
                        {cell === 'X' ? <span className="text-purple-400">X</span> : cell === 'O' ? <span className="text-pink-400">O</span> : null}
                      </button>
                    ))}
                  </div>

                  <button onClick={startTicTacToe} className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer">
                    <RefreshCw size={12} /> Restart Game
                  </button>
                </div>
              )}

              {/* B. ROCK PAPER SCISSORS INTERFACE */}
              {currentMiniGame === 'rps' && (
                <div className="flex flex-col items-center gap-6 text-center">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Rock Paper Scissors</h3>
                    <p className="text-xs text-slate-400">Select your move. Results show when both choose!</p>
                  </div>

                  {gameState.rpsResult ? (
                    <div className="space-y-4">
                      <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse">
                        {gameState.rpsResult}
                      </div>
                      <div className="text-xs text-slate-400 flex justify-center gap-6 bg-slate-950 p-3 rounded-lg border border-white/5">
                        <span>You selected: <b className="text-white capitalize">{gameState.rpsChoiceMe}</b></span>
                        <span>Bestie selected: <b className="text-white capitalize">{gameState.rpsChoicePeer}</b></span>
                      </div>
                      <button onClick={resetRPS} className="btn-secondary py-2 px-4 text-xs mx-auto flex items-center gap-1.5 cursor-pointer">
                        <RefreshCw size={12} /> Play Again
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      {['rock', 'paper', 'scissors'].map((choice) => {
                        const emoji = choice === 'rock' ? '✊' : choice === 'paper' ? '✋' : '✌️';
                        const alreadySelected = !!gameState.rpsChoiceMe;
                        return (
                          <button
                            key={choice}
                            onClick={() => makeRPSChoice(choice)}
                            disabled={alreadySelected}
                            className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-3xl glass-panel border border-white/10 hover:border-purple-500/40 transition-all ${
                              alreadySelected ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
                            }`}
                          >
                            {emoji}
                            <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{choice}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!gameState.rpsResult && (
                    <div className="text-xs text-slate-400 font-medium bg-slate-950/40 p-2.5 rounded-lg">
                      {gameState.rpsChoiceMe ? (
                        <span className="text-purple-300">✓ Move locked in. Waiting for Bestie...</span>
                      ) : (
                        <span>Choose your move!</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* C. MEMORY MATCH INTERFACE */}
              {currentMiniGame === 'memory' && (
                <div className="flex flex-col items-center gap-5">
                  <div className="text-center w-full flex justify-between items-center border-b border-white/5 pb-2.5">
                    <div>
                      <h3 className="text-lg font-bold text-white leading-none mb-1">Memory Match</h3>
                      <p className="text-[10px] text-slate-400">
                        {gameState.memoryActiveTurn === 'me' ? 'Your Turn' : "Bestie's Turn"}
                      </p>
                    </div>
                    <div className="flex gap-4 text-xs font-semibold text-slate-300">
                      <span>Me: <b className="text-purple-400">{gameState.memoryScore?.me || 0}</b></span>
                      <span>Bestie: <b className="text-pink-400">{gameState.memoryScore?.peer || 0}</b></span>
                    </div>
                  </div>

                  {/* 4x4 card grid */}
                  <div className="grid grid-cols-4 gap-3 w-72 h-72">
                    {(gameState.memoryCards || []).map((card) => {
                      const showSymbol = card.flipped || card.matched;
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleMemoryCardClick(card.id)}
                          disabled={gameState.memoryActiveTurn !== 'me' || showSymbol}
                          className={`rounded-xl border flex items-center justify-center text-2xl transition-all ${
                            card.matched
                              ? 'bg-green-500/10 border-green-500/20 opacity-50'
                              : card.flipped
                              ? 'bg-purple-950/40 border-purple-500 text-white'
                              : 'glass-panel-light border-white/10 hover:bg-white/10 cursor-pointer'
                          }`}
                        >
                          {showSymbol ? card.symbol : '❓'}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={startMemoryMatch} className="btn-secondary py-1.5 px-3 text-[10px] flex items-center gap-1.5 cursor-pointer">
                    <RefreshCw size={10} /> Reset Match board
                  </button>
                </div>
              )}

              {/* D. EMOJI GUESS INTERFACE */}
              {currentMiniGame === 'emojiguess' && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <h3 className="text-xl font-bold text-white mb-1">Emoji Guess Trivia</h3>

                  {gameState.emojiGuessClue ? (
                    /* PLAYING PHASE */
                    <div className="space-y-4 w-full">
                      <div className="bg-slate-950 p-6 rounded-2xl border border-white/15">
                        <div className="text-5xl mb-2">{gameState.emojiGuessClue}</div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Riddle Clue</span>
                      </div>

                      {gameState.emojiGuessGuessed ? (
                        <div className="space-y-3">
                          <div className="text-2xl font-black text-green-400 flex items-center justify-center gap-1.5">
                            <Award size={20} /> Correct Answer!
                          </div>
                          <p className="text-sm text-slate-300">
                            The word was indeed: <b className="text-purple-300 font-mono tracking-widest">{gameState.emojiGuessWord}</b>
                          </p>
                          <button onClick={resetEmojiGuess} className="btn-secondary py-2 px-4 text-xs mx-auto flex items-center gap-1.5 cursor-pointer">
                            <RefreshCw size={12} /> Play Another Riddle
                          </button>
                        </div>
                      ) : (
                        /* Input Guess Form */
                        <div className="space-y-4">
                          <form onSubmit={handleGuessSubmit} className="flex gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Enter your guess word..."
                              value={guessInput}
                              onChange={(e) => setGuessInput(e.target.value)}
                              className="flex-1 glass-input py-2.5 px-4 text-center font-bold"
                            />
                            <button type="submit" className="btn-primary px-6 py-2.5 font-bold text-sm cursor-pointer">
                              Guess
                            </button>
                          </form>

                          {/* Render guess history */}
                          <div className="flex flex-wrap gap-2 items-center justify-center text-xs text-slate-400">
                            <span className="font-semibold text-slate-500">Guesses:</span>
                            {(gameState.emojiGuessInputs || []).map((g, i) => (
                              <span key={i} className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 line-through">
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* SETUP PHASE (One player writes clue, other waits) */
                    <div className="w-full text-left space-y-4">
                      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-xs text-purple-300 leading-normal flex items-start gap-2">
                        <Heart size={16} className="shrink-0 mt-0.5" />
                        <span>One of you can write down an emoji sequence clue and target answer. Once saved, it will trigger the guessing challenge on both screens!</span>
                      </div>

                      <form onSubmit={submitEmojiClue} className="space-y-4 p-4 rounded-xl bg-slate-950/40 border border-white/5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            1. Emoji Clue
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 🧊🧊👶 or 🦁👑"
                            value={clueInput}
                            onChange={(e) => setClueInput(e.target.value)}
                            className="w-full glass-input px-4 py-2.5 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            2. Target Word (Answer)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ICE ICE BABY or LION KING"
                            value={wordInput}
                            onChange={(e) => setWordInput(e.target.value)}
                            className="w-full glass-input px-4 py-2.5 text-sm font-mono tracking-wider"
                          />
                        </div>

                        <button type="submit" className="w-full btn-primary py-2.5 font-bold cursor-pointer">
                          Create Challenge
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default GameCenter;
