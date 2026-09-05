const jwt = require('jsonwebtoken');
const User = require('../models/User');

let jwksClient = null;
function getJwksClient() {
  if (!jwksClient) {
    // eslint-disable-next-line global-require
    const jwksRsa = require('jwks-rsa');
    const rawIssuer = process.env.CLERK_ISSUER || 'https://natural-javelin-9813.clerk.accounts.dev';
    const clerkIssuer = rawIssuer.replace(/\/$/, '');
    jwksClient = jwksRsa({
      jwksUri: `${clerkIssuer}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }
  return jwksClient;
}

async function verifyClerkToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) return null;

  const rawIssuer = process.env.CLERK_ISSUER || 'https://natural-javelin-9813.clerk.accounts.dev';
  const clerkIssuer = rawIssuer.replace(/\/$/, '');

  const client = getJwksClient();
  const key = await new Promise((resolve, reject) => {
    client.getSigningKey(decoded.header.kid, (err, signingKey) => {
      if (err) reject(err);
      else resolve(signingKey.getPublicKey());
    });
  });

  const payload = await new Promise((resolve, reject) => {
    jwt.verify(
      token,
      key,
      { issuer: [clerkIssuer, `${clerkIssuer}/`], algorithms: ['RS256'] },
      (err, p) => {
        if (err) reject(err);
        else resolve(p);
      }
    );
  });

  if (!payload || !payload.sub) return null;

  const clerkId = payload.sub;
  const fallbackEmail = `${clerkId.toLowerCase()}@clerk.local`;
  const email = (payload.email || '').toLowerCase().trim();

  const orConditions = [
    { clerkId },
    { email: fallbackEmail },
  ];
  if (email) orConditions.push({ email });

  let user = await User.findOne({ $or: orConditions });
  if (!user) {
    user = await User.create({
      clerkId,
      name: payload.name || payload.email || 'User',
      email: email || fallbackEmail,
    });
  } else if (user.clerkId !== clerkId) {
    user.clerkId = clerkId;
    await user.save();
  }

  return user._id;
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

