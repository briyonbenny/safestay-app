// Main server setup for SafeStay Assignment 2 (Node + Express).
require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const connectDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const apiAuthRoutes = require("./routes/apiAuthRoutes");
const apiListingRoutes = require("./routes/apiListingRoutes");
const { attachCurrentUser } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB at server start.
connectDatabase();

// Parse incoming form and JSON payloads.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Configure view engine for server-rendered pages.
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Configure sessions and persist them in MongoDB.
app.use(
  session({
    name: "safestay.sid",
    secret: process.env.SESSION_SECRET || "unsafe-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24, // 1 day in seconds
    }),
  })
);

// Make authenticated user/session data available to all templates.
app.use(attachCurrentUser);

// Avoid stale HTML in the browser during development (EJS updates not visible otherwise).
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if ((req.originalUrl || "").split("?")[0].startsWith("/api")) return next();
  if (req.path === "/health") return next();
  const ext = path.extname(req.path).toLowerCase();
  if ([".css", ".js", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".map"].includes(ext)) {
    return next();
  }
  res.set("Cache-Control", "no-store, private, must-revalidate");
  next();
});

// Health endpoint helps with Render deployment checks.
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, app: "SafeStay API" });
});

app.get("/", (req, res) => {
  res.redirect("/listings");
});

// App routes.
app.use("/auth", authRoutes);
app.use("/listings", listingRoutes);

// JSON API routes (session cookies; no JWT). Used for Bruno / Postman tests.
app.get("/api", (req, res) => {
  res.status(200).json({
    name: "SafeStay API",
    hint: "Try GET /api/listings for JSON listings.",
    routes: ["/api/auth", "/api/listings", "/health"],
  });
});
app.use("/api/auth", apiAuthRoutes);
app.use("/api/listings", apiListingRoutes);

// Basic fallback for unknown pages.
app.use((req, res) => {
  const pathOnly = (req.originalUrl || req.url || "").split("?")[0];
  if (pathOnly.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found." });
  }
  return res.status(404).render("partials/message", {
    title: "Not Found",
    message: "The page you requested does not exist.",
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SafeStay server running on http://localhost:${PORT}`);
});
