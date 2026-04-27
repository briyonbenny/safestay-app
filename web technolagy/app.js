// Main server setup for SafeStay Assignment 2 (Node + Express).
require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const mongoose = require("mongoose");

const connectDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const apiAuthRoutes = require("./routes/apiAuthRoutes");
const apiListingRoutes = require("./routes/apiListingRoutes");
const { attachCurrentUser } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Render sits behind a reverse proxy; needed for correct secure cookies and IPs.
app.set("trust proxy", 1);

// Render/production: set MONGODB_URI in the dashboard; .env is not deployed.
const mongoUri = (process.env.MONGODB_URI || "").trim().replace(/^['"]|['"]$/g, "");
if (!mongoUri) {
  // eslint-disable-next-line no-console
  console.error(
    "FATAL: MONGODB_URI is not set. In Render: open this Web Service → Environment → add MONGODB_URI (your Atlas connection string) → Save."
  );
  process.exit(1);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Configure view engine for server-rendered pages.
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

function registerRoutes() {
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

  app.get("/health", (req, res) => {
    res.status(200).json({ ok: true, app: "SafeStay API" });
  });

  app.get("/", (req, res) => {
    res.redirect("/listings");
  });

  app.use("/auth", authRoutes);
  app.use("/listings", listingRoutes);

  app.get("/api", (req, res) => {
    res.status(200).json({
      name: "SafeStay API",
      hint: "Try GET /api/listings for JSON listings.",
      routes: ["/api/auth", "/api/listings", "/health"],
    });
  });
  app.use("/api/auth", apiAuthRoutes);
  app.use("/api/listings", apiListingRoutes);

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
}

async function start() {
  // One Mongo connection: sessions use the same client as Mongoose (fewer TLS issues on Render).
  await connectDatabase();

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    dbName: mongoose.connection.db.databaseName,
    collectionName: "sessions",
    ttl: 60 * 60 * 24, // 1 day in seconds
  });

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
      store: sessionStore,
    })
  );

  registerRoutes();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SafeStay server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
