const toUserDTO = (user) => ({
  id: user.id,

  username: user.username,

  nickname: user.nickname,

  avatar: user.avatar || null,

  theme: user.theme || "aurora"
});

module.exports = {
  toUserDTO
};