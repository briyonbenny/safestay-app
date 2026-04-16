// Listing routes implement Create/Read/Update/Delete with authorization.
const express = require("express");
const Listing = require("../models/Listing");
const User = require("../models/User");
const { requireAuth, requireRole, normaliseRole } = require("../middleware/auth");
const { validateListing } = require("../middleware/validation");

const router = express.Router();

// Works when owner is populated ({ _id, ... }) or a raw ObjectId.
function listingOwnerId(listing) {
  if (!listing || !listing.owner) return null;
  return listing.owner._id != null ? listing.owner._id : listing.owner;
}

// View only favourite listings for logged-in users.
router.get("/user/favourites", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.user.id).populate("favourites");
  res.render("listings/favourites", { listings: user.favourites });
});

// Read all listings with optional search filters.
router.get("/", async (req, res) => {
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
  res.render("listings/index", { listings, filters: req.query });
});

// New listing form (property owners only; aligns with API RBAC).
router.get("/new", requireAuth, requireRole("owner"), (req, res) => {
  res.render("listings/new", { errors: [], old: {} });
});

// Create listing (property owners only).
router.post("/", requireAuth, requireRole("owner"), async (req, res) => {
  const live = await User.findById(req.session.user.id).select("role").lean();
  if (!live || normaliseRole(live.role) !== "owner") {
    req.session.flashError = "Only property owners can create listings.";
    return res.redirect("/listings");
  }

  const errors = validateListing(req.body);
  if (errors.length > 0) {
    return res.status(400).render("listings/new", { errors, old: req.body });
  }

  if (!req.session.user || !req.session.user.id) {
    req.session.flashError = "Your session expired. Please log in again.";
    return res.redirect("/auth/login");
  }

  try {
    await Listing.create({
      title: req.body.title.trim(),
      location: req.body.location.trim(),
      price: Number(req.body.price),
      propertyType: req.body.propertyType.trim(),
      description: req.body.description.trim(),
      isVerified: req.body.isVerified === "on",
      owner: req.session.user.id,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Create listing failed:", err.message);
    return res.status(500).render("listings/new", {
      errors: ["Could not save listing. Please try again. If this continues, log out and log in again."],
      old: req.body,
    });
  }

  return res.redirect("/listings");
});

// Read one listing.
router.get("/:id", async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("owner", "fullName email");
  if (!listing) {
    return res.status(404).render("partials/message", {
      title: "Listing Not Found",
      message: "This listing does not exist.",
    });
  }

  let isFavourite = false;
  if (req.session.user) {
    const currentUser = await User.findById(req.session.user.id);
    isFavourite = currentUser.favourites.some((fav) => String(fav) === String(listing._id));
  }

  return res.render("listings/show", { listing, isFavourite });
});

// Edit listing form.
router.get("/:id/edit", requireAuth, requireRole("owner"), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return res.status(404).render("partials/message", {
      title: "Listing Not Found",
      message: "This listing does not exist.",
    });
  }
  if (String(listingOwnerId(listing)) !== String(req.session.user.id)) {
    return res.status(403).render("partials/message", {
      title: "Forbidden",
      message: "You can edit only your own listings.",
    });
  }

  return res.render("listings/edit", { listing, errors: [] });
});

// Update listing.
router.put("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return res.status(404).render("partials/message", {
      title: "Listing Not Found",
      message: "This listing does not exist.",
    });
  }
  if (String(listingOwnerId(listing)) !== String(req.session.user.id)) {
    return res.status(403).render("partials/message", {
      title: "Forbidden",
      message: "You can update only your own listings.",
    });
  }

  const errors = validateListing(req.body);
  if (errors.length > 0) {
    listing.title = req.body.title;
    listing.location = req.body.location;
    listing.price = req.body.price;
    listing.propertyType = req.body.propertyType;
    listing.description = req.body.description;
    listing.isVerified = req.body.isVerified === "on";
    return res.status(400).render("listings/edit", { listing, errors });
  }

  listing.title = req.body.title.trim();
  listing.location = req.body.location.trim();
  listing.price = Number(req.body.price);
  listing.propertyType = req.body.propertyType.trim();
  listing.description = req.body.description.trim();
  listing.isVerified = req.body.isVerified === "on";

  await listing.save();
  return res.redirect(`/listings/${listing._id}`);
});

// Delete listing.
router.delete("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return res.status(404).render("partials/message", {
      title: "Listing Not Found",
      message: "This listing does not exist.",
    });
  }
  if (String(listingOwnerId(listing)) !== String(req.session.user.id)) {
    return res.status(403).render("partials/message", {
      title: "Forbidden",
      message: "You can delete only your own listings.",
    });
  }

  await Listing.findByIdAndDelete(req.params.id);
  return res.redirect("/listings");
});

// Toggle favourite listing for logged-in users.
router.post("/:id/favourite", requireAuth, async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return res.status(404).render("partials/message", {
      title: "Listing Not Found",
      message: "This listing does not exist.",
    });
  }

  const user = await User.findById(req.session.user.id);
  const alreadySaved = user.favourites.some((fav) => String(fav) === String(listing._id));

  if (alreadySaved) {
    user.favourites = user.favourites.filter((fav) => String(fav) !== String(listing._id));
  } else {
    user.favourites.push(listing._id);
  }

  await user.save();
  return res.redirect(`/listings/${listing._id}`);
});

module.exports = router;
