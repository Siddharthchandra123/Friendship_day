const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "friendverse_super_secret_fallback_key";

module.exports = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session."
    });
  }
};