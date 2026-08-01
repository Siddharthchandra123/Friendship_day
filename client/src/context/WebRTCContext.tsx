import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, RoomEvent } from 'livekit-client';
import confetti from 'canvas-confetti';

// Types for components
export interface Message {
  id: string;
  sender: 'me' | 'peer' | 'system';
  senderId?: string;
  text?: string;
  emoji?: string;
  timestamp: string;
}

export interface MemoryItem {
  id: string;
  type: 'photo' | 'voice' | 'text';
  content: string; // Base64 for photo/voice, text string for text memories
  title?: string;
  author: 'me' | 'peer';
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  year: string;
  text: string;
}

export interface GameState {
  // Tic Tac Toe
  tictactoeBoard?: (string | null)[];
  tictactoeTurn?: 'me' | 'peer';
  tictactoeWinner?: string | null;
  // Rock Paper Scissors
  rpsChoiceMe?: string | null;
  rpsChoicePeer?: string | null;
  rpsResult?: string | null;
  // Memory Match
  memoryCards?: { id: number; symbol: string; matched: boolean; flipped: boolean }[];
  memoryTurns?: number;
  memoryFlippedIds?: number[];
  memoryActiveTurn?: 'me' | 'peer';
  memoryScore?: { me: number; peer: number };
  // Emoji Guess
  emojiGuessWord?: string;
  emojiGuessClue?: string;
  emojiGuessInputs?: string[];
  emojiGuessGuessed?: boolean;
}

export interface QuizState {
  currentQuestionIndex: number;
  myScore: number;
  peerScore: number;
  mySelection: number | null;
  peerSelection: number | null;
  quizEnded: boolean;
}

export interface MeterState {
  questionsAnswersMe: number[];
  questionsAnswersPeer: number[];
  submittedMe: boolean;
  submittedPeer: boolean;
}

interface WebRTCContextType {
  roomId: string;
  isConnected: boolean;
  isConnecting: boolean;
  peerId: string | null;
  peerDisconnected: boolean;
  roomFullError: boolean;

  // Nicknames
  myNickname: string;
  setMyNickname: (name: string) => void;
  peerNicknames: Record<string, string>;

  // Media streams & states
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isBackgroundBlurred: boolean;

  // Control actions
  createRoom: (nickname: string) => string;
  joinRoom: (id: string, nickname: string) => void;
  leaveRoom: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleBackgroundBlur: () => void;

  // Real-time modules state & sync
  chatMessages: Message[];
  sendChatMessage: (text: string) => void;
  sendEmojiReaction: (emoji: string) => void;
  peerTyping: boolean;
  setMyTyping: (isTyping: boolean) => void;

  // Drawing Canvas
  canvasStrokes: any[];
  sendCanvasDraw: (drawData: any) => void;
  sendCanvasClear: () => void;
  sendCanvasUndo: (remainingStrokes: any[]) => void;

  // Memory Wall
  memories: MemoryItem[];
  addMemoryItem: (title: string, type: 'photo' | 'voice' | 'text', content: string) => void;
  deleteMemoryItem: (id: string) => void;

  // Timeline
  timelineEvents: TimelineEvent[];
  addTimelineEvent: (year: string, text: string) => void;
  deleteTimelineEvent: (id: string) => void;

  // Mini Games
  currentMiniGame: 'none' | 'tictactoe' | 'rps' | 'memory' | 'emojiguess';
  gameState: GameState;
  selectMiniGame: (game: 'none' | 'tictactoe' | 'rps' | 'memory' | 'emojiguess') => void;
  sendGameAction: (actionType: string, payload: any) => void;

  // Quiz
  quizState: QuizState;
  sendQuizAction: (actionType: string, payload: any) => void;
  resetQuiz: () => void;

  // Friendship Meter
  meterState: MeterState;
  sendMeterAction: (actionType: string, payload: any) => void;
  resetMeter: () => void;

