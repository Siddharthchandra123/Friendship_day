const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const controller = require(
  "../controllers/auth.controller"
);

// Public
router.post(
  "/register",
  controller.register
);

router.post(
  "/login",
  controller.login
);

router.post(
  "/google",
  controller.googleLogin
);

// Protected
router.get(
  "/me",
  auth,
  controller.me
);

router.put(
  "/profile",
  auth,
  controller.updateProfile
);

router.post(
  "/logout",
  auth,
  controller.logout
);



module.exports = router;