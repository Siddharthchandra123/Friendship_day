import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from "./SocketContext.tsx";
import confetti from 'canvas-confetti';
import { useMedia } from "./MediaContext";
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

export interface ActivityFeedItem {
  id: string;
  type: 'chat' | 'reaction' | 'memory' | 'timeline' | 'presence' | 'system';
  title: string;
  message: string;
  actorName?: string;
  timestamp: string;
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
  activityFeed: ActivityFeedItem[];
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);
export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const {
        initializeMedia,

    } = useMedia();

  
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
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

  const addActivityFeedItem = (item: ActivityFeedItem) => {
    setActivityFeed(prev => [
      { ...item, timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev.slice(0, 11)
    ]);
  };

  // WebSockets / WebRTC References
  const socket = useSocket();
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activePeerIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    activePeerIdRef.current = null;
    pendingCandidatesRef.current = [];
  };

  const createPeerConnection = (peerId: string) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
    {
        urls: [
            "stun:stun.l.google.com:19302"
        ]
    }
]
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket.connected) {
    socket.emit("webrtc-candidate", {
        roomId: roomIdRef.current,
        targetPeerId: peerId,
        candidate: event.candidate
    });
}
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams(prev => ({ ...prev, [peerId]: remoteStream }));
        setIsConnected(true);
        setIsConnecting(false);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
      }

      if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
        setPeerDisconnected(true);
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    };

    const localStreamObj = localStreamRef.current;
    if (localStreamObj) {
      localStreamObj.getTracks().forEach(track => peerConnection.addTrack(track, localStreamObj));
    }

    peerConnectionRef.current = peerConnection;
    activePeerIdRef.current = peerId;
    return peerConnection;
  };

  const connectToPeer = async (peerId: string) => {
    if (!peerId || peerId === socket.id) {
      return;
    }

    const peerConnection = createPeerConnection(peerId);

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('webrtc-offer', {
        roomId: roomIdRef.current,
        targetPeerId: peerId,
        offer
      });
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const handleIncomingOffer = async ({ peerId, offer }: { peerId: string; offer: RTCSessionDescriptionInit }) => {
    const peerConnection = createPeerConnection(peerId);

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      for (const candidate of pendingCandidatesRef.current) {
    await peerConnection.addIceCandidate(
        new RTCIceCandidate(candidate)
    );
}
pendingCandidatesRef.current = [];
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('webrtc-answer', {
        roomId: roomIdRef.current,
        targetPeerId: peerId,
        answer
      });
    } catch (err) {
      console.error('Error handling WebRTC offer:', err);
    }
  };

  const handleIncomingAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection) {
      return;
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling WebRTC answer:', err);
    }
  };

  const handleIncomingCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      for (const candidate of pendingCandidatesRef.current) {
    await peerConnection.addIceCandidate(
        new RTCIceCandidate(candidate)
    );
}
pendingCandidatesRef.current = [];
    } catch (err) {
      console.error('Error adding incoming ICE candidate:', err);
    }
  };   
  // Initialize socket connection on component mount
  useEffect(() => {


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
      addActivityFeedItem({
        id: `presence-${Date.now()}`,
        type: 'presence',
        title: 'Room joined',
        message: `You are now in the room with ${otherUsers.length > 0 ? otherUsers.length : 'your bestie'}.`,
        actorName: myNicknameRef.current || 'You',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // Load Kafka room history logs
      if (history) {
        if (history.chat) setChatMessages(history.chat);
        if (history.memories) setMemories(history.memories.map((m: any) => ({ ...m, author: m.author || 'peer' })));
        if (history.timeline) setTimelineEvents(history.timeline);
      }

      addActivityFeedItem({
        id: `join-${joinedRoomId}`,
        type: 'presence',
        title: 'You joined',
        message: `You entered room ${joinedRoomId}`,
        actorName: myNicknameRef.current || 'You',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      if (otherUsers.length > 0) {
        setTimeout(() => {
          void connectToPeer(otherUsers[0].id);
        }, 300);
      }
    });

    socket.on('peer-joined', async ({ peerId, nickname }) => {
      const name = nickname || 'Friend';
      console.log(`Peer joined: ${peerId} (${name})`);
      setPeerId(peerId);
      setIsConnecting(true);
      setPeerDisconnected(false);
      setPeerNicknames(prev => ({ ...prev, [peerId]: name }));
      if (socket.id && peerId !== socket.id) {
        setTimeout(() => {
          void connectToPeer(peerId);
        }, 300);
      }

      addActivityFeedItem({
        id: `presence-${peerId}`,
        type: 'presence',
        title: 'New presence',
        message: `${name} joined the room and is ready to vibe.`,
        actorName: name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
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

    socket.on('activity-feed', (activity: any) => {
      addActivityFeedItem({
        id: activity.id || `${activity.type}-${Date.now()}`,
        type: activity.type || 'system',
        title: activity.title || 'Room update',
        message: activity.message || 'A new room interaction happened',
        actorName: activity.actorName,
        timestamp: activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    socket.on('webrtc-offer', async ({ peerId, offer }) => {
      await handleIncomingOffer({ peerId, offer });
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      await handleIncomingAnswer({ answer });
    });

    socket.on('webrtc-candidate', async ({ candidate }) => {
      await handleIncomingCandidate({ candidate });
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
    socket.off("joined");
    socket.off("peer-joined");
    socket.off("peer-left");
    socket.off("room-full");
    socket.off("webrtc-offer");
    socket.off("webrtc-answer");
    socket.off("webrtc-candidate");
    socket.off("chat");
    socket.off("typing");
    socket.off("reaction");
    socket.off("draw-stroke");
    socket.off("draw-clear");
    socket.off("draw-undo");
    socket.off("memory-add");
    socket.off("memory-delete");
    socket.off("timeline-add");
    socket.off("timeline-delete");
    socket.off("select-game");
    socket.off("game-action");
    socket.off("quiz-action");
    socket.off("quiz-reset");
    socket.off("meter-action");
    socket.off("meter-reset");
    socket.off("surprise");
    socket.off("activity-feed");
};
  }, []);



  // Dispatch WebSocket Relays (replacing P2P RTCDataChannel)
  const sendDataChannelMsg = (type: string, payload: any) => {
    if (type === 'chat') {
      socket.emit('chat', { roomId: roomIdRef.current, message: payload });
    } else if (type === 'memory-add') {
      socket.emit('memory-add', { roomId: roomIdRef.current, item: payload.item });
    } else if (type === 'memory-delete') {
      socket.emit('memory-delete', { roomId: roomIdRef.current, id: payload.id });
    } else if (type === 'timeline-add') {
      socket.emit('timeline-add', { roomId: roomIdRef.current, event: payload.event });
    } else if (type === 'timeline-delete') {
      socket.emit('timeline-delete', { roomId: roomIdRef.current, id: payload.id });
    } else if (type === 'select-game') {
      socket.emit('select-game', { roomId: roomIdRef.current, game: payload.game });
    } else if (type === 'game-action') {
      socket.emit('game-action', { roomId: roomIdRef.current, payload });
    } else if (type === 'quiz-action') {
      socket.emit('quiz-action', { roomId: roomIdRef.current, payload });
    } else if (type === 'quiz-reset') {
      socket.emit('quiz-reset', { roomId: roomIdRef.current });
    } else if (type === 'meter-action') {
      socket.emit('meter-action', { roomId: roomIdRef.current, payload });
    } else if (type === 'meter-reset') {
      socket.emit('meter-reset', { roomId: roomIdRef.current });
    } else if (type === 'surprise') {
      socket.emit('surprise', { roomId: roomIdRef.current, surpriseType: payload.surpriseType, message: payload.message });
    } else if (type === 'typing') {
      socket.emit('typing', { roomId: roomIdRef.current, isTyping: payload.isTyping });
    } else if (type === 'reaction') {
      socket.emit('reaction', { roomId: roomIdRef.current, emoji: payload.emoji });
    } else if (type === 'draw-stroke') {
      socket.emit('draw-stroke', { roomId: roomIdRef.current, stroke: payload.stroke });
    } else if (type === 'draw-clear') {
      socket.emit('draw-clear', { roomId: roomIdRef.current });
    } else if (type === 'draw-undo') {
      socket.emit('draw-undo', { roomId: roomIdRef.current, remainingStrokes: payload.remainingStrokes });
    } else {
      socket.emit(type, { roomId: roomIdRef.current, ...payload });
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

    closePeerConnection();

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
const createRoom = async (nickname: string): Promise<string> => {
    const newRoomId = generateRandomRoomId();

    setMyNickname(nickname);
    setRoomFullError(false);

    setRoomId(newRoomId);
    roomIdRef.current = newRoomId;

    if (!socket.connected) {
        socket.connect();
    }

    socket.emit("join-room", {
        roomId: newRoomId,
        nickname,
    });

    initializeMedia().catch(console.error);

    return newRoomId;
};

const joinRoom = (id: string, nickname: string) => {
    const upperId = id.trim().toUpperCase();

    setMyNickname(nickname);
    setRoomFullError(false);

    setRoomId(upperId);
    roomIdRef.current = upperId;

    if (!socket.connected) {
        socket.connect();
    }

    socket.emit("join-room", {
        roomId: upperId,
        nickname,
    });

    initializeMedia().catch(console.error);
};

  const leaveRoom = () => {
    socket.emit("leave-room", {
      roomId: roomIdRef.current,
    });

    socket.disconnect();

    cleanupMediaAndRTC();

    // Reset all room state
    setRoomId("");
    roomIdRef.current = "";

    setPeerId(null);
    setPeerNicknames({});
    setRemoteStreams({});
    setIsConnected(false);
    setIsConnecting(false);

    // Prevent auto reconnect
    localStorage.removeItem("lastRoom");
    sessionStorage.removeItem("lastRoom");

    // Go back to home without room parameter
    window.location.replace("/");
  };
  // MEDIA CONTROLS
  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        if (peerConnectionRef.current) {
          peerConnectionRef.current.getSenders().forEach(sender => {
            if (sender.track?.kind === 'audio') {
              sender.replaceTrack(audioTrack).catch(() => undefined);
            }
          });
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
        if (peerConnectionRef.current) {
          peerConnectionRef.current.getSenders().forEach(sender => {
            if (sender.track?.kind === 'video') {
              sender.replaceTrack(videoTrack).catch(() => undefined);
            }
          });
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

        if (peerConnectionRef.current) {
          peerConnectionRef.current.getSenders().forEach(sender => {
            if (sender.track?.kind === 'video') {
              sender.replaceTrack(screenTrack).catch(() => undefined);
            }
          });
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

      if (peerConnectionRef.current) {
        peerConnectionRef.current.getSenders().forEach(sender => {
          if (sender.track?.kind === 'video') {
            sender.replaceTrack(camTrack).catch(() => undefined);
          }
        });
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
    addActivityFeedItem({
      id: `chat-${newMessage.id}`,
      type: 'chat',
      title: 'New message',
      message: text,
      actorName: myNicknameRef.current || 'You',
      timestamp: newMessage.timestamp
    });
    sendDataChannelMsg('chat', newMessage);
  };

  const setMyTyping = (isTyping: boolean) => {
    sendDataChannelMsg('typing', { isTyping });
  };

  // EMOJI REACTION SYNC
  const sendEmojiReaction = (emoji: string) => {
    addActivityFeedItem({
      id: `reaction-${Date.now()}`,
      type: 'reaction',
      title: 'Reaction sent',
      message: `${myNicknameRef.current || 'You'} reacted with ${emoji}`,
      actorName: myNicknameRef.current || 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
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
    reactionEl.style.filter = 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.35))';
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
        activityFeed,
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



