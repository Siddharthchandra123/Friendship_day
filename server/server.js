const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'ok', timestamp: new Date() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict this to your frontend URL
    methods: ['GET', 'POST'],
  },
});

// Map to track room participants
// roomId -> Set of socket.ids
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', ({ roomId }) => {
    console.log(`User ${socket.id} requesting to join room: ${roomId}`);
    
    if (!roomId) {
      socket.emit('error-msg', { message: 'Invalid Room ID' });
      return;
    }

    let clients = rooms.get(roomId);
    if (!clients) {
      clients = new Set();
      rooms.set(roomId, clients);
    }

    if (clients.size >= 2) {
      console.log(`Room ${roomId} is full. User ${socket.id} rejected.`);
      socket.emit('room-full');
      return;
    }

    // Join the room
    clients.add(socket.id);
    socket.join(roomId);
    
    console.log(`User ${socket.id} successfully joined room ${roomId}. Room size: ${clients.size}`);
    
    // Notify the user they joined successfully
    socket.emit('joined', { roomId, isInitiator: clients.size === 1 });

    // If there is already another user, notify the existing user to start the offer
    if (clients.size === 2) {
      console.log(`Room ${roomId} is ready. Notifying peer to initiate WebRTC.`);
      socket.to(roomId).emit('peer-joined', { peerId: socket.id });
    }
  });

  // Relay WebRTC Offer
  socket.on('offer', ({ sdp, roomId }) => {
    console.log(`Relaying offer from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('offer', { sdp, senderId: socket.id });
  });

  // Relay WebRTC Answer
  socket.on('answer', ({ sdp, roomId }) => {
    console.log(`Relaying answer from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('answer', { sdp, senderId: socket.id });
  });

  // Relay ICE Candidates
  socket.on('ice-candidate', ({ candidate, roomId }) => {
    console.log(`Relaying ICE Candidate from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit('ice-candidate', { candidate, senderId: socket.id });
  });

  // Handle manual WebRTC disconnect/leave
  socket.on('leave-room', ({ roomId }) => {
    console.log(`User ${socket.id} leaving room ${roomId}`);
    handleUserLeave(socket, roomId);
  });

  socket.on('disconnecting', () => {
    // Leave all rooms the socket was in
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
      // Notify the remaining user that the peer disconnected
      socket.to(roomId).emit('peer-left', { peerId: socket.id });
    }
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
