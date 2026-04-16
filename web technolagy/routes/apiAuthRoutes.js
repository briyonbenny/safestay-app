// JSON API routes for authentication (session cookie, not JWT).
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuthApi } = require("../middleware/auth");
const { validateSignup, validateLogin } = require("../middleware/validation");

const router = express.Router();

function publicUser(userDoc) {
  return {
    id: String(userDoc._id),
    fullName: userDoc.fullName,
    email: userDoc.email,
    role: userDoc.role,
  };
}

router.post("/signup", async (req, res) => {
  const errors = validateSignup(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const existingUser = await User.findOne({ email: String(req.body.email).toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      fullName: String(req.body.fullName).trim(),
      email: String(req.body.email).toLowerCase().trim(),
      passwordHash,
      role: req.body.role,
    });

    req.session.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };

    res.cookie("lastLoginEmail", user.email, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: "lax",
    });

    return res.status(201).json({ ok: true, user: publicUser(user) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API signup error:", err.message);
    return res.status(500).json({ error: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  const errors = validateLogin(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const user = await User.findOne({ email: String(req.body.email).toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };

    res.cookie("lastLoginEmail", user.email, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: "lax",
    });

    return res.status(200).json({ ok: true, user: publicUser(user) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API login error:", err.message);
    return res.status(500).json({ error: "Could not log in." });
  }
});

router.post("/logout", requireAuthApi, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out." });
    }
    return res.status(200).json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  return res.status(200).json({
    user: {
      id: String(req.session.user.id),
      fullName: req.session.user.fullName,
      email: req.session.user.email,
      role: req.session.user.role,
    },
  });
});

module.exports = router;
