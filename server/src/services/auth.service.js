const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("../../db");

const { generateToken } = require("../utils/jwt");
const { toUserDTO } = require("../utils/userDto");

const DEFAULT_THEME = "aurora";

const register = async ({
  username,
  nickname,
  password
}) => {

  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  const existing = db.users.getByUsername(username);
  if (existing) {
    throw new Error("Username already exists.");
  }

  const passwordHash =
    await bcrypt.hash(password, 10);

  const user = {

    id: crypto.randomUUID(),

    username,

    nickname:
      nickname || username,

    avatar: null,

    theme: DEFAULT_THEME,

    passwordHash

  };

  db.users.create(user);

  const token =
    generateToken(user);

  return {

    token,

    user: toUserDTO(user)

  };

};

const login = async ({
  username,
  password
}) => {

  if (!username || !password) {
    throw new Error("Missing credentials.");
  }

  const user =
    db.users.getByUsername(username);

  if (!user) {
    throw new Error("Invalid username or password.");
  }

  const ok =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!ok) {
    throw new Error("Invalid username or password.");
  }

  const token =
    generateToken(user);

  return {

    token,

    user: toUserDTO(user)

  };

};

const getCurrentUser = (id) => {

  const user =
    db.users.getById(id);

  if (!user) {
    throw new Error("User not found.");
  }

  return toUserDTO(user);

};

const updateProfile = async (

  id,

  {

    nickname,

    avatar,

    password,

    theme

  }

) => {

  const user =
    db.users.getById(id);

  if (!user) {
    throw new Error("User not found.");
  }

  if (nickname !== undefined) {
    user.nickname = nickname;
  }

  if (avatar !== undefined) {
    user.avatar = avatar;
  }

  if (theme !== undefined) {
    user.theme = theme;
  }

  if (password) {

    user.passwordHash =
      await bcrypt.hash(
        password,
        10
      );

  }

  db.users.update(user);

  return toUserDTO(user);

};

const logout = () => {

  return true;

};

const googleLogin = ({
  username,
  nickname,
  avatar
}) => {

  let user =
    db.user.getByUsername(username);

  if (!user) {

    user = {

      id: crypto.randomUUID(),

      username,

      nickname:
        nickname || username,

      avatar:
        avatar || null,

      theme:
        DEFAULT_THEME,

      passwordHash: null

    };

    db.users.create(user);

  }

  const token =
    generateToken(user);

  return {

    token,

    user: toUserDTO(user)

  };

};

module.exports = {

  register,

  login,

  logout,

  googleLogin,

  getCurrentUser,

  updateProfile

};