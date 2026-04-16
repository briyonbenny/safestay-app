// Authentication routes: signup, login, logout.
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { validateSignup, validateLogin } = require("../middleware/validation");

const router = express.Router();

router.get("/signup", (req, res) => {
  res.render("auth/signup", { errors: [], old: {} });
});

router.post("/signup", async (req, res) => {
  const errors = validateSignup(req.body);
  const old = { ...req.body, password: "" };

  if (errors.length > 0) {
    return res.status(400).render("auth/signup", { errors, old });
  }

  const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
  if (existingUser) {
    return res.status(400).render("auth/signup", {
      errors: ["An account with this email already exists."],
      old,
    });
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);

  const user = await User.create({
    fullName: req.body.fullName.trim(),
    email: req.body.email.toLowerCase().trim(),
    passwordHash,
    role: req.body.role,
  });

  req.session.user = {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };

  // Cookie example required by assignment.
  res.cookie("lastLoginEmail", user.email, {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    httpOnly: false,
    sameSite: "lax",
  });

  return res.redirect("/listings");
});

router.get("/login", (req, res) => {
  const rememberedEmail = req.cookies.lastLoginEmail || "";
  res.render("auth/login", { errors: [], old: { email: rememberedEmail } });
});

router.post("/login", async (req, res) => {
  const errors = validateLogin(req.body);
  const old = { email: req.body.email || "" };

  if (errors.length > 0) {
    return res.status(400).render("auth/login", { errors, old });
  }

  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user) {
    return res.status(401).render("auth/login", {
      errors: ["Invalid email or password."],
      old,
    });
  }

  const passwordMatches = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).render("auth/login", {
      errors: ["Invalid email or password."],
      old,
    });
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

  return res.redirect("/listings");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

module.exports = router;
