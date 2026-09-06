const mongoose = require('mongoose');

function getConnectionOptions(overrides = {}) {
  const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50;
  const minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 5;
  const serverSelectionTimeoutMS = parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10) || 4000;

  return {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS,
    socketTimeoutMS: 45000,
    ...overrides,
  };
}

/**
 * Connects to MongoDB with tuned connection pool options for small-to-mid deployments.
 * Prevents connection churn and unbounded socket accumulation under concurrent workloads.
 */
async function connectDB(overrideOptions = {}) {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiresense';
  const options = getConnectionOptions(overrideOptions);

  try {
    await mongoose.connect(uri, options);
    console.log(`[db] connected to MongoDB at ${uri} (pool: min ${options.minPoolSize}, max ${options.maxPoolSize})`);
  } catch (err) {
    console.warn('[db] Could not connect to MongoDB:', err.message);
    console.warn('[db] Server will keep running, but any DB-backed route will 500 until MONGO_URI is valid.');
    console.warn('[db] Fix: set MONGO_URI in .env to a local mongod instance or a MongoDB Atlas connection string.');
  }
}

module.exports = connectDB;
module.exports.getConnectionOptions = getConnectionOptions;

