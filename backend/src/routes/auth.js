const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
// jwks-rsa is lazy-required inside the /clerk-session handler to keep Jest happy
// (some versions of this package use ESM internally which breaks Jest's CJS resolver)
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/clerk-session
// Called by the frontend after Clerk signs in. Accepts a Clerk session JWT,
// verifies it against Clerk's JWKS, upserts a local User, and returns our own
// local JWT so the rest of the API (and the WS gateway) work normally.
router.post('/clerk-session', async (req, res) => {
  try {
    const { sessionToken } = req.body;
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });

    const clerkIssuer = process.env.CLERK_ISSUER; // e.g. https://decisive-ram-45.clerk.accounts.dev
    if (!clerkIssuer) return res.status(500).json({ error: 'CLERK_ISSUER not configured' });

    // Verify the Clerk JWT against Clerk's public JWKS
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
      jwt.verify(sessionToken, getKey, { issuer: clerkIssuer, algorithms: ['RS256'] }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    const clerkId = payload.sub;
    const email = (payload.email || '').toLowerCase();
    const name = payload.name || payload.email || 'User';

    // Upsert — find by clerkId first, then fall back to email for existing accounts
    let user = await User.findOne({ clerkId });
    if (!user && email) user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ clerkId, name, email: email || `${clerkId}@clerk.local` });
    } else if (!user.clerkId) {
      user.clerkId = clerkId;
      await user.save();
    }

    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('[auth/clerk-session] failed:', err.message);
    res.status(401).json({ error: 'Clerk session verification failed', detail: err.message });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user._id);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed', detail: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
      });
    }
    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(401).json({ error: 'Google auth failed', detail: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  // Stub: in production this would email a reset link/token.
  // Kept as a clearly-labeled stub so the route exists per the API spec
  // without over-promising email delivery infra that isn't wired up yet.
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  res.json({ message: 'If that email exists, a reset link has been sent (stub — wire up an email provider to activate).' });
});

function sanitize(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
}

module.exports = router;
