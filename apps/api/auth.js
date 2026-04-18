// ZeroLeak SOC - JWT Authentication
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

function generateToken(user) {
  return jwt.sign(user, SECRET, { expiresIn: "1h" });
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = { generateToken, authMiddleware };
