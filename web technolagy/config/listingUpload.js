// Multer: store listing photos under public/uploads/listings (served as static files).
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "public", "uploads", "listings");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext.toLowerCase()}`;
    cb(null, safe);
  },
});

function fileFilter(req, file, cb) {
  if (/^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed."));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
});

function uploadPathsFromFiles(req) {
  return (req.files || []).map((f) => `/uploads/listings/${f.filename}`);
}

const DATA_URL_RE = /^data:image\/(jpeg|jpg|pjpeg|png|gif|webp);base64,([\s\S]+)$/i;

/**
 * Persist up to 8 images sent as data URLs in JSON (avoids multipart + dev proxy losing session cookies).
 */
function saveDataUrlListingImages(dataUrls) {
  if (!Array.isArray(dataUrls) || !dataUrls.length) return [];
  const out = [];
  for (let i = 0; i < Math.min(dataUrls.length, 8); i++) {
    const s = String(dataUrls[i] || "").trim();
    const m = DATA_URL_RE.exec(s);
    if (!m) continue;
    let buf;
    try {
      buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    } catch {
      continue;
    }
    if (!buf.length || buf.length > 5 * 1024 * 1024) continue;
    const extRaw = m[1].toLowerCase();
    const ext = extRaw === "jpeg" || extRaw === "pjpeg" ? "jpg" : extRaw;
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const dest = path.join(uploadDir, name);
    try {
      fs.writeFileSync(dest, buf);
      out.push(`/uploads/listings/${name}`);
    } catch {
      /* disk */
    }
  }
  return out;
}

module.exports = { upload, uploadPathsFromFiles, saveDataUrlListingImages };
