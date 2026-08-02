const authService = require("../services/auth.service");

const { ok, created, fail } = require("../utils/response");

const { authCookie } = require("../utils/cookies");

/**
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);

    res.cookie("token", result.token, authCookie);

    return created(
      res,
      {
        user: result.user,
      },
      "Registration successful."
    );
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    res.cookie("token", result.token, authCookie);

    return ok(
      res,
      {
        user: result.user,
      },
      "Login successful."
    );
  } catch (err) {
    return fail(res, 401, err.message);
  }
};

/**
 * POST /api/auth/google
 */
exports.googleLogin = async (req, res) => {
  try {
    const result = await authService.googleLogin(req.body);

    res.cookie("token", result.token, authCookie);

    return ok(
      res,
      {
        user: result.user,
      },
      "Google login successful."
    );
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

/**
 * GET /api/auth/me
 */
exports.me = async (req, res) => {
  try {
    const user =
      authService.getCurrentUser(req.user.id);

    return ok(res, {
      user,
    });
  } catch (err) {
    return fail(res, 404, err.message);
  }
};

/**
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const user =
      await authService.updateProfile(
        req.user.id,
        req.body
      );

    return ok(
      res,
      {
        user,
      },
      "Profile updated."
    );
  } catch (err) {
    return fail(res, 400, err.message);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite:
      process.env.NODE_ENV ===
      "production"
        ? "none"
        : "lax",
  });

  return ok(
    res,
    {},
    "Logged out."
  );
};