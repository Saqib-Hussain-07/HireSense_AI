const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/clerk-session
// Primary auth endpoint: verifies Clerk session token against Clerk's public JWKS,
// ensures the User exists in MongoDB (keyed by clerkId), and returns session credentials.
router.post('/clerk-session', async (req, res) => {
  try {
    const { sessionToken, email: reqEmail, name: reqName } = req.body;
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });

    const rawIssuer = process.env.CLERK_ISSUER || 'https://natural-javelin-9813.clerk.accounts.dev';
    const clerkIssuer = rawIssuer.replace(/\/$/, '');

    // eslint-disable-next-line global-require
    const jwksRsa = require('jwks-rsa');
    const client = jwksRsa({ jwksUri: `${clerkIssuer}/.well-known/jwks.json`, cache: true, rateLimit: true });

    const getKey = (header, callback) => {
      client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key.getPublicKey());
      });
    };

    const payload = await new Promise((resolve, reject) => {
      jwt.verify(
        sessionToken,
        getKey,
        {
          issuer: [clerkIssuer, `${clerkIssuer}/`],
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    const clerkId = payload.sub;
    const email = (reqEmail || payload.email || '').toLowerCase().trim();
    const fallbackEmail = `${clerkId.toLowerCase()}@clerk.local`;
    const name = reqName || payload.name || payload.email || (email ? email.split('@')[0] : 'User');

    // Upsert — match by clerkId, fallback email, or real email
    const orConditions = [
      { clerkId },
      { email: fallbackEmail },
    ];
    if (email) orConditions.push({ email });

    let user = await User.findOne({ $or: orConditions });
    if (!user) {
      user = await User.create({
        clerkId,
        name,
        email: email || fallbackEmail,
      });
    } else {
      let changed = false;
      if (user.clerkId !== clerkId) {
        user.clerkId = clerkId;
        changed = true;
      }
      if (email && user.email && user.email.endsWith('@clerk.local')) {
        user.email = email;
        changed = true;
      }
      if (name && name !== 'User' && (!user.name || user.name === 'User')) {
        user.name = name;
        changed = true;
      }
      if (changed) await user.save();
    }

    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('[auth/clerk-session] failed:', err.message);
    res.status(401).json({ error: 'Clerk session verification failed', detail: err.message });
  }
});

function sanitize(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
}

module.exports = router;

