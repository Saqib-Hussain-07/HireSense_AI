const mongoose = require('mongoose');
const crypto = require('crypto');

// DistributedLock Schema with TTL index on expiresAt for auto-cleanup
const DistributedLockSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    holder: { type: String, required: true },
    acquiredAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'distributed_locks', versionKey: false }
);

// TTL index: MongoDB will automatically delete documents once expiresAt has passed
DistributedLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

let DistributedLock;
try {
  DistributedLock = mongoose.model('DistributedLock');
} catch {
  DistributedLock = mongoose.model('DistributedLock', DistributedLockSchema);
}

// In-memory fallback for test environments or disconnected states
const memoryLocks = new Map();

/**
 * Attempts to acquire a distributed lock for `key`.
 * @param {string} key - Lock identifier, e.g. "scoring:<sessionId>:<questionIndex>"
 * @param {number} leaseMs - Lease duration in milliseconds (default: 60000 = 60s)
 * @returns {Promise<{ acquired: boolean, lockId: string|null }>}
 */
async function acquireLock(key, leaseMs = 60000) {
  if (!key) throw new Error('Lock key is required');
  const lockId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + leaseMs);

  // If MongoDB is connected, use atomic DB findOneAndUpdate
  if (mongoose.connection?.readyState === 1) {
    try {
      await DistributedLock.findOneAndUpdate(
        {
          _id: key,
          $or: [{ expiresAt: { $lt: now } }],
        },
        {
          $set: {
            holder: lockId,
            acquiredAt: now,
            expiresAt: expiresAt,
          },
          $setOnInsert: {
            _id: key,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
      return { acquired: true, lockId };
    } catch (err) {
      if (err.code === 11000) {
        // E11000 duplicate key error indicates another unexpired lock holds the key
        return { acquired: false, lockId: null };
      }
      console.warn(`[distributedLock] DB error acquiring lock for ${key}:`, err.message);
      // If DB error, fall back to memory lock so service does not hard-fail
    }
  }

  // In-memory lock handling (for tests or DB downtime)
  const existing = memoryLocks.get(key);
  if (existing && existing.expiresAt > now.getTime()) {
    return { acquired: false, lockId: null };
  }

  memoryLocks.set(key, { lockId, expiresAt: expiresAt.getTime() });
  return { acquired: true, lockId };
}

/**
 * Releases a previously acquired lock if the holder matches `lockId`.
 * @param {string} key - Lock identifier
 * @param {string} lockId - Holder ID returned by acquireLock
 * @returns {Promise<boolean>}
 */
async function releaseLock(key, lockId) {
  if (!key || !lockId) return false;

  let released = false;

  if (mongoose.connection?.readyState === 1) {
    try {
      const res = await DistributedLock.deleteOne({ _id: key, holder: lockId });
      released = res.deletedCount > 0;
    } catch (err) {
      console.warn(`[distributedLock] Error releasing DB lock for ${key}:`, err.message);
    }
  }

  const memory = memoryLocks.get(key);
  if (memory && memory.lockId === lockId) {
    memoryLocks.delete(key);
    released = true;
  }

  return released;
}

/**
 * Inspects if a lock is currently active without acquiring it.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function isLocked(key) {
  if (!key) return false;
  const now = new Date();

  if (mongoose.connection?.readyState === 1) {
    try {
      const doc = await DistributedLock.findOne({ _id: key, expiresAt: { $gt: now } });
      if (doc) return true;
    } catch (_e) {
      // ignore
    }
  }

  const memory = memoryLocks.get(key);
  if (memory && memory.expiresAt > now.getTime()) {
    return true;
  }

  return false;
}

module.exports = {
  acquireLock,
  releaseLock,
  isLocked,
  DistributedLock,
};
