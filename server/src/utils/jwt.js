const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "friendverse_super_secret_fallback_key";

const JWT_EXPIRES =
  process.env.JWT_EXPIRES || "7d";

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar || null,
      theme: user.theme || "aurora"
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES
    }
  );
};

const verifyToken = (token) => {
  return jwt.verify(
    token,
    JWT_SECRET
  );
};

module.exports = {
  generateToken,
  verifyToken
};