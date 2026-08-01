const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOGS_FILE = path.join(DATA_DIR, 'audit_logs.json');

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, JSON.stringify([]));

function readData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write data:', err);
  }
}

const db = {
  getUsers: () => readData(USERS_FILE),
  saveUsers: (users) => writeData(USERS_FILE, users),
  getLogs: () => readData(LOGS_FILE),
  saveLogs: (logs) => writeData(LOGS_FILE, logs),
};

module.exports = {
  // Find user by username
  getUserByUsername: (username) => {
    const users = db.getUsers();
    return users.find(u => u.username === username) || null;
  },

  getUserByEmail: (email) => {
    const users = db.getUsers();
    return users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  
  // Find user by ID
  getUserById: (id) => {
    const users = db.getUsers();
    return users.find(u => u.id === id) || null;
  },

  // Create user
  createUser: (userId, username, passwordHash, nickname, callback, email = null) => {
    const users = db.getUsers();
    if (users.some(u => u.username === username)) {
      return callback(new Error('UNIQUE constraint failed'));
    }
    const newUser = {
      id: userId,
      username,
      password_hash: passwordHash,
      nickname,
      avatar: null,
      email: email || null,
      created_at: Date.now()
    };
    users.push(newUser);
    db.saveUsers(users);
    callback(null, newUser);
  },

  // Update user profile
  updateUser: (userId, nickname, avatar, passwordHash, callback) => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return callback(new Error('User not found'));
    }
    users[index].nickname = nickname;
    users[index].avatar = avatar;
    users[index].password_hash = passwordHash;
    db.saveUsers(users);
    callback(null, users[index]);
  },

  // Log audit event
  logAuditEvent: (eventType, userId, username, roomId, details, ip) => {
    const logs = db.getLogs();
    const newLog = {
      id: logs.length + 1,
      event_type: eventType,
      user_id: userId,
      username,
      room_id: roomId,
      details,
      ip_address: ip || 'unknown',
      timestamp: Date.now()
    };
    logs.push(newLog);
    db.saveLogs(logs);
  }
};
