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

    if (clients.size >= 5) {
      console.log(`Room ${roomId} is full. User ${socket.id} rejected.`);
      socket.emit('room-full');
      return;
    }

    // Get existing other users in the room
    const otherUsers = Array.from(clients).filter(id => id !== socket.id);

    // Join the room
    clients.add(socket.id);
    socket.join(roomId);
    
    console.log(`User ${socket.id} successfully joined room ${roomId}. Room size: ${clients.size}`);
    
    // Notify the user they joined successfully and provide existing peer list
    socket.emit('joined', { roomId, otherUsers });

    // Notify existing peers that a new user joined
    socket.to(roomId).emit('peer-joined', { peerId: socket.id });
  });

  // Relay WebRTC Offer directly to a target peer
  socket.on('offer', ({ sdp, targetUserId }) => {
    console.log(`Relaying offer from ${socket.id} to ${targetUserId}`);
    io.to(targetUserId).emit('offer', { sdp, senderId: socket.id });
  });

  // Relay WebRTC Answer directly to a target peer
  socket.on('answer', ({ sdp, targetUserId }) => {
    console.log(`Relaying answer from ${socket.id} to ${targetUserId}`);
    io.to(targetUserId).emit('answer', { sdp, senderId: socket.id });
  });

  // Relay ICE Candidates directly to a target peer
  socket.on('ice-candidate', ({ candidate, targetUserId }) => {
    console.log(`Relaying ICE Candidate from ${socket.id} to ${targetUserId}`);
    io.to(targetUserId).emit('ice-candidate', { candidate, senderId: socket.id });
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
      // Notify all remaining users in the room that this peer disconnected
      socket.to(roomId).emit('peer-left', { peerId: socket.id });
    }
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
