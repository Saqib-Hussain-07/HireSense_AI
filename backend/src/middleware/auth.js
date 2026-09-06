const jwt = require('jsonwebtoken');
const { verifyAndUpsertClerkUser } = require('../services/clerkAuth');

async function verifyClerkToken(token) {
  try {
    const user = await verifyAndUpsertClerkUser(token);
    return user ? user._id : null;
  } catch (_e) {
    return null;
  }
}

async function resolveUserFromToken(token) {
  if (!token) return null;

  // 1. Primary path: Verify Clerk token against Clerk JWKS
  try {
    const clerkUserId = await verifyClerkToken(token);
    if (clerkUserId) return clerkUserId;
  } catch (_e) {
    // Ignore and fall through
  }

  // 2. Test/mock fallback: local JWT signed with JWT_SECRET for Jest runner isolation
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload?.userId) return payload.userId;
  } catch (_e) {
    // Invalid
  }

  return null;
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const userId = await resolveUserFromToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = userId;
  next();
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { requireAuth, resolveUserFromToken, signToken, verifyClerkToken };

