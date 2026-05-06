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

module.exports = { upload, uploadPathsFromFiles };
