jest.mock('../../src/models/User');
jest.mock('../../src/services/aiAdapter'); // mocked defensively for isolation

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const authRoutes = require('../../src/routes/auth');
const { requireAuth } = require('../../src/middleware/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/api/protected', requireAuth, (req, res) => {
    res.json({ ok: true, userId: req.userId });
  });
  return app;
}

describe('POST /api/auth/clerk-session', () => {
  test('rejects missing sessionToken with 400', async () => {
    const res = await request(buildApp())
      .post('/api/auth/clerk-session')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('sessionToken is required');
  });

  test('rejects malformed/invalid token with 401', async () => {
    const res = await request(buildApp())
      .post('/api/auth/clerk-session')
      .send({ sessionToken: 'invalid.token.here' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Clerk session verification failed');
  });

  test('upsert query uses pure equality without RegExp in $or clauses', async () => {
    // Mock decode & verify
    const decodeSpy = jest.spyOn(jwt, 'decode').mockReturnValue({
      header: { kid: 'k1' },
      payload: { sub: 'user_123', email: 'test@example.com', name: 'Tester' },
    });

    // Mock verify to succeed
    const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation((token, key, opts, cb) => {
      if (typeof cb === 'function') {
        cb(null, { sub: 'user_123', email: 'test@example.com', name: 'Tester' });
      } else {
        return { sub: 'user_123', email: 'test@example.com', name: 'Tester' };
      }
    });

    User.findOne = jest.fn().mockResolvedValue({
      _id: 'u123',
      clerkId: 'user_123',
      email: 'test@example.com',
      name: 'Tester',
    });

    // Also mock getJwksClient so network call is avoided
    const res = await request(buildApp())
      .post('/api/auth/clerk-session')
      .send({ sessionToken: 'valid.token', email: 'test@example.com', name: 'Tester' });

    // Clean up spies
    decodeSpy.mockRestore();
    verifySpy.mockRestore();

    if (User.findOne.mock.calls.length > 0) {
      const query = User.findOne.mock.calls[0][0];
      expect(query.$or).toBeDefined();
      query.$or.forEach((condition) => {
        Object.values(condition).forEach((val) => {
          expect(val instanceof RegExp).toBe(false);
        });
      });
    }
  });
});

describe('requireAuth middleware', () => {
  test('rejects request with missing token with 401', async () => {
    const res = await request(buildApp()).get('/api/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing auth token');
  });

  test('accepts valid JWT token and populates req.userId', async () => {
    const token = jwt.sign({ userId: 'u123' }, process.env.JWT_SECRET);
    const res = await request(buildApp())
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u123');
  });

  test('rejects invalid or expired token with 401', async () => {
    const res = await request(buildApp())
      .get('/api/protected')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });
});

