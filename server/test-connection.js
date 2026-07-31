const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const cors = require('cors');
const ioClient = require('socket.io-client');

// Spin up test server instance
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Map to track room participants
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId }) => {
    let clients = rooms.get(roomId);
    if (!clients) {
      clients = new Set();
      rooms.set(roomId, clients);
    }

    if (clients.size >= 2) {
      socket.emit('room-full');
      return;
    }

    clients.add(socket.id);
    socket.join(roomId);
    socket.emit('joined', { roomId, isInitiator: clients.size === 1 });

    if (clients.size === 2) {
      socket.to(roomId).emit('peer-joined', { peerId: socket.id });
    }
  });

  socket.on('offer', ({ sdp, roomId }) => {
    socket.to(roomId).emit('offer', { sdp, senderId: socket.id });
  });

  socket.on('answer', ({ sdp, roomId }) => {
    socket.to(roomId).emit('answer', { sdp, senderId: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, roomId }) => {
    socket.to(roomId).emit('ice-candidate', { candidate, senderId: socket.id });
  });
});

const TEST_PORT = 5099;
server.listen(TEST_PORT, () => {
  console.log(`Temporary signaling verification server listening on port ${TEST_PORT}`);
  runTests();
});

function runTests() {
  const socket1 = ioClient.connect(`http://localhost:${TEST_PORT}`, { forceNew: true });
  const socket2 = ioClient.connect(`http://localhost:${TEST_PORT}`, { forceNew: true });
  
  let joinedCount = 0;
  let peerJoinedReceived = false;
  let offerRelayed = false;
  let answerRelayed = false;
  let candidateRelayed = false;
  
  // Timeout failure guard
  const timeout = setTimeout(() => {
    console.error("\n❌ TEST TIMEOUT: WebRTC signaling handshake flow failed to complete in 5s");
    socket1.disconnect();
    socket2.disconnect();
    server.close();
    process.exit(1);
  }, 5000);

  // Client A (Initiator) handlers
  socket1.on('connect', () => {
    console.log("Virtual Client A: Connected to server");
    socket1.emit('join-room', { roomId: 'TESTROOM' });
  });

  socket1.on('joined', ({ isInitiator }) => {
    console.log(`Virtual Client A: Joined room. Initiator: ${isInitiator}`);
    joinedCount++;
  });

  socket1.on('peer-joined', () => {
    console.log("Virtual Client A: Notified that peer joined. Initiating offer sdp...");
    peerJoinedReceived = true;
    socket1.emit('offer', { sdp: 'fake-sdp-offer-content', roomId: 'TESTROOM' });
  });

  socket1.on('answer', ({ sdp }) => {
    console.log("Virtual Client A: Received answer sdp from relay:", sdp);
    answerRelayed = true;
    socket1.emit('ice-candidate', { candidate: 'fake-ice-candidate-payload', roomId: 'TESTROOM' });
  });

  // Client B (Joiner) handlers
  socket2.on('connect', () => {
    console.log("Virtual Client B: Connected to server");
    socket2.emit('join-room', { roomId: 'TESTROOM' });
  });

  socket2.on('joined', ({ isInitiator }) => {
    console.log(`Virtual Client B: Joined room. Initiator: ${isInitiator}`);
    joinedCount++;
  });

  socket2.on('offer', ({ sdp }) => {
    console.log("Virtual Client B: Received offer sdp from relay:", sdp);
    offerRelayed = true;
    socket2.emit('answer', { sdp: 'fake-sdp-answer-content', roomId: 'TESTROOM' });
  });

  socket2.on('ice-candidate', ({ candidate }) => {
    console.log("Virtual Client B: Received ice-candidate from relay:", candidate);
    candidateRelayed = true;
    
    // Check outcome
    clearTimeout(timeout);
    console.log("\n=============================================");
    console.log("SIGNALING VERIFICATION RESULTS:");
    console.log(`- Connection & Room Entries: ${joinedCount}/2`);
    console.log(`- Peer Notification Received: ${peerJoinedReceived}`);
    console.log(`- WebRTC Offer Relayed: ${offerRelayed}`);
    console.log(`- WebRTC Answer Relayed: ${answerRelayed}`);
    console.log(`- ICE Candidates Relayed: ${candidateRelayed}`);
    console.log("=============================================");
    
    if (joinedCount === 2 && peerJoinedReceived && offerRelayed && answerRelayed && candidateRelayed) {
      console.log("🎉 SUCCESS: WebRTC signaling server is working 100% correctly!");
      socket1.disconnect();
      socket2.disconnect();
      server.close();
      process.exit(0);
    } else {
      console.error("❌ FAILURE: WebRTC signaling flow relays were incomplete.");
      socket1.disconnect();
      socket2.disconnect();
      server.close();
      process.exit(1);
    }
  });
}
