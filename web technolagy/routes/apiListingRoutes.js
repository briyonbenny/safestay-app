// JSON API routes for listings (session cookie for auth; RBAC for create).
const express = require("express");
const Listing = require("../models/Listing");
const User = require("../models/User");
const { requireAuthApi, requireRoleApi, normaliseRole } = require("../middleware/auth");
const { validateListing } = require("../middleware/validation");
const { upload, uploadPathsFromFiles, saveDataUrlListingImages } = require("../config/listingUpload");

const router = express.Router();

function listingOwnerId(listing) {
  if (!listing || !listing.owner) return null;
  return listing.owner._id != null ? listing.owner._id : listing.owner;
}

function listingToJson(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    title: o.title,
    location: o.location,
    price: o.price,
    propertyType: o.propertyType,
    description: o.description,
    isVerified: Boolean(o.isVerified),
    images: Array.isArray(o.images) ? o.images : [],
    owner: o.owner
      ? typeof o.owner === "object"
        ? { id: String(o.owner._id || o.owner), fullName: o.owner.fullName, email: o.owner.email }
        : { id: String(o.owner) }
      : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// Normalise JSON bodies (checkboxes send booleans, forms send "on").
function normaliseListingPayload(body) {
  const v = body && typeof body === "object" ? body : {};
  return {
    title: v.title,
    location: v.location,
    price: v.price,
    propertyType: v.propertyType,
    description: v.description,
    isVerified: v.isVerified === true || v.isVerified === "on" || v.isVerified === "true",
  };
}

router.get("/user/favourites", requireAuthApi, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).populate("favourites");
    const listings = (user.favourites || []).map((doc) => listingToJson(doc));
    return res.status(200).json({ listings });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API favourites error:", err.message);
    return res.status(500).json({ error: "Could not load favourites." });
  }
});

router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.location) {
      query.location = new RegExp(req.query.location, "i");
    }
    if (req.query.propertyType) {
      query.propertyType = new RegExp(req.query.propertyType, "i");
    }
    if (req.query.maxPrice) {
      query.price = { $lte: Number(req.query.maxPrice) || Number.MAX_SAFE_INTEGER };
    }

    const listings = await Listing.find(query).populate("owner", "fullName email").sort({ createdAt: -1 });
    return res.status(200).json({ listings: listings.map((d) => listingToJson(d)) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API list listings error:", err.message);
    return res.status(500).json({ error: "Could not load listings." });
  }
});

// Logged-in owner: only listings you created.
router.get("/mine", requireAuthApi, requireRoleApi("owner"), async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.session.user.id })
      .populate("owner", "fullName email")
      .sort({ createdAt: -1 });
    return res.status(200).json({ listings: listings.map((d) => listingToJson(d)) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API my listings error:", err.message);
    return res.status(500).json({ error: "Could not load your listings." });
  }
});

// Only property owners may create listings.
// Prefer JSON + optional imagesDataUrls (same session behaviour as login; works through Vite proxy).
// Multipart (field "images") remains for tools like Bruno.
function maybeMultipartListingImages(req, res, next) {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) {
    return upload.array("images", 8)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Image upload failed." });
      }
      return next();
    });
  }
  return next();
}

router.post(
  "/",
  requireAuthApi,
  requireRoleApi("owner"),
  maybeMultipartListingImages,
  async (req, res) => {
    const live = await User.findById(req.session.user.id).select("role").lean();
    if (!live || normaliseRole(live.role) !== "owner") {
      return res.status(403).json({ error: "Only property owners can create listings." });
    }

    const payload = normaliseListingPayload(req.body);
    const errors = validateListing(payload);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    let imagePaths = uploadPathsFromFiles(req);
    if (
      imagePaths.length === 0 &&
      req.body &&
      Array.isArray(req.body.imagesDataUrls) &&
      req.body.imagesDataUrls.length > 0
    ) {
      imagePaths = saveDataUrlListingImages(req.body.imagesDataUrls);
    }

    try {
      const listing = await Listing.create({
        title: String(payload.title).trim(),
        location: String(payload.location).trim(),
        price: Number(payload.price),
        propertyType: String(payload.propertyType).trim(),
        description: String(payload.description).trim(),
        isVerified: Boolean(payload.isVerified),
        owner: req.session.user.id,
        images: imagePaths,
      });
      const populated = await Listing.findById(listing._id).populate("owner", "fullName email");
      return res.status(201).json({ ok: true, listing: listingToJson(populated) });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("API create listing error:", err.message);
      return res.status(500).json({ error: "Could not create listing." });
    }
  }
);

router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "fullName email");
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }
    return res.status(200).json({ listing: listingToJson(listing) });
  } catch (err) {
    return res.status(400).json({ error: "Invalid listing id." });
  }
});

router.put("/:id", requireAuthApi, requireRoleApi("owner"), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }
    if (String(listingOwnerId(listing)) !== String(req.session.user.id)) {
      return res.status(403).json({ error: "You can update only your own listings." });
    }

    const payload = normaliseListingPayload(req.body);
    const errors = validateListing(payload);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    listing.title = String(payload.title).trim();
    listing.location = String(payload.location).trim();
    listing.price = Number(payload.price);
    listing.propertyType = String(payload.propertyType).trim();
    listing.description = String(payload.description).trim();
    listing.isVerified = Boolean(payload.isVerified);
    await listing.save();

    const populated = await Listing.findById(listing._id).populate("owner", "fullName email");
    return res.status(200).json({ ok: true, listing: listingToJson(populated) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API update listing error:", err.message);
    return res.status(500).json({ error: "Could not update listing." });
  }
});

router.delete("/:id", requireAuthApi, requireRoleApi("owner"), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }
    if (String(listingOwnerId(listing)) !== String(req.session.user.id)) {
      return res.status(403).json({ error: "You can delete only your own listings." });
    }
    await Listing.findByIdAndDelete(req.params.id);
    return res.status(200).json({ ok: true, deletedId: String(req.params.id) });
  } catch (err) {
    return res.status(400).json({ error: "Invalid listing id." });
  }
});

router.post("/:id/favourite", requireAuthApi, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const user = await User.findById(req.session.user.id);
    const alreadySaved = user.favourites.some((fav) => String(fav) === String(listing._id));
    if (alreadySaved) {
      user.favourites = user.favourites.filter((fav) => String(fav) !== String(listing._id));
    } else {
      user.favourites.push(listing._id);
    }
    await user.save();

    return res.status(200).json({
      ok: true,
      favourited: !alreadySaved,
      listingId: String(listing._id),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API favourite error:", err.message);
    return res.status(500).json({ error: "Could not update favourites." });
  }
});

module.exports = router;
