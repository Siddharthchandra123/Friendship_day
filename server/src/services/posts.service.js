const crypto = require("crypto");

let posts = [];

const getAllPosts = () => {
  return posts.sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );
};

const getPostById = (id) => {
  return posts.find((p) => p.id === id);
};

const createPost = ({
  user,
  content,
  media
}) => {
  const post = {
    id: crypto.randomUUID(),

    user_id: user.id,

    username: user.username,

    nickname: user.nickname,

    avatar: user.avatar || null,

    content,

    media: media || null,

    likes: [],

    comments: [],

    createdAt: new Date().toISOString(),

    updatedAt: new Date().toISOString()
  };

  posts.unshift(post);

  return post;
};

const deletePost = (id) => {
  const index = posts.findIndex(
    (p) => p.id === id
  );

  if (index === -1) return false;

  posts.splice(index, 1);

  return true;
};

const toggleLike = (
  postId,
  userId
) => {
  const post = getPostById(postId);

  if (!post) return null;

  const idx =
    post.likes.indexOf(userId);

  if (idx > -1) {
    post.likes.splice(idx, 1);
  } else {
    post.likes.push(userId);
  }

  post.updatedAt =
    new Date().toISOString();

  return post;
};

module.exports = {
  getAllPosts,
  getPostById,
  createPost,
  deletePost,
  toggleLike
};