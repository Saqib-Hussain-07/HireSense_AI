jest.mock('mongoose');
const mongoose = require('mongoose');
const connectDB = require('../../src/config/db');

describe('MongoDB Connection Pool Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('getConnectionOptions returns production defaults for small-to-mid concurrency', () => {
    delete process.env.MONGO_MAX_POOL_SIZE;
    delete process.env.MONGO_MIN_POOL_SIZE;
    delete process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS;

    const options = connectDB.getConnectionOptions();

    expect(options).toEqual({
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 4000,
      socketTimeoutMS: 45000,
    });
  });

  test('getConnectionOptions respects environment variable overrides', () => {
    process.env.MONGO_MAX_POOL_SIZE = '25';
    process.env.MONGO_MIN_POOL_SIZE = '8';
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS = '8000';

    const options = connectDB.getConnectionOptions();

    expect(options).toEqual({
      maxPoolSize: 25,
      minPoolSize: 8,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
  });

  test('connectDB calls mongoose.connect with configured pool and timeout options', async () => {
    process.env.MONGO_URI = 'mongodb://atlas.example.com:27017/prod_hiresense';
    process.env.MONGO_MAX_POOL_SIZE = '30';
    mongoose.connect = jest.fn().mockResolvedValue(true);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(
      'mongodb://atlas.example.com:27017/prod_hiresense',
      expect.objectContaining({
        maxPoolSize: 30,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 4000,
        socketTimeoutMS: 45000,
      })
    );
  });

  test('connectDB handles connection failures gracefully without unhandled exceptions', async () => {
    mongoose.connect = jest.fn().mockRejectedValue(new Error('Connection timeout'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(connectDB()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
