const mongoose = require('mongoose');

/**
 * Connects to MongoDB. If MONGO_URI is unreachable (e.g. local dev without
 * Mongo/Atlas set up yet), we don't crash the whole app — we log a clear
 * warning so the developer knows API routes touching the DB will fail until
 * a real connection string is provided. This keeps the rest of the stack
 * (auth stubs, static routes, health checks) inspectable during setup.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiresense';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`[db] connected to MongoDB at ${uri}`);
  } catch (err) {
    console.warn('[db] Could not connect to MongoDB:', err.message);
    console.warn('[db] Server will keep running, but any DB-backed route will 500 until MONGO_URI is valid.');
    console.warn('[db] Fix: set MONGO_URI in .env to a local mongod instance or a MongoDB Atlas connection string.');
  }
}

module.exports = connectDB;
