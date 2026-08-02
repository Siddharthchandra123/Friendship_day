const {
  ok,
  created,
  fail
} = require("../utils/response");

const postsService = require(
  "../services/posts.service"
);

exports.getPosts = (req, res) => {
  return ok(res, {
    posts:
      postsService.getAllPosts()
  });
};

exports.createPost = (
  req,
  res
) => {
  const {
    content,
    media
  } = req.body;

  if (
    !content?.trim() &&
    !media
  ) {
    return fail(
      res,
      400,
      "Post cannot be empty."
    );
  }

  const post =
    postsService.createPost({
      user: req.user,
      content,
      media
    });

  return created(res, {
    post
  });
};

exports.deletePost = (
  req,
  res
) => {
  const post =
    postsService.getPostById(
      req.params.id
    );

  if (!post) {
    return fail(
      res,
      404,
      "Post not found."
    );
  }

  if (
    post.user_id !== req.user.id
  ) {
    return fail(
      res,
      403,
      "Forbidden."
    );
  }

  postsService.deletePost(
    req.params.id
  );

  return ok(
    res,
    {},
    "Post deleted."
  );
};

exports.toggleLike = (
  req,
  res
) => {
  const post =
    postsService.toggleLike(
      req.params.id,
      req.user.id
    );

  if (!post) {
    return fail(
      res,
      404,
      "Post not found."
    );
  }

  return ok(res, {
    post
  });
};