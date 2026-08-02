require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Kafka } = require('kafkajs');
const { OAuth2Client } = require('google-auth-library');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const net = require('net');
const { getKafkaBootstrapServers, getKafkaTopicName, getKafkaConsumerGroupId } = require('./kafkaConfig');

const postsRoutes = require("./src/routes/posts.routes");

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/posts", postsRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'friendverse_super_secret_fallback_key';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Import file-based database helper (pure JS fallback for Render compatibility)
const db = require("./db");

const logAuditEvent = (
    eventType,
    userId,
    username,
    roomId,
    details,
    ip
) => {

    db.audit.log({

        eventType,

        userId,

        username,

        roomId,

        details,

        ip

    });

};
// Initialize Kafka client if broker is configured
let kafka, producer, consumer;
const KAFKA_BROKER = getKafkaBootstrapServers();
const KAFKA_TOPIC = getKafkaTopicName();
const KAFKA_GROUP_ID = getKafkaConsumerGroupId();

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

async function isKafkaBrokerReachable(broker) {
  return new Promise((resolve) => {
    const [host, portValue] = broker.split(':');
    const port = Number(portValue || 9092);
    const socket = new net.Socket();
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeAllListeners();
    };

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      resolve(false);
    }, 1500);

    socket.once('connect', () => {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Background Kafka connection and consumer runner
function emitRoomEvent(eventName, roomId, payload, senderId = null, targetSocket = null) {
  if (!io) return;

  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  if (!roomSockets) return;

  for (const socketId of roomSockets) {
    if (senderId && socketId === senderId) continue;
    if (targetSocket && socketId !== targetSocket.id) continue;
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(eventName, payload);
    }
  }
}

async function startKafka() {
  const isRender = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
  const finalBroker = (isRender && KAFKA_BROKER === 'localhost:9092') ? null : KAFKA_BROKER;

  if (!finalBroker) {
    console.log('Running in cloud/fallback mode (no local Kafka broker connection attempted). Using local memory queues.');
    return;
  }

  const bootstrapServers = finalBroker.split(',');
  const reachable = await Promise.any(
    bootstrapServers.map(async (server) => {
      const reachableServer = await isKafkaBrokerReachable(server);
      if (!reachableServer) {
        throw new Error(server);
      }
      return server;
    })
  ).catch(() => null);

  if (!reachable) {
    console.log(`Kafka brokers ${bootstrapServers.join(', ')} are not reachable. Using local memory queues.`);
    producer = null;
    consumer = null;
    return;
  }

  try {
    console.log(`Connecting to Kafka brokers at ${bootstrapServers.join(', ')}...`);
    const { logLevel } = require('kafkajs');
    kafka = new Kafka({
      clientId: 'friendverse-gateway',
      brokers: bootstrapServers,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 1
      }
    });

    producer = kafka.producer();
    // Unique group ID per gateway node so they all get a copy of room events (Pub/Sub pattern)
    consumer = kafka.consumer({ 
      groupId: KAFKA_GROUP_ID
    });

    const admin = kafka.admin();
    await admin.connect();
    const existingTopics = await admin.listTopics();
    if (!existingTopics.includes(KAFKA_TOPIC)) {
      console.log(`Creating topic "${KAFKA_TOPIC}"...`);
      await admin.createTopics({
        topics: [{
          topic: KAFKA_TOPIC,
          numPartitions: 1,
          replicationFactor: 1
        }]
      });
    }
    await admin.disconnect();

    await producer.connect();
    await consumer.connect();
    
    // Subscribe to friendverse events
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });
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
            emitRoomEvent('chat', roomId, { senderId, message: payload }, senderId);
            emitRoomEvent('activity-feed', roomId, {
              id: `kafka-chat-${payload.id || Date.now()}`,
              type: 'chat',
              title: 'New message',
              message: payload.text || 'Sent a new message',
              actorName: payload.sender || 'Someone',
              timestamp: Date.now()
            }, senderId);
          } else if (type === 'reaction') {
            emitRoomEvent('reaction', roomId, { emoji: payload.emoji }, senderId);
            emitRoomEvent('activity-feed', roomId, {
              id: `kafka-reaction-${Date.now()}`,
              type: 'reaction',
              title: 'Reaction sent',
              message: `${payload.actorName || 'Someone'} reacted with ${payload.emoji}`,
              actorName: payload.actorName || 'Someone',
              timestamp: Date.now()
            }, senderId);
          } else if (type === 'memory-add') {
            if (!localState.memories.some(m => m.id === payload.id)) {
              localState.memories.push(payload);
            }
            emitRoomEvent('memory-add', roomId, { item: payload }, senderId);
            emitRoomEvent('activity-feed', roomId, {
              id: `kafka-memory-${payload.id || Date.now()}`,
              type: 'memory',
              title: 'Memory added',
              message: payload.title ? `Added “${payload.title}” to the memory wall` : 'Added a new memory',
              actorName: payload.author || 'Someone',
              timestamp: Date.now()
            }, senderId);
          } else if (type === 'memory-delete') {
            localState.memories = localState.memories.filter(m => m.id !== payload.id);
            emitRoomEvent('memory-delete', roomId, { id: payload.id }, senderId);
          } else if (type === 'timeline-add') {
            if (!localState.timeline.some(t => t.id === payload.id)) {
              localState.timeline.push(payload);
            }
            emitRoomEvent('timeline-add', roomId, { event: payload }, senderId);
            emitRoomEvent('activity-feed', roomId, {
              id: `kafka-timeline-${payload.id || Date.now()}`,
              type: 'timeline',
              title: 'Timeline update',
              message: payload.text ? `Added ${payload.text}` : 'Added a new timeline moment',
              actorName: payload.author || 'Someone',
              timestamp: Date.now()
            }, senderId);
          } else if (type === 'timeline-delete') {
            localState.timeline = localState.timeline.filter(t => t.id !== payload.id);
            emitRoomEvent('timeline-delete', roomId, { id: payload.id }, senderId);
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

async function publishEvent(roomId, eventType, payload, senderId, socket = null) {
  const localState = getLocalRoomState(roomId);

  if (!producer) {
    if (eventType === 'chat') {
      localState.chat.push(payload);
      emitRoomEvent('chat', roomId, { senderId, message: payload }, senderId, socket);
      emitRoomEvent('activity-feed', roomId, {
        id: `local-chat-${payload.id || Date.now()}`,
        type: 'chat',
        title: 'New message',
        message: payload.text || 'Sent a new message',
        actorName: payload.sender || 'Someone',
        timestamp: Date.now()
      }, senderId, socket);
    } else if (eventType === 'reaction') {
      emitRoomEvent('reaction', roomId, { emoji: payload.emoji }, senderId, socket);
      emitRoomEvent('activity-feed', roomId, {
        id: `local-reaction-${Date.now()}`,
        type: 'reaction',
        title: 'Reaction sent',
        message: `${payload.actorName || 'Someone'} reacted with ${payload.emoji}`,
        actorName: payload.actorName || 'Someone',
        timestamp: Date.now()
      }, senderId, socket);
    } else if (eventType === 'memory-add') {
      localState.memories.push(payload);
      emitRoomEvent('memory-add', roomId, { item: payload }, senderId, socket);
      emitRoomEvent('activity-feed', roomId, {
        id: `local-memory-${payload.id || Date.now()}`,
        type: 'memory',
        title: 'Memory added',
        message: payload.title ? `Added “${payload.title}” to the memory wall` : 'Added a new memory',
        actorName: payload.author || 'Someone',
        timestamp: Date.now()
      }, senderId, socket);
    } else if (eventType === 'memory-delete') {
      localState.memories = localState.memories.filter(m => m.id !== payload.id);
      emitRoomEvent('memory-delete', roomId, { id: payload.id }, senderId, socket);
    } else if (eventType === 'timeline-add') {
      localState.timeline.push(payload);
      emitRoomEvent('timeline-add', roomId, { event: payload }, senderId, socket);
      emitRoomEvent('activity-feed', roomId, {
        id: `local-timeline-${payload.id || Date.now()}`,
        type: 'timeline',
        title: 'Timeline update',
        message: payload.text ? `Added ${payload.text}` : 'Added a new timeline moment',
        actorName: payload.author || 'Someone',
        timestamp: Date.now()
      }, senderId, socket);
    } else if (eventType === 'timeline-delete') {
      localState.timeline = localState.timeline.filter(t => t.id !== payload.id);
      emitRoomEvent('timeline-delete', roomId, { id: payload.id }, senderId, socket);
    }
    return;
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
        topic: KAFKA_TOPIC,
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

async function getOrCreateGoogleUser(googlePayload) {

    const email =
        googlePayload.email
            ?.toLowerCase();

    if (!email)
        throw new Error(
            "Google account email required."
        );

    let user =
        db.users.getByEmail(email);

    if (user)
        return user;

    let usernameBase =
        (
            email.split("@")[0] ||
            `googleuser${googlePayload.sub}`
        )
            .replace(
                /[^a-z0-9._-]/g,
                ""
            )
            .toLowerCase();

    let username =
        usernameBase;

    let suffix = 1;

    while (
        db.users.getByUsername(
            username
        )
    ) {

        username =
            `${usernameBase}${suffix++}`;

    }

    const passwordHash =
        await bcrypt.hash(

            `google-oauth:${googlePayload.sub}`,

            10

        );

    user =
        db.users.create({

            username,

            nickname:
                googlePayload.name ||
                username,

            passwordHash,

            email,

            avatar:
                googlePayload.picture,

            theme:
                "aurora"

        });

    return user;

}

// Authentication Routes
const authRoutes = require("./src/routes/auth.routes");

app.use("/api/auth", authRoutes);
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

  const getSocketIp = (socket) => {
    return socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  };

  let clientNickname = 'anonymous';

  socket.on('join-room', async ({ roomId, nickname }) => {
    clientNickname = nickname || 'anonymous';
    console.log(`User ${socket.id} (${clientNickname}) requesting to join room: ${roomId}`);
    
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
    clients.set(socket.id, { id: socket.id, nickname: clientNickname });
    console.log("=================================");
    console.log("User joined");

    console.log("Room:", roomId);

    console.log("Current users:");

    for (const [id, info] of clients.entries()) {
      console.log(id, info.nickname);
    }

    console.log("Room size:", clients.size);
    console.log("=================================");
    socket.join(roomId);
    
    console.log(`User ${socket.id} successfully joined room ${roomId}. Room size: ${clients.size}`);
    logAuditEvent('ROOM_JOIN', null, clientNickname, roomId, { socketId: socket.id }, getSocketIp(socket));
    
    // Fetch room history from local cache (which is populated from Kafka logs)
    const history = getLocalRoomState(roomId);

    // Notify the user they joined successfully and provide existing peer list & history
    socket.emit('joined', { roomId, otherUsers, history });

    // Notify existing peers that a new user joined
    socket.to(roomId).emit('peer-joined', { peerId: socket.id, nickname: clientNickname });
  });

  // Relays for data sync (Events either go to Kafka or get relayed immediately on local fallback)
  socket.on('chat', async ({ roomId, message }) => {
    logAuditEvent('ROOM_CHAT', null, clientNickname, roomId, { message }, getSocketIp(socket));
    if (producer) {
      await publishEvent(roomId, 'chat', message, socket.id, socket);
    } else {
      await publishEvent(roomId, 'chat', message, socket.id, socket);
    }
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { senderId: socket.id, isTyping });
  });

  socket.on('webrtc-offer', ({ roomId, targetPeerId, offer }) => {
    socket.to(targetPeerId).emit('webrtc-offer', { peerId: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ roomId, targetPeerId, answer }) => {
    socket.to(targetPeerId).emit('webrtc-answer', { peerId: socket.id, answer });
  });

  socket.on('webrtc-candidate', ({ roomId, targetPeerId, candidate }) => {
    socket.to(targetPeerId).emit('webrtc-candidate', { peerId: socket.id, candidate });
  });

  socket.on('reaction', async ({ roomId, emoji }) => {
    if (producer) {
      await publishEvent(roomId, 'reaction', { emoji, actorName: clientNickname || 'Someone' }, socket.id, socket);
    } else {
      await publishEvent(roomId, 'reaction', { emoji, actorName: clientNickname || 'Someone' }, socket.id, socket);
    }
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
    logAuditEvent('ROOM_MEMORY_ADD', null, clientNickname, roomId, { item }, getSocketIp(socket));
    if (producer) {
      await publishEvent(roomId, 'memory-add', item, socket.id, socket);
    } else {
      await publishEvent(roomId, 'memory-add', item, socket.id, socket);
    }
  });

  socket.on('memory-delete', async ({ roomId, id }) => {
    logAuditEvent('ROOM_MEMORY_DELETE', null, clientNickname, roomId, { id }, getSocketIp(socket));
    if (producer) {
      await publishEvent(roomId, 'memory-delete', { id }, socket.id, socket);
    } else {
      await publishEvent(roomId, 'memory-delete', { id }, socket.id, socket);
    }
  });

  socket.on('timeline-add', async ({ roomId, event }) => {
    logAuditEvent('ROOM_TIMELINE_ADD', null, clientNickname, roomId, { event }, getSocketIp(socket));
    if (producer) {
      await publishEvent(roomId, 'timeline-add', event, socket.id, socket);
    } else {
      await publishEvent(roomId, 'timeline-add', event, socket.id, socket);
    }
  });

  socket.on('timeline-delete', async ({ roomId, id }) => {
    logAuditEvent('ROOM_TIMELINE_DELETE', null, clientNickname, roomId, { id }, getSocketIp(socket));
    if (producer) {
      await publishEvent(roomId, 'timeline-delete', { id }, socket.id, socket);
    } else {
      await publishEvent(roomId, 'timeline-delete', { id }, socket.id, socket);
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

  socket.on("leave-room", ({ roomId }) => {
    console.log(`User ${socket.id} leaving room ${roomId}`);

    handleUserLeave(socket, roomId);

    socket.leave(roomId);
  });

  socket.on("disconnecting", () => {
    console.log(`Socket ${socket.id} disconnecting...`);

    for (const roomId of socket.rooms) {
      // Ignore the socket's own private room
      if (roomId === socket.id) continue;

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

  if (!clients) {
    return;
  }

  console.log("=================================");
  console.log("Before removing user");
  console.log("Room:", roomId);
  console.log("Clients:", [...clients.keys()]);
  console.log("Leaving:", socket.id);

  // Remove only this user
  clients.delete(socket.id);

  // Notify remaining users
  socket.to(roomId).emit("peer-left", {
    peerId: socket.id,
  });

  // Delete room ONLY if empty
  if (clients.size === 0) {
    console.log(`Deleting empty room ${roomId}`);
    rooms.delete(roomId);
  } else {
    rooms.set(roomId, clients);
  }

  console.log("After removing user");
  console.log("Remaining:", [...clients.keys()]);
  console.log("=================================");
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    kafka: producer ? 'connected' : 'fallback',
    topic: KAFKA_TOPIC,
    groupId: KAFKA_GROUP_ID
  });
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Production server listening on port ${PORT}`);
});
