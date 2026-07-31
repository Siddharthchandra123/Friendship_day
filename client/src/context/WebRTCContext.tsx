import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';

// Types for components
export interface Message {
  id: string;
  sender: 'me' | 'peer';
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
  
  // Media streams & states
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isBackgroundBlurred: boolean;
  
  // Control actions
  createRoom: () => string;
  joinRoom: (id: string) => void;
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

// WebRTC ICE configuration using Google public STUN servers
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const SIGNALING_PORT = 5000;
// Replace this block in client/src/context/WebRTCContext.tsx
const SIGNALING_URL = 'https://friendverse-signaling.onrender.com'; // Paste your Render URL here

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomId, setRoomId] = useState('');
  const roomIdRef = useRef('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerDisconnected, setPeerDisconnected] = useState(false);
  const [roomFullError, setRoomFullError] = useState(false);

  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
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

  // WebRTC / Socket References
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isInitiatorRef = useRef(false);

  // Initialize socket connection on component mount
  useEffect(() => {
    socketRef.current = io(SIGNALING_URL, {
      autoConnect: false,
    });

    const socket = socketRef.current;

    socket.on('joined', ({ roomId: joinedRoomId, isInitiator }) => {
      console.log(`Joined room ${joinedRoomId}. Initiator: ${isInitiator}`);
      isInitiatorRef.current = isInitiator;
      setRoomId(joinedRoomId);
      roomIdRef.current = joinedRoomId;
      setIsConnecting(true);
      setPeerDisconnected(false);
    });

    socket.on('peer-joined', async ({ peerId }) => {
      console.log(`Peer joined: ${peerId}. Setting up connection...`);
      setPeerId(peerId);
      setIsConnecting(true);
      
      // If we are initiator, start WebRTC call
      if (isInitiatorRef.current) {
        initiateWebRTCConnection();
      }
    });

    socket.on('offer', async ({ sdp }) => {
      console.log('Received WebRTC Offer');
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }
      
      const pc = peerConnectionRef.current!;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('answer', { sdp: pc.localDescription, roomId: roomIdRef.current });
    });

    socket.on('answer', async ({ sdp }) => {
      console.log('Received WebRTC Answer');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('Received ICE Candidate');
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      }
    });

    socket.on('peer-left', () => {
      console.log('Peer disconnected');
      handlePeerDisconnect();
    });

    socket.on('room-full', () => {
      console.log('Room is full');
      setRoomFullError(true);
      setIsConnecting(false);
    });

    return () => {
      socket.disconnect();
      cleanupMediaAndRTC();
    };
  }, []);

  // Request Camera & Microphone access
  const getUserMedia = async (): Promise<MediaStream> => {
    if (localStream) return localStream;
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
      return stream;
    } catch (err) {
      console.error('Error accessing camera/microphone, falling back to audio only or blank track:', err);
      // Fallback: create empty tracks if permission denied
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 640, 480);
      }
      const fps = 30;
      const videoStream = canvas.captureStream(fps);
      
      // Try audio oscillator fallback to create silent track
      let audioTrack: MediaStreamTrack;
      try {
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        audioTrack = dest.stream.getAudioTracks()[0];
      } catch (e) {
        // Mock track
        audioTrack = videoStream.getVideoTracks()[0]; // dummy
      }

      const dummyStream = new MediaStream([videoStream.getVideoTracks()[0], audioTrack]);
      setLocalStream(dummyStream);
      return dummyStream;
    }
  };

  const createPeerConnection = () => {
    console.log('Creating Peer Connection...');
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Handle incoming stream tracks from peer
    pc.ontrack = (event) => {
      console.log('Received remote track', event.streams[0]);
      setRemoteStream(event.streams[0]);
      setIsConnected(true);
      setIsConnecting(false);
    };

    // Send local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          candidate: event.candidate,
          roomId: roomIdRef.current,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE Connection State: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        handlePeerDisconnect();
      }
    };
  };

  const initiateWebRTCConnection = async () => {
    createPeerConnection();
    const pc = peerConnectionRef.current!;

    // Create Data Channel (only initiator creates the channel)
    console.log('Creating Data Channel "friendverse-channel"');
    const dc = pc.createDataChannel('friendverse-channel');
    setupDataChannel(dc);

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current?.emit('offer', {
      sdp: pc.localDescription,
      roomId: roomIdRef.current,
    });
  };

  // If remote peer creates channel, we handle it on connection listener
  useEffect(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ondatachannel = (event) => {
        console.log('Received peer Data Channel');
        setupDataChannel(event.channel);
      };
    }
  }, [remoteStream]);

  // Setup DataChannel Listeners and Handlers
  const setupDataChannel = (dc: RTCDataChannel) => {
    dataChannelRef.current = dc;

    dc.onopen = () => {
      console.log('RTC Data Channel is OPEN');
      setIsConnected(true);
      setIsConnecting(false);
      setPeerDisconnected(false);

      // Sync initial state if we are the initiator (e.g. initial timeline events or memory walls)
      if (isInitiatorRef.current) {
        sendDataChannelMsg('sync-state', {
          timelineEvents,
          memories
        });
      }
    };

    dc.onclose = () => {
      console.log('RTC Data Channel is CLOSED');
      handlePeerDisconnect();
    };

    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIncomingDataChannelMsg(msg.type, msg.payload);
      } catch (err) {
        console.error('Error parsing data channel message', err);
      }
    };
  };

  // Dispatch Incoming DataChannel Messages to React State
  const handleIncomingDataChannelMsg = (type: string, payload: any) => {
    switch (type) {
      case 'sync-state':
        if (payload.timelineEvents) setTimelineEvents(payload.timelineEvents);
        if (payload.memories) setMemories(payload.memories);
        break;
        
      case 'chat':
        setChatMessages(prev => [...prev, {
          id: payload.id,
          sender: 'peer',
          text: payload.text,
          emoji: payload.emoji,
          timestamp: payload.timestamp
        }]);
        break;
        
      case 'typing':
        setPeerTyping(payload.isTyping);
        break;

      case 'reaction':
        triggerFloatingReaction(payload.emoji);
        break;

      case 'draw-stroke':
        setCanvasStrokes(prev => [...prev, payload.stroke]);
        break;

      case 'draw-clear':
        setCanvasStrokes([]);
        break;

      case 'draw-undo':
        setCanvasStrokes(payload.remainingStrokes);
        break;

      case 'memory-add':
        setMemories(prev => [...prev, { ...payload.item, author: 'peer' }]);
        break;

      case 'memory-delete':
        setMemories(prev => prev.filter(m => m.id !== payload.id));
        break;

      case 'timeline-add':
        setTimelineEvents(prev => [...prev, payload.event]);
        break;

      case 'timeline-delete':
        setTimelineEvents(prev => prev.filter(e => e.id !== payload.id));
        break;

      case 'select-game':
        setCurrentMiniGame(payload.game);
        setGameState({}); // Clear old game state
        break;

      case 'game-action':
        setGameState(prev => ({ ...prev, ...payload }));
        break;

      case 'quiz-action':
        setQuizState(prev => ({ ...prev, ...payload }));
        break;

      case 'quiz-reset':
        setQuizState({
          currentQuestionIndex: 0,
          myScore: 0,
          peerScore: 0,
          mySelection: null,
          peerSelection: null,
          quizEnded: false
        });
        break;

      case 'meter-action':
        setMeterState(prev => ({ ...prev, ...payload }));
        break;

      case 'meter-reset':
        setMeterState({
          questionsAnswersMe: [],
          questionsAnswersPeer: [],
          submittedMe: false,
          submittedPeer: false
        });
        break;

      case 'surprise':
        handleSurpriseReception(payload.surpriseType, payload.message);
        break;

      default:
        console.warn('Unknown message type received: ', type);
    }
  };

  const sendDataChannelMsg = (type: string, payload: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  // Peer Disconnect Handling
  const handlePeerDisconnect = () => {
    setPeerDisconnected(true);
    setIsConnected(false);
    setRemoteStream(null);
    setGameState({});
    
    // Reset call variables but keep room
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    // Initiator remains initiator, waits for re-connection
    console.log('Peer left. Listening for reconnect.');
  };

  const cleanupMediaAndRTC = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
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

  const createRoom = (): string => {
    const newRoomId = generateRandomRoomId();
    setRoomFullError(false);
    getUserMedia().then(() => {
      socketRef.current?.connect();
      socketRef.current?.emit('join-room', { roomId: newRoomId });
    });
    return newRoomId;
  };

  const joinRoom = (id: string) => {
    const upperId = id.trim().toUpperCase();
    setRoomFullError(false);
    getUserMedia().then(() => {
      socketRef.current?.connect();
      socketRef.current?.emit('join-room', { roomId: upperId });
    });
  };

  const leaveRoom = () => {
    socketRef.current?.emit('leave-room', { roomId: roomIdRef.current });
    socketRef.current?.disconnect();
    cleanupMediaAndRTC();
  };

  // MEDIA CONTROLS
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
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
        
        // Replace video track in RTCPeerConnection
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find(sender => sender.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        // When sharing ends (e.g. user clicks browser native stop sharing button)
        screenTrack.onended = () => {
          stopScreenSharing();
        };

        // Update local display stream for PIP
        // Merge screen video track with local audio track
        const localAudioTrack = localStream?.getAudioTracks()[0];
        const newStream = new MediaStream([screenTrack]);
        if (localAudioTrack) newStream.addTrack(localAudioTrack);
        setLocalStream(newStream);

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

    // Re-obtain original webcam media track
    navigator.mediaDevices.getUserMedia({ video: true }).then((camStream) => {
      const camTrack = camStream.getVideoTracks()[0];
      
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(sender => sender.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(camTrack);
        }
      }

      const mergedStream = new MediaStream([camTrack]);
      const localAudioTrack = localStream?.getAudioTracks()[0];
      if (localAudioTrack) mergedStream.addTrack(localAudioTrack);
      
      setLocalStream(mergedStream);
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
    // Random horizontal layout
    reactionEl.style.left = `${Math.random() * 80 + 10}%`;
    reactionEl.style.fontSize = '3rem';
    reactionEl.style.pointerEvents = 'none';
    reactionEl.style.zIndex = '9999';
    reactionEl.style.opacity = '1';
    reactionEl.style.transition = 'all 2.5s cubic-bezier(0.1, 0.8, 0.3, 1)';

    container.appendChild(reactionEl);

    // Animate rising and fading
    requestAnimationFrame(() => {
      reactionEl.style.transform = `translateY(-${window.innerHeight * 0.8}px) scale(1.5) rotate(${Math.random() * 60 - 30}deg)`;
      reactionEl.style.opacity = '0';
    });

    // Remove element after animation
    setTimeout(() => {
      reactionEl.remove();
    }, 2500);
  };

  // DRAWING CANVAS MODULE
  const sendCanvasDraw = (drawStroke: any) => {
    setCanvasStrokes(prev => [...prev, drawStroke]);
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
    // Action format sent: games are state driven, peer updates state variables
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

    // Display locally
    setSurpriseNotification({
      message: `You ${msgText}`,
      type
    });
    setTimeout(() => setSurpriseNotification(null), 5000);

    // Sync to peer
    sendDataChannelMsg('surprise', { surpriseType: type, message: msgText });
  };

  const handleSurpriseReception = (type: string, message: string) => {
    // Fire graphical effects on receiver side too!
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
        localStream,
        remoteStream,
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
      {/* Absolute overlay container for floating reacts across the viewport */}
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
