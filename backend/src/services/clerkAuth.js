const jwt = require('jsonwebtoken');
const User = require('../models/User');

let jwksClient = null;

function getJwksClient(clerkIssuer) {
  if (!jwksClient) {
    // eslint-disable-next-line global-require
    const jwksRsa = require('jwks-rsa');
    jwksClient = jwksRsa({
      jwksUri: `${clerkIssuer}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }
  return jwksClient;
}

function setJwksClient(client) {
  jwksClient = client;
}

function resetJwksClient() {
  jwksClient = null;
}

/**
 * Verifies a Clerk JWT token against Clerk JWKS,
 * then finds or creates the corresponding User in MongoDB.
 *
 * @param {string} token - Clerk session or JWT token
 * @param {object} [metadata] - Optional supplementary user metadata
 * @param {string} [metadata.email] - Optional explicit email from request body
 * @param {string} [metadata.name] - Optional explicit name from request body
 * @returns {Promise<import('../models/User')>} The authenticated/upserted Mongoose user document
 */
async function verifyAndUpsertClerkUser(token, { email: reqEmail, name: reqName } = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required');
  }

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('Invalid token structure: missing key ID (kid)');
  }

  const rawIssuer = process.env.CLERK_ISSUER || 'https://natural-javelin-9813.clerk.accounts.dev';
  const clerkIssuer = rawIssuer.replace(/\/$/, '');

  const getKey = (header, callback) => {
    const client = getJwksClient(clerkIssuer);
    const kid = header?.kid || decoded.header.kid;
    client.getSigningKey(kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key.getPublicKey ? key.getPublicKey() : key.rsaPublicKey;
      callback(null, signingKey);
    });
  };

  const payload = await new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer: [clerkIssuer, `${clerkIssuer}/`],
        algorithms: ['RS256'],
      },
      (err, decodedPayload) => {
        if (err) reject(err);
        else resolve(decodedPayload);
      }
    );
  });

  if (!payload || !payload.sub) {
    throw new Error('Token verification yielded no subject');
  }

  const clerkId = payload.sub;
  const email = (reqEmail || payload.email || '').toLowerCase().trim();
  const fallbackEmail = `${clerkId.toLowerCase()}@clerk.local`;
  const name = reqName || payload.name || payload.email || (email ? email.split('@')[0] : 'User');

  // Upsert: Match by clerkId, fallback email, or real email using pure equality
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
    if (changed) {
      await user.save();
    }
  }

  return user;
}

module.exports = {
  verifyAndUpsertClerkUser,
  getJwksClient,
  setJwksClient,
  resetJwksClient,
};

