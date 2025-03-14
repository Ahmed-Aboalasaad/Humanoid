const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../controllers/authController");

router.post("/signup", userController.signUp);
router.post("/login", userController.login);
router.get("/logout", userController.logout);

router.get("/profile", authMiddleware.verifyToken, userController.getProfile);
router.put(
  "/profile",
  authMiddleware.verifyToken,
  userController.updateProfile
);

module.exports = router;
