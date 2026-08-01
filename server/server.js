require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');
const { Kafka } = require('kafkajs');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Kafka client if broker is configured
let kafka, producer, consumer;
const KAFKA_BROKER = process.env.KAFKA_BROKER;

const localHistory = new Map(); // roomId -> { chat, memories, timeline }

function getLocalRoomState(roomId) {
  let state = localHistory.get(roomId);
  if (!state) {
    state = {
      chat: [],
      memories: [],
      timeline: [
        { id: '1', year: '2020', text: 'We met for the first time!' },
        { id: '2', year: '2022', text: 'Our legendary road trip 🚗' },
        { id: '3', year: '2024', text: 'Graduation Day! 🎓' },
        { id: '4', year: '2026', text: 'Still best friends forever! ❤️' }
      ]
    };
    localHistory.set(roomId, state);
  }
  return state;
}

// Background Kafka connection and consumer runner
async function startKafka() {
  const isRender = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
  const finalBroker = (isRender && KAFKA_BROKER === 'localhost:9092') ? null : KAFKA_BROKER;

  if (!finalBroker) {
    console.log('Running in cloud/fallback mode (no local Kafka broker connection attempted). Using local memory queues.');
    return;
  }

  try {
    console.log(`Connecting to self-hosted Kafka broker at ${finalBroker}...`);
    const { logLevel } = require('kafkajs');
    kafka = new Kafka({
      clientId: 'friendverse-gateway',
      brokers: [finalBroker],
      logLevel: logLevel.ERROR, // Suppress verbose warning/info logs
      retry: {
        initialRetryTime: 100,
        retries: 1 // Fail fast if broker is unavailable
      }
    });

    producer = kafka.producer();
    // Unique group ID per gateway node so they all get a copy of room events (Pub/Sub pattern)
    consumer = kafka.consumer({ 
      groupId: 'friendverse-group-' + Math.random().toString(36).substring(2, 8) 
    });

    const admin = kafka.admin();
    await admin.connect();
    const existingTopics = await admin.listTopics();
    if (!existingTopics.includes('friendverse-events')) {
      console.log('Creating topic "friendverse-events"...');
      await admin.createTopics({
        topics: [{
          topic: 'friendverse-events',
          numPartitions: 1,
          replicationFactor: 1
        }]
      });
    }
    await admin.disconnect();

    await producer.connect();
    await consumer.connect();
    
    // Subscribe to friendverse events
    await consumer.subscribe({ topic: 'friendverse-events', fromBeginning: true });
    console.log('Kafka Producer and Consumer connected successfully.');

    // Event Sourcing replay / updates loop
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) return;
          const event = JSON.parse(message.value.toString());
          const { roomId, type, payload, senderId } = event;

          console.log(`Kafka Event received: ${type} for room ${roomId}`);

          // Sync local in-memory history cache
          const localState = getLocalRoomState(roomId);
          
          if (type === 'chat') {
            if (!localState.chat.some(c => c.id === payload.id)) {
              localState.chat.push(payload);
            }
            // Relay chat to other users in the room
            io.to(roomId).emit('chat', { senderId, message: payload });
          } else if (type === 'memory-add') {
            if (!localState.memories.some(m => m.id === payload.id)) {
              localState.memories.push(payload);
            }
            io.to(roomId).emit('memory-add', { item: payload });
          } else if (type === 'memory-delete') {
            localState.memories = localState.memories.filter(m => m.id !== payload.id);
            io.to(roomId).emit('memory-delete', { id: payload.id });
          } else if (type === 'timeline-add') {
            if (!localState.timeline.some(t => t.id === payload.id)) {
              localState.timeline.push(payload);
            }
            io.to(roomId).emit('timeline-add', { event: payload });
          } else if (type === 'timeline-delete') {
            localState.timeline = localState.timeline.filter(t => t.id !== payload.id);
            io.to(roomId).emit('timeline-delete', { id: payload.id });
          }
        } catch (e) {
          console.error('Error parsing or handling consumed message:', e);
        }
      }
    });
  } catch (err) {
    console.error('Failed to connect to self-hosted Kafka. Falling back to local events:', err);
    producer = null;
    consumer = null;
  }
}

// Trigger background Kafka start
startKafka();

async function publishEvent(roomId, eventType, payload, senderId) {
  // Update local memory state (fallback / caching)
  const localState = getLocalRoomState(roomId);
  if (!producer) {
    if (eventType === 'chat') {
      localState.chat.push(payload);
    } else if (eventType === 'memory-add') {
      localState.memories.push(payload);
    } else if (eventType === 'memory-delete') {
      localState.memories = localState.memories.filter(m => m.id !== payload.id);
    } else if (eventType === 'timeline-add') {
      localState.timeline.push(payload);
    } else if (eventType === 'timeline-delete') {
      localState.timeline = localState.timeline.filter(t => t.id !== payload.id);
    }
  }

  // Publish event to Kafka cluster if available
  if (producer) {
    try {
      const event = {
        roomId,
        type: eventType,
        payload,
        senderId,
        timestamp: Date.now()
      };
      await producer.send({
        topic: 'friendverse-events',
        messages: [{
          key: roomId,
          value: JSON.stringify(event)
        }]
      });
      console.log(`Published event ${eventType} to Kafka for room ${roomId}`);
    } catch (err) {
      console.error(`Error sending message to Kafka:`, err);
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'ok', timestamp: new Date() });
});

// Endpoint to generate LiveKit Access Tokens
app.get('/api/livekit-token', async (req, res) => {
  const { roomId, nickname, socketId } = req.query;
  if (!roomId || !nickname) {
    return res.status(400).json({ error: 'roomId and nickname are required' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    console.warn('LiveKit credentials missing, returning mock connection details.');
    return res.json({ token: 'mock-token', serverUrl: 'ws://localhost:7880', isMock: true });
  }

  try {
    const identity = socketId || (nickname + '_' + Math.random().toString(36).substring(2, 6));
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      name: nickname,
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token, serverUrl: livekitUrl });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Map to track room participants
// roomId -> Map of socket.id -> { id: string, nickname: string }
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', async ({ roomId, nickname }) => {
    console.log(`User ${socket.id} (${nickname || 'anonymous'}) requesting to join room: ${roomId}`);
    
    if (!roomId) {
      socket.emit('error-msg', { message: 'Invalid Room ID' });
      return;
    }

    let clients = rooms.get(roomId);
    if (!clients) {
      clients = new Map();
      rooms.set(roomId, clients);
    }

    if (clients.size >= 5) {
      console.log(`Room ${roomId} is full. User ${socket.id} rejected.`);
      socket.emit('room-full');
      return;
    }

    // Get existing other users in the room
    const otherUsers = Array.from(clients.entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ id, nickname: info.nickname || 'Friend' }));

    // Join the room
    clients.set(socket.id, { id: socket.id, nickname: nickname || 'Friend' });
    socket.join(roomId);
    
    console.log(`User ${socket.id} successfully joined room ${roomId}. Room size: ${clients.size}`);
    
    // Fetch room history from local cache (which is populated from Kafka logs)
    const history = getLocalRoomState(roomId);

    // Notify the user they joined successfully and provide existing peer list & history
    socket.emit('joined', { roomId, otherUsers, history });

    // Notify existing peers that a new user joined
    socket.to(roomId).emit('peer-joined', { peerId: socket.id, nickname: nickname || 'Friend' });
  });

  // Relays for data sync (Events either go to Kafka or get relayed immediately on local fallback)
  socket.on('chat', async ({ roomId, message }) => {
    if (producer) {
      await publishEvent(roomId, 'chat', message, socket.id);
    } else {
      const localState = getLocalRoomState(roomId);
      localState.chat.push(message);
      socket.to(roomId).emit('chat', { senderId: socket.id, message });
    }
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { senderId: socket.id, isTyping });
  });

  socket.on('reaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('reaction', { emoji });
  });

  socket.on('draw-stroke', ({ roomId, stroke }) => {
    socket.to(roomId).emit('draw-stroke', { stroke });
  });

  socket.on('draw-clear', ({ roomId }) => {
    socket.to(roomId).emit('draw-clear');
  });

  socket.on('draw-undo', ({ roomId, remainingStrokes }) => {
    socket.to(roomId).emit('draw-undo', { remainingStrokes });
  });

  socket.on('memory-add', async ({ roomId, item }) => {
    if (producer) {
      await publishEvent(roomId, 'memory-add', item, socket.id);
    } else {
      const localState = getLocalRoomState(roomId);
      localState.memories.push(item);
      socket.to(roomId).emit('memory-add', { item });
    }
  });

  socket.on('memory-delete', async ({ roomId, id }) => {
    if (producer) {
      await publishEvent(roomId, 'memory-delete', { id }, socket.id);
    } else {
      const localState = getLocalRoomState(roomId);
      localState.memories = localState.memories.filter(m => m.id !== id);
      socket.to(roomId).emit('memory-delete', { id });
    }
  });

  socket.on('timeline-add', async ({ roomId, event }) => {
    if (producer) {
      await publishEvent(roomId, 'timeline-add', event, socket.id);
    } else {
      const localState = getLocalRoomState(roomId);
      localState.timeline.push(event);
      socket.to(roomId).emit('timeline-add', { event });
    }
  });

  socket.on('timeline-delete', async ({ roomId, id }) => {
    if (producer) {
      await publishEvent(roomId, 'timeline-delete', { id }, socket.id);
    } else {
      const localState = getLocalRoomState(roomId);
      localState.timeline = localState.timeline.filter(t => t.id !== id);
      socket.to(roomId).emit('timeline-delete', { id });
    }
  });

  socket.on('select-game', ({ roomId, game }) => {
    socket.to(roomId).emit('select-game', { game });
  });

  socket.on('game-action', ({ roomId, payload }) => {
    socket.to(roomId).emit('game-action', payload);
  });

  socket.on('quiz-action', ({ roomId, payload }) => {
    socket.to(roomId).emit('quiz-action', payload);
  });

  socket.on('quiz-reset', ({ roomId }) => {
    socket.to(roomId).emit('quiz-reset');
  });

  socket.on('meter-action', ({ roomId, payload }) => {
    socket.to(roomId).emit('meter-action', payload);
  });

  socket.on('meter-reset', ({ roomId }) => {
    socket.to(roomId).emit('meter-reset');
  });

  socket.on('surprise', ({ roomId, surpriseType, message }) => {
    socket.to(roomId).emit('surprise', { surpriseType, message });
  });

  socket.on('leave-room', ({ roomId }) => {
    console.log(`User ${socket.id} leaving room ${roomId}`);
    handleUserLeave(socket, roomId);
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        handleUserLeave(socket, roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

function handleUserLeave(socket, roomId) {
  const clients = rooms.get(roomId);
  if (clients) {
    clients.delete(socket.id);
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}. Remaining size: ${clients.size}`);
    
    if (clients.size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} is empty and deleted.`);
    } else {
      socket.to(roomId).emit('peer-left', { peerId: socket.id });
    }
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Production server listening on port ${PORT}`);
});
