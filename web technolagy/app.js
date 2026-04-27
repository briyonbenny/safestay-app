// Main server setup for SafeStay Assignment 2 (Node + Express).
require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const cors = require("cors");

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

// First route: no body parsing, no static, no session — keeps Render / load-balancer checks fast.
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, app: "SafeStay API" });
});

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

  app.get("/", (req, res) => {
    res.redirect("/listings");
  });

  app.use("/auth", authRoutes);
  app.use("/listings", listingRoutes);

  app.get("/api", (req, res) => {
    res.status(200).json({
      name: "SafeStay API",
      hint: "Try GET /api/listings for JSON listings.",
      routes: ["/api/auth", "/api/listings (GET /mine for owners)", "/health"],
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

function createSessionStore() {
  const ttl = 60 * 60 * 24; // 1 day in seconds
  const base = { collectionName: "sessions", ttl };
  const client =
    typeof mongoose.connection.getClient === "function" ? mongoose.connection.getClient() : null;
  const dbName = mongoose.connection.db && mongoose.connection.db.databaseName;
  if (client && dbName) {
    return MongoStore.create({ ...base, client, dbName });
  }
  // getClient() can be missing in some driver/Mongoose combos — connect-mongo needs a real mongoUrl
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to create the session store.");
  }
  // eslint-disable-next-line no-console
  console.warn("session store: using mongoUrl (Mongoose client not exposed); extra DB connection to Atlas");
  return MongoStore.create({ ...base, mongoUrl: mongoUri });
}

async function start() {
  await connectDatabase();

  const clientOrigin = (process.env.CLIENT_ORIGIN || "").trim();
  const crossSiteClient = Boolean(clientOrigin);
  app.use(
    cors({
      origin: clientOrigin || true,
      credentials: true,
    })
  );

  const sessionStore = createSessionStore();

  app.use(
    session({
      name: "safestay.sid",
      secret: process.env.SESSION_SECRET || "unsafe-dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // Separate React static site on another origin needs SameSite=None + Secure
        sameSite: crossSiteClient ? "none" : "lax",
        secure: crossSiteClient || process.env.NODE_ENV === "production",
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
  console.error("Failed to start server:", err && err.stack ? err.stack : err);
  process.exit(1);
});