  // Surprise Trigger
  triggerSurprise: (type: 'confetti' | 'hearts' | 'compliment' | 'joke') => void;
  surpriseNotification: { message: string; type: string } | null;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

// Replace this block in client/src/context/WebRTCContext.tsx
const SIGNALING_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://friendverse-signaling.onrender.com'; // Paste your Render URL here

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomId, setRoomId] = useState('');
  const roomIdRef = useRef('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerDisconnected, setPeerDisconnected] = useState(false);
  const [roomFullError, setRoomFullError] = useState(false);

  // Nicknames
  const [myNickname, setMyNicknameState] = useState(() => {
    return localStorage.getItem('fv_nickname') || '';
  });
  const myNicknameRef = useRef(myNickname);
  const [peerNicknames, setPeerNicknames] = useState<Record<string, string>>({});

  const setMyNickname = (name: string) => {
    setMyNicknameState(name);
    myNicknameRef.current = name;
    localStorage.setItem('fv_nickname', name);
  };

  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);

  // Module States
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [canvasStrokes, setCanvasStrokes] = useState<any[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    { id: '1', year: '2020', text: 'We met for the first time!' },
    { id: '2', year: '2022', text: 'Our legendary road trip 🚗' },
    { id: '3', year: '2024', text: 'Graduation Day! 🎓' },
    { id: '4', year: '2026', text: 'Still best friends forever! ❤️' }
  ]);

  const memoriesRef = useRef(memories);
  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

  const timelineEventsRef = useRef(timelineEvents);
  useEffect(() => {
    timelineEventsRef.current = timelineEvents;
  }, [timelineEvents]);

  // Games
  const [currentMiniGame, setCurrentMiniGame] = useState<'none' | 'tictactoe' | 'rps' | 'memory' | 'emojiguess'>('none');
  const [gameState, setGameState] = useState<GameState>({});

  // Quiz
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    myScore: 0,
    peerScore: 0,
    mySelection: null,
    peerSelection: null,
    quizEnded: false
  });

  // Meter
  const [meterState, setMeterState] = useState<MeterState>({
    questionsAnswersMe: [],
    questionsAnswersPeer: [],
    submittedMe: false,
    submittedPeer: false
  });

  // Surprise popup notification
  const [surpriseNotification, setSurpriseNotification] = useState<{ message: string; type: string } | null>(null);

  // WebSockets / LiveKit References
  const socketRef = useRef<Socket | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Connect to LiveKit Room
  const connectToLiveKit = async (roomName: string, identity: string) => {
    try {
      const restUrl = SIGNALING_URL.replace('ws://', 'http://').replace('wss://', 'https://');
      console.log(`LiveKit: Requesting room token from ${restUrl}/api/livekit-token...`);
      const response = await fetch(`${restUrl}/api/livekit-token?roomId=${roomName}&nickname=${encodeURIComponent(identity)}&socketId=${socketRef.current?.id}`);
      const data = await response.json();

      if (data.error) {
        console.error('Failed to get LiveKit token:', data.error);
        return;
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      livekitRoomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        console.log(`LiveKit: Track subscribed from ${participant.identity}`, track.kind);
        if (track.kind === 'video' || track.kind === 'audio') {
          const mediaStreamTrack = track.mediaStreamTrack;
          if (mediaStreamTrack) {
            setRemoteStreams(prev => {
              const next = { ...prev };
              const oldStream = next[participant.identity];
              const newStream = new MediaStream();

              if (oldStream) {
                // Copy existing tracks of different kinds
                oldStream.getTracks().forEach(t => {
                  if (t.kind !== mediaStreamTrack.kind) {
                    newStream.addTrack(t);
                  }
                });
              }

              newStream.addTrack(mediaStreamTrack);
              next[participant.identity] = newStream;
              return next;
            });
            setIsConnected(true);
            setIsConnecting(false);
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
        console.log(`LiveKit: Track unsubscribed from ${participant.identity}`);
        setRemoteStreams(prev => {
          const next = { ...prev };
          const oldStream = next[participant.identity];
          if (oldStream) {
            const newStream = new MediaStream();
            oldStream.getTracks().forEach(t => {
              if (t.id !== track.mediaStreamTrack?.id) {
                newStream.addTrack(t);
              }
            });
            if (newStream.getTracks().length > 0) {
              next[participant.identity] = newStream;
            } else {
              delete next[participant.identity];
            }
          }
          return next;
        });
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log(`LiveKit: Participant connected: ${participant.identity}`);
        setPeerNicknames(prev => ({
          ...prev,
          [participant.identity]: participant.name || 'Friend'
        }));
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log(`LiveKit: Participant disconnected: ${participant.identity}`);
        setPeerNicknames(prev => {
          const next = { ...prev };
          delete next[participant.identity];
          return next;
        });
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[participant.identity];
          return next;
        });
      });

      console.log(`LiveKit: Connecting to ${data.serverUrl}...`);
      await room.connect(data.serverUrl, data.token);
      console.log('LiveKit: Connected successfully!');

      // Publish local stream tracks
      const localStreamObj = localStreamRef.current;
      if (localStreamObj) {
        console.log('LiveKit: Publishing camera and mic tracks...');
        const videoTrack = localStreamObj.getVideoTracks()[0];
        const audioTrack = localStreamObj.getAudioTracks()[0];
        if (videoTrack) {
          await room.localParticipant.publishTrack(videoTrack, { name: 'camera-video' });
        }
        if (audioTrack) {
          await room.localParticipant.publishTrack(audioTrack, { name: 'microphone-audio' });
        }
      }

    } catch (err) {
      console.error('Error connecting to LiveKit room:', err);
    }
  };

  // Initialize socket connection on component mount
  useEffect(() => {
    socketRef.current = io(SIGNALING_URL, {
      autoConnect: false,
    });

    const socket = socketRef.current;

    socket.on('joined', ({ roomId: joinedRoomId, otherUsers, history }) => {
      console.log(`Joined room ${joinedRoomId}. Other users present:`, otherUsers);
      setRoomId(joinedRoomId);
      roomIdRef.current = joinedRoomId;
      setIsConnecting(otherUsers ? otherUsers.length > 0 : false);
      setPeerDisconnected(false);

      const names: Record<string, string> = {};
      otherUsers.forEach((peer: any) => {
        names[peer.id] = peer.nickname;
      });
      setPeerNicknames(prev => ({ ...prev, ...names }));

      // Load Kafka room history logs
      if (history) {
        if (history.chat) setChatMessages(history.chat);
        if (history.memories) setMemories(history.memories.map((m: any) => ({ ...m, author: m.author || 'peer' })));
        if (history.timeline) setTimelineEvents(history.timeline);
      }

      // Initialize LiveKit
      connectToLiveKit(joinedRoomId, myNicknameRef.current);
    });

    socket.on('peer-joined', async ({ peerId, nickname }) => {
      const name = nickname || 'Friend';
      console.log(`Peer joined: ${peerId} (${name})`);
      setPeerId(peerId);
      setIsConnecting(true);
      setPeerDisconnected(false);
      setPeerNicknames(prev => ({ ...prev, [peerId]: name }));

      // Add system message
      setChatMessages(prev => [...prev, {
        id: `sys-${Date.now()}-${Math.random()}`,
        sender: 'system',
        text: `${name} joined the celebration room`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    socket.on('peer-left', ({ peerId }) => {
      console.log(`Peer left the room: ${peerId}`);
      setPeerNicknames(prev => {
        const name = prev[peerId] || 'A friend';
        setChatMessages(chatPrev => [...chatPrev, {
          id: `sys-${Date.now()}-${Math.random()}`,
          sender: 'system',
          text: `${name} left the room`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });

    socket.on('room-full', () => {
      console.log('Room is full');
      setRoomFullError(true);
      setIsConnecting(false);
    });

    // WSS Event Relays (replacing WebRTC Data Channel sync)
    socket.on('chat', ({ senderId, message }) => {
      setChatMessages(prev => [...prev, {
        id: message.id,
        sender: 'peer',
        senderId: senderId,
        text: message.text,
        emoji: message.emoji,
        timestamp: message.timestamp
      }]);
    });

    socket.on('typing', ({ isTyping }) => {
      setPeerTyping(isTyping);
    });

    socket.on('reaction', ({ emoji }) => {
      triggerFloatingReaction(emoji);
    });

    socket.on('draw-stroke', ({ stroke }) => {
      setCanvasStrokes(prev => {
        const idx = prev.findIndex(s => s.id === stroke.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = stroke;
          return next;
        }
        return [...prev, stroke];
      });
    });

    socket.on('draw-clear', () => {
      setCanvasStrokes([]);
    });

    socket.on('draw-undo', ({ remainingStrokes }) => {
      setCanvasStrokes(remainingStrokes);
    });

    socket.on('memory-add', ({ item }) => {
      setMemories(prev => [...prev, { ...item, author: 'peer' }]);
    });

    socket.on('memory-delete', ({ id }) => {
      setMemories(prev => prev.filter(m => m.id !== id));
    });

    socket.on('timeline-add', ({ event }) => {
      setTimelineEvents(prev => [...prev, event]);
    });

    socket.on('timeline-delete', ({ id }) => {
      setTimelineEvents(prev => prev.filter(e => e.id !== id));
    });

    socket.on('select-game', ({ game }) => {
      setCurrentMiniGame(game);
      setGameState({});
    });

    socket.on('game-action', (payload) => {
      const swappedGame: any = { ...payload };
      if ('tictactoeTurn' in payload) {
        swappedGame.tictactoeTurn = payload.tictactoeTurn === 'me' ? 'peer' : 'me';
      }
      if ('rpsChoiceMe' in payload) {
        swappedGame.rpsChoicePeer = payload.rpsChoiceMe;
        delete swappedGame.rpsChoiceMe;
      }
      if ('rpsChoicePeer' in payload) {
        swappedGame.rpsChoiceMe = payload.rpsChoicePeer;
        delete swappedGame.rpsChoicePeer;
      }
      if ('memoryActiveTurn' in payload) {
        swappedGame.memoryActiveTurn = payload.memoryActiveTurn === 'me' ? 'peer' : 'me';
      }
      if ('memoryScore' in payload) {
        swappedGame.memoryScore = {
          me: payload.memoryScore.peer,
          peer: payload.memoryScore.me
        };
      }
      setGameState(prev => ({ ...prev, ...swappedGame }));
    });

    socket.on('quiz-action', (payload) => {
      const swappedQuiz: any = { ...payload };
      if ('mySelection' in payload) {
        swappedQuiz.peerSelection = payload.mySelection;
        delete swappedQuiz.mySelection;
      }
      if ('peerSelection' in payload) {
        swappedQuiz.mySelection = payload.peerSelection;
        delete swappedQuiz.peerSelection;
      }
      if ('myScore' in payload) {
        swappedQuiz.peerScore = payload.myScore;
        delete swappedQuiz.myScore;
      }
      if ('peerScore' in payload) {
        swappedQuiz.myScore = payload.peerScore;
        delete swappedQuiz.peerScore;
      }
      setQuizState(prev => ({ ...prev, ...swappedQuiz }));
    });

    socket.on('quiz-reset', () => {
      setQuizState({
        currentQuestionIndex: 0,
        myScore: 0,
        peerScore: 0,
        mySelection: null,
        peerSelection: null,
        quizEnded: false
      });
    });

    socket.on('meter-action', (payload) => {
      const swappedMeter: any = { ...payload };
      if ('questionsAnswersMe' in payload) {
        swappedMeter.questionsAnswersPeer = payload.questionsAnswersMe;
        delete swappedMeter.questionsAnswersMe;
      }
      if ('questionsAnswersPeer' in payload) {
        swappedMeter.questionsAnswersMe = payload.questionsAnswersPeer;
        delete swappedMeter.questionsAnswersPeer;
      }
      if ('submittedMe' in payload) {
        swappedMeter.submittedPeer = payload.submittedMe;
        delete swappedMeter.submittedMe;
      }
      if ('submittedPeer' in payload) {
        swappedMeter.submittedMe = payload.submittedPeer;
        delete swappedMeter.submittedPeer;
      }
      setMeterState(prev => ({ ...prev, ...swappedMeter }));
    });

    socket.on('meter-reset', () => {
      setMeterState({
        questionsAnswersMe: [],
        questionsAnswersPeer: [],
        submittedMe: false,
        submittedPeer: false
      });
    });

    socket.on('surprise', ({ surpriseType, message }) => {
      handleSurpriseReception(surpriseType, message);
    });

    return () => {
      socket.disconnect();
      cleanupMediaAndRTC();
    };
  }, []);

  // Request Camera & Microphone access
  const getUserMedia = async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Error accessing camera/microphone, falling back to oscillator/blank stream:', err);
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 640, 480);
      }
      const videoStream = canvas.captureStream(30);
      let audioTrack: MediaStreamTrack;
      try {
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        audioTrack = dest.stream.getAudioTracks()[0];
      } catch (e) {
        audioTrack = videoStream.getVideoTracks()[0];
      }
      const dummyStream = new MediaStream([videoStream.getVideoTracks()[0], audioTrack]);
      setLocalStream(dummyStream);
      localStreamRef.current = dummyStream;
      return dummyStream;
    }
  };

  // Dispatch WebSocket Relays (replacing P2P RTCDataChannel)
  const sendDataChannelMsg = (type: string, payload: any) => {
    if (type === 'chat') {
      socketRef.current?.emit('chat', { roomId: roomIdRef.current, message: payload });
    } else if (type === 'memory-add') {
      socketRef.current?.emit('memory-add', { roomId: roomIdRef.current, item: payload.item });
    } else if (type === 'memory-delete') {
      socketRef.current?.emit('memory-delete', { roomId: roomIdRef.current, id: payload.id });
    } else if (type === 'timeline-add') {
      socketRef.current?.emit('timeline-add', { roomId: roomIdRef.current, event: payload.event });
    } else if (type === 'timeline-delete') {
      socketRef.current?.emit('timeline-delete', { roomId: roomIdRef.current, id: payload.id });
    } else if (type === 'select-game') {
      socketRef.current?.emit('select-game', { roomId: roomIdRef.current, game: payload.game });
    } else if (type === 'game-action') {
      socketRef.current?.emit('game-action', { roomId: roomIdRef.current, payload });
    } else if (type === 'quiz-action') {
      socketRef.current?.emit('quiz-action', { roomId: roomIdRef.current, payload });
    } else if (type === 'quiz-reset') {
      socketRef.current?.emit('quiz-reset', { roomId: roomIdRef.current });
    } else if (type === 'meter-action') {
      socketRef.current?.emit('meter-action', { roomId: roomIdRef.current, payload });
    } else if (type === 'meter-reset') {
      socketRef.current?.emit('meter-reset', { roomId: roomIdRef.current });
    } else if (type === 'surprise') {
      socketRef.current?.emit('surprise', { roomId: roomIdRef.current, surpriseType: payload.surpriseType, message: payload.message });
    } else if (type === 'typing') {
      socketRef.current?.emit('typing', { roomId: roomIdRef.current, isTyping: payload.isTyping });
    } else if (type === 'reaction') {
      socketRef.current?.emit('reaction', { roomId: roomIdRef.current, emoji: payload.emoji });
    } else if (type === 'draw-stroke') {
      socketRef.current?.emit('draw-stroke', { roomId: roomIdRef.current, stroke: payload.stroke });
    } else if (type === 'draw-clear') {
      socketRef.current?.emit('draw-clear', { roomId: roomIdRef.current });
    } else if (type === 'draw-undo') {
      socketRef.current?.emit('draw-undo', { roomId: roomIdRef.current, remainingStrokes: payload.remainingStrokes });
    } else {
      socketRef.current?.emit(type, { roomId: roomIdRef.current, ...payload });
    }
  };

  const cleanupMediaAndRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    if (livekitRoomRef.current) {
      livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }

    setRemoteStreams({});
    setPeerNicknames({});
    setIsConnected(false);
    setIsConnecting(false);
    setRoomId('');
    roomIdRef.current = '';
  };

  // ROOM ACTIONS
  const generateRandomRoomId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = (nickname: string): string => {
    const newRoomId = generateRandomRoomId();
    setMyNickname(nickname);
    setRoomFullError(false);
    getUserMedia().then(() => {
      socketRef.current?.connect();
      socketRef.current?.emit('join-room', { roomId: newRoomId, nickname });
    });
    return newRoomId;
  };

  const joinRoom = (id: string, nickname: string) => {
    const upperId = id.trim().toUpperCase();
    setMyNickname(nickname);
    setRoomFullError(false);
    getUserMedia().then(() => {
      socketRef.current?.connect();
      socketRef.current?.emit('join-room', { roomId: upperId, nickname });
    });
  };

  const leaveRoom = () => {
    socketRef.current?.emit('leave-room', { roomId: roomIdRef.current });
    socketRef.current?.disconnect();
    cleanupMediaAndRTC();
  };

  // MEDIA CONTROLS
  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        if (livekitRoomRef.current) {
          livekitRoomRef.current.localParticipant.setMicrophoneEnabled(audioTrack.enabled)
            .catch(err => console.error('LiveKit: Error muting mic:', err));
        }
      }
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
        if (livekitRoomRef.current) {
          livekitRoomRef.current.localParticipant.setCameraEnabled(videoTrack.enabled)
            .catch(err => console.error('LiveKit: Error muting camera:', err));
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];

        // Publish screen track in LiveKit Room if connected
        if (livekitRoomRef.current) {
          const videoPublication = livekitRoomRef.current.localParticipant.videoTrackPublications.values().next().value;
          if (videoPublication) {
            // In LiveKit, we unpublish camera and publish screen, or publish as screen share
            await livekitRoomRef.current.localParticipant.unpublishTrack(videoPublication.track!);
            await livekitRoomRef.current.localParticipant.publishTrack(screenTrack, { name: 'screen-video' });
          }
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };

        const localAudioTrack = localStreamRef.current?.getAudioTracks()[0];
        const newStream = new MediaStream([screenTrack]);
        if (localAudioTrack) newStream.addTrack(localAudioTrack);
        setLocalStream(newStream);
        localStreamRef.current = newStream;

      } catch (err) {
        console.error('Error starting screen share', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    navigator.mediaDevices.getUserMedia({ video: true }).then(async (camStream) => {
      const camTrack = camStream.getVideoTracks()[0];

      // Unpublish screen and republish camera in LiveKit
      if (livekitRoomRef.current) {
        const videoPublication = livekitRoomRef.current.localParticipant.videoTrackPublications.values().next().value;
        if (videoPublication) {
          await livekitRoomRef.current.localParticipant.unpublishTrack(videoPublication.track!);
          await livekitRoomRef.current.localParticipant.publishTrack(camTrack, { name: 'camera-video' });
        }
      }

      const mergedStream = new MediaStream([camTrack]);
      const localAudioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (localAudioTrack) mergedStream.addTrack(localAudioTrack);

      setLocalStream(mergedStream);
      localStreamRef.current = mergedStream;
    });
  };

  const toggleBackgroundBlur = () => {
    setIsBackgroundBlurred(!isBackgroundBlurred);
  };

  // CHAT MODULE
  const sendChatMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages(prev => [...prev, newMessage]);
    sendDataChannelMsg('chat', newMessage);
  };

  const setMyTyping = (isTyping: boolean) => {
    sendDataChannelMsg('typing', { isTyping });
  };

  // EMOJI REACTION SYNC
  const sendEmojiReaction = (emoji: string) => {
    sendDataChannelMsg('reaction', { emoji });
    triggerFloatingReaction(emoji);
  };

  const triggerFloatingReaction = (emoji: string) => {
    const container = document.getElementById('floating-reactions-container');
    if (!container) return;

    const reactionEl = document.createElement('div');
    reactionEl.innerText = emoji;
    reactionEl.style.position = 'absolute';
    reactionEl.style.bottom = '0px';
    reactionEl.style.left = `${Math.random() * 80 + 10}%`;
    reactionEl.style.fontSize = '3rem';
    reactionEl.style.pointerEvents = 'none';
    reactionEl.style.zIndex = '9999';
    reactionEl.style.opacity = '1';
    reactionEl.style.transition = 'all 2.5s cubic-bezier(0.1, 0.8, 0.3, 1)';

    container.appendChild(reactionEl);

    requestAnimationFrame(() => {
      reactionEl.style.transform = `translateY(-${window.innerHeight * 0.8}px) scale(1.5) rotate(${Math.random() * 60 - 30}deg)`;
      reactionEl.style.opacity = '0';
    });

    setTimeout(() => {
      reactionEl.remove();
    }, 2500);
  };

  // DRAWING CANVAS MODULE
  const sendCanvasDraw = (drawStroke: any) => {
    setCanvasStrokes(prev => {
      const idx = prev.findIndex(s => s.id === drawStroke.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = drawStroke;
        return next;
      }
      return [...prev, drawStroke];
    });
    sendDataChannelMsg('draw-stroke', { stroke: drawStroke });
  };

  const sendCanvasClear = () => {
    setCanvasStrokes([]);
    sendDataChannelMsg('draw-clear', {});
  };

  const sendCanvasUndo = (remainingStrokes: any[]) => {
    setCanvasStrokes(remainingStrokes);
    sendDataChannelMsg('draw-undo', { remainingStrokes });
  };

  // MEMORY BOARD MODULE
  const addMemoryItem = (title: string, type: 'photo' | 'voice' | 'text', content: string) => {
    const item: MemoryItem = {
      id: Date.now().toString(),
      type,
      content,
      title,
      author: 'me',
      timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
    };
    setMemories(prev => [...prev, item]);
    sendDataChannelMsg('memory-add', { item });
  };

  const deleteMemoryItem = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    sendDataChannelMsg('memory-delete', { id });
  };

  // TIMELINE MODULE
  const addTimelineEvent = (year: string, text: string) => {
    const event: TimelineEvent = {
      id: Date.now().toString(),
      year,
      text,
    };
    setTimelineEvents(prev => [...prev, event]);
    sendDataChannelMsg('timeline-add', { event });
  };

  const deleteTimelineEvent = (id: string) => {
    setTimelineEvents(prev => prev.filter(e => e.id !== id));
    sendDataChannelMsg('timeline-delete', { id });
  };

  // MINI GAMES SELECTOR & SYNC
  const selectMiniGame = (game: 'none' | 'tictactoe' | 'rps' | 'memory' | 'emojiguess') => {
    setCurrentMiniGame(game);
    setGameState({});
    sendDataChannelMsg('select-game', { game });
  };

  const sendGameAction = (_actionType: string, payload: any) => {
    setGameState(prev => {
      const newState = { ...prev, ...payload };
      sendDataChannelMsg('game-action', payload);
      return newState;
    });
  };

  // QUIZ MODULE SYNC
  const sendQuizAction = (_actionType: string, payload: any) => {
    setQuizState(prev => {
      const newState = { ...prev, ...payload };
      sendDataChannelMsg('quiz-action', payload);
      return newState;
    });
  };

  const resetQuiz = () => {
    setQuizState({
      currentQuestionIndex: 0,
      myScore: 0,
      peerScore: 0,
      mySelection: null,
      peerSelection: null,
      quizEnded: false
    });
    sendDataChannelMsg('quiz-reset', {});
  };

  // METER MODULE SYNC
  const sendMeterAction = (_actionType: string, payload: any) => {
    setMeterState(prev => {
      const newState = { ...prev, ...payload };
      sendDataChannelMsg('meter-action', payload);
      return newState;
    });
  };

  const resetMeter = () => {
    setMeterState({
      questionsAnswersMe: [],
      questionsAnswersPeer: [],
      submittedMe: false,
      submittedPeer: false
    });
    sendDataChannelMsg('meter-reset', {});
  };

  // SURPRISE POPUPS & EFFECTS
  const compliments = [
    "You are the sibling I got to choose! 🌟",
    "No matter where life takes us, we will always be besties! ❤️",
    "You possess the rare gift of making everyone around you smile. 😊",
    "Thank you for being my constant supporter and partner in crime!",
    "Life is 1000x better with you in it! 🎉",
    "You're the person I can talk to for hours and still feel like it's only been 5 minutes."
  ];

  const jokes = [
    "Why did the Oreo go to the dentist? Because it lost its filling! 🍪",
    "What do you call a fake noodle? An impasta! 🍝",
    "What do you call cheese that isn't yours? Nacho cheese! 🧀",
    "Why are friend groups like math? They sum up our happiness! ➕"
  ];

  const triggerSurprise = (type: 'confetti' | 'hearts' | 'compliment' | 'joke') => {
    let msgText = '';

    if (type === 'confetti') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      msgText = "launched a storm of confetti! 🎉";
    } else if (type === 'hearts') {
      triggerFloatingHearts();
      msgText = "sent you a shower of love! ❤️";
    } else if (type === 'compliment') {
      const rand = compliments[Math.floor(Math.random() * compliments.length)];
      msgText = `sent a compliment: "${rand}"`;
    } else if (type === 'joke') {
      const rand = jokes[Math.floor(Math.random() * jokes.length)];
      msgText = `shared a chuckle: "${rand}"`;
    }

    setSurpriseNotification({
      message: `You ${msgText}`,
      type
    });
    setTimeout(() => setSurpriseNotification(null), 5000);

    sendDataChannelMsg('surprise', { surpriseType: type, message: msgText });
  };

  const handleSurpriseReception = (type: string, message: string) => {
    if (type === 'confetti') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else if (type === 'hearts') {
      triggerFloatingHearts();
    }

    setSurpriseNotification({
      message: `Your bestie ${message}`,
      type
    });
    setTimeout(() => setSurpriseNotification(null), 5000);
  };

  const triggerFloatingHearts = () => {
    const container = document.getElementById('floating-reactions-container');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const heart = document.createElement('div');
        heart.innerText = ['❤️', '💖', '💝', '✨'][Math.floor(Math.random() * 4)];
        heart.style.position = 'absolute';
        heart.style.bottom = '-50px';
        heart.style.left = `${Math.random() * 90}%`;
        heart.style.fontSize = `${Math.random() * 2 + 1.5}rem`;
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '9999';
        heart.style.opacity = '1';
        heart.style.transition = `all ${Math.random() * 2 + 2}s cubic-bezier(0.1, 0.8, 0.3, 1)`;

        container.appendChild(heart);

        requestAnimationFrame(() => {
          heart.style.transform = `translateY(-${window.innerHeight * 0.9}px) scale(${Math.random() * 0.5 + 1.0}) rotate(${Math.random() * 100 - 50}deg)`;
          heart.style.opacity = '0';
        });

        setTimeout(() => heart.remove(), 4000);
      }, i * 150);
    }
  };

  return (
    <WebRTCContext.Provider
      value={{
        roomId,
        isConnected,
        isConnecting,
        peerId,
        peerDisconnected,
        roomFullError,
        myNickname,
        setMyNickname,
        peerNicknames,
        localStream,
        remoteStream: Object.values(remoteStreams)[0] || null,
        remoteStreams,
        isAudioMuted,
        isVideoMuted,
        isScreenSharing,
        isBackgroundBlurred,

        createRoom,
        joinRoom,
        leaveRoom,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        toggleBackgroundBlur,

        chatMessages,
        sendChatMessage,
        sendEmojiReaction,
        peerTyping,
        setMyTyping,

        canvasStrokes,
        sendCanvasDraw,
        sendCanvasClear,
        sendCanvasUndo,

        memories,
        addMemoryItem,
        deleteMemoryItem,

        timelineEvents,
        addTimelineEvent,
        deleteTimelineEvent,

        currentMiniGame,
        gameState,
        selectMiniGame,
        sendGameAction,

        quizState,
        sendQuizAction,
        resetQuiz,

        meterState,
        sendMeterAction,
        resetMeter,

        triggerSurprise,
        surpriseNotification
      }}
    >
      {children}
      <div id="floating-reactions-container" className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]" />
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (context === undefined) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};
