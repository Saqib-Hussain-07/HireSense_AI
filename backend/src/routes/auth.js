const express = require('express');
const { signToken } = require('../middleware/auth');
const { verifyAndUpsertClerkUser } = require('../services/clerkAuth');

const router = express.Router();

function sanitize(user) {
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.passwordHash;
  return obj;
}

// POST /api/auth/clerk-session
// Primary auth endpoint: verifies Clerk session token against Clerk's public JWKS,
// ensures the User exists in MongoDB (keyed by clerkId), and returns session credentials.
router.post('/clerk-session', async (req, res) => {
  try {
    const { sessionToken, email, name } = req.body;
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });

    const user = await verifyAndUpsertClerkUser(sessionToken, { email, name });
    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('[auth/clerk-session] failed:', err.message);
    res.status(401).json({ error: 'Clerk session verification failed', detail: err.message });
  }
});

module.exports = router;


