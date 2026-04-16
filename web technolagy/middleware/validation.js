// Server-side validation for forms and request payloads.
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignup(body) {
  const errors = [];

  if (!body.fullName || body.fullName.trim().length < 2) {
    errors.push("Full name must be at least 2 characters.");
  }
  if (!body.email || !isValidEmail(body.email)) {
    errors.push("Please provide a valid email address.");
  }
  if (!body.password || body.password.length < 6) {
    errors.push("Password must be at least 6 characters.");
  }
  if (!["student", "owner"].includes(body.role)) {
    errors.push("Role must be either student or owner.");
  }

  return errors;
}

function validateLogin(body) {
  const errors = [];
  if (!body.email || !isValidEmail(body.email)) {
    errors.push("Please provide a valid email address.");
  }
  if (!body.password || body.password.length < 6) {
    errors.push("Password must be at least 6 characters.");
  }
  return errors;
}

function validateListing(body) {
  const errors = [];

  if (!body.title || body.title.trim().length < 3) {
    errors.push("Title must be at least 3 characters.");
  }
  if (!body.location || body.location.trim().length < 2) {
    errors.push("Location is required.");
  }
  if (!body.propertyType || body.propertyType.trim().length < 2) {
    errors.push("Property type is required.");
  }

  const numericPrice = Number(body.price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    errors.push("Price must be a valid number greater than 0.");
  }

  if (!body.description || body.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters.");
  }

  return errors;
}

module.exports = {
  validateSignup,
  validateLogin,
  validateListing,
};
