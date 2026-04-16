// Authentication and authorization middleware helpers.

const User = require("../models/User");

function normaliseRole(role) {
  if (role === undefined || role === null) return "";
  return String(role).trim().toLowerCase();
}

/**
 * Loads the user from MongoDB on each request so role/name match the database.
 * Fixes stale sessions (e.g. cookie still logged in as owner after signing up as student on another tab)
 * and keeps nav RBAC accurate.
 */
async function attachCurrentUser(req, res, next) {
  res.locals.flashError = req.session.flashError || "";
  req.session.flashError = "";

  const u = req.session.user;
  if (!u || !u.id) {
    res.locals.currentUser = null;
    return next();
  }

  try {
    const dbUser = await User.findById(u.id).select("fullName email role").lean();
    if (!dbUser) {
      req.session.user = null;
      res.locals.currentUser = null;
      return next();
    }

    const roleNorm = normaliseRole(dbUser.role);
    req.session.user = {
      id: dbUser._id,
      fullName: dbUser.fullName,
      email: dbUser.email,
      role: dbUser.role,
    };

    res.locals.currentUser = {
      id: String(dbUser._id),
      fullName: dbUser.fullName,
      email: dbUser.email,
      role: roleNorm || dbUser.role,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flashError = "Please log in to continue.";
    return res.redirect("/auth/login");
  }
  return next();
}

// Same as requireAuth but returns JSON (for /api routes, Bruno, Postman).
function requireAuthApi(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  return next();
}

// HTML routes: only allow users with one of the given roles (e.g. property owner).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      req.session.flashError = "Please log in to continue.";
      return res.redirect("/auth/login");
    }
    const userRole = normaliseRole(req.session.user.role);
    const allowed = allowedRoles.map((r) => normaliseRole(r));
    if (!allowed.includes(userRole)) {
      req.session.flashError = "You do not have permission for this action.";
      return res.redirect("/listings");
    }
    return next();
  };
}

// JSON API: require one of the allowed roles (session-based, not JWT).
function requireRoleApi(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const userRole = normaliseRole(req.session.user.role);
    const allowed = allowedRoles.map((r) => normaliseRole(r));
    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        error: "Insufficient role for this action.",
        requiredRoles: allowedRoles,
        yourRole: req.session.user.role,
      });
    }
    return next();
  };
}

module.exports = {
  normaliseRole,
  attachCurrentUser,
  requireAuth,
  requireAuthApi,
  requireRole,
  requireRoleApi,
};
