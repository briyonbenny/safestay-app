// JSON API: messaging between students and listing owners (session auth).
const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Listing = require("../models/Listing");
const { requireAuthApi, normaliseRole } = require("../middleware/auth");

const router = express.Router();

function msgToJson(m) {
  return {
    _id: String(m._id),
    listingId: m.listing ? String(m.listing._id || m.listing) : null,
    from: m.from
      ? typeof m.from === "object"
        ? { id: String(m.from._id), fullName: m.from.fullName, email: m.from.email }
        : { id: String(m.from) }
      : null,
    to: m.to
      ? typeof m.to === "object"
        ? { id: String(m.to._id), fullName: m.to.fullName, email: m.to.email }
        : { id: String(m.to) }
      : null,
    text: m.text,
    createdAt: m.createdAt,
  };
}

const oid = (s) => {
  if (!s || !mongoose.isValidObjectId(s)) return null;
  return new mongoose.Types.ObjectId(s);
};

// Inbox: latest message per (listing, other person) for the current user.
router.get("/threads", requireAuthApi, async (req, res) => {
  const me = String(req.session.user.id);
  try {
    const raw = await Message.find({ $or: [{ from: me }, { to: me }] })
      .populate("listing", "title owner")
      .populate("from", "fullName email")
      .populate("to", "fullName email")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const seen = new Set();
    const threads = [];
    for (const m of raw) {
      if (!m.listing || !m.from || !m.to) continue;
      const listId = String(m.listing._id);
      const fromId = String(m.from._id || m.from);
      const toId = String(m.to._id || m.to);
      const other = fromId === me ? toId : fromId;
      const key = `${listId}|${other}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const otherDoc = fromId === me ? m.to : m.from;
      const otherName = (otherDoc && (otherDoc.fullName || otherDoc.email)) || "User";
      const ownerId = String(m.listing.owner?._id || m.listing.owner);

      threads.push({
        listingId: listId,
        listingTitle: m.listing.title || "Listing",
        ownerId,
        peer: { id: other, name: otherName },
        lastMessage: { text: m.text, createdAt: m.createdAt },
        iAmOwner: me === ownerId,
      });
    }

    return res.json({ threads });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("threads error:", err.message);
    return res.status(500).json({ error: "Could not load message threads." });
  }
});

// Messages in one thread: listing + the other user (for student, omit peer = owner; for owner, pass peerUserId = student).
router.get("/", requireAuthApi, async (req, res) => {
  const me = String(req.session.user.id);
  const { listingId, peerUserId } = req.query;
  if (!listingId) {
    return res.status(400).json({ error: "listingId is required." });
  }

  try {
    const listing = await Listing.findById(listingId).select("owner");
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const ownerId = String(listing.owner);
    const myRole = normaliseRole(req.session.user.role);
    let peer = peerUserId;

    if (myRole === "owner") {
      if (me !== ownerId) {
        return res.status(403).json({ error: "You are not the owner of this listing." });
      }
      if (!peer) {
        return res.status(400).json({ error: "peerUserId (the student) is required when you are the owner." });
      }
    } else {
      if (me === ownerId) {
        return res.status(400).json({ error: "Owners should open the thread with peer set to the student id." });
      }
      peer = ownerId;
    }

    if (!oid(peer) || !oid(listingId)) {
      return res.status(400).json({ error: "Invalid id." });
    }
    if (!oid(me)) {
      return res.status(400).json({ error: "Invalid session." });
    }

    const meO = oid(me);
    const peerO = oid(peer);
    const listO = oid(listingId);

    const messages = await Message.find({
      listing: listO,
      $or: [
        { from: meO, to: peerO },
        { from: peerO, to: meO },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("from", "fullName email")
      .populate("to", "fullName email")
      .lean();

    return res.json({ messages: messages.map((m) => msgToJson(m)) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("get messages error:", err.message);
    return res.status(500).json({ error: "Could not load messages." });
  }
});

router.post("/", requireAuthApi, async (req, res) => {
  const me = req.session.user.id;
  const { listingId, text, toUserId } = req.body || {};
  const body = String(text || "").trim();
  if (!body) {
    return res.status(400).json({ error: "Message text is required." });
  }
  if (body.length > 5000) {
    return res.status(400).json({ error: "Message is too long." });
  }
  if (!listingId) {
    return res.status(400).json({ error: "listingId is required." });
  }

  try {
    const listing = await Listing.findById(listingId).select("owner");
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }
    const ownerId = String(listing.owner);
    const myId = String(me);

    let to;

    if (myId === ownerId) {
      if (!toUserId) {
        return res.status(400).json({ error: "toUserId (student you are replying to) is required for owners." });
      }
      if (String(toUserId) === myId) {
        return res.status(400).json({ error: "Invalid recipient." });
      }
      to = toUserId;
    } else {
      to = ownerId;
    }

    if (String(to) === myId) {
      return res.status(400).json({ error: "You cannot message yourself." });
    }

    const m = await Message.create({
      listing: listingId,
      from: me,
      to,
      text: body,
    });
    const populated = await Message.findById(m._id)
      .populate("from", "fullName email")
      .populate("to", "fullName email")
      .lean();

    return res.status(201).json({ ok: true, message: msgToJson(populated) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("post message error:", err.message);
    return res.status(500).json({ error: "Could not send message." });
  }
});

module.exports = router;
