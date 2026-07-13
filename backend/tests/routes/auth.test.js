jest.mock('../../src/models/User');
jest.mock('../../src/services/aiAdapter'); // not used by auth, mocked defensively for isolation

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const authRoutes = require('../../src/routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

describe('POST /api/auth/signup', () => {
  test('creates a new user and returns a token when the email is not taken', async () => {
    User.findOne.mockResolvedValue(null);
    const fakeUser = {
      _id: 'user123',
      toObject: () => ({ _id: 'user123', name: 'Ada', email: 'ada@example.com', passwordHash: 'hashed' }),
    };
    User.create.mockResolvedValue(fakeUser);

    const res = await request(buildApp())
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'supersecret' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ada@example.com');
    expect(res.body.user.passwordHash).toBeUndefined(); // sanitize() must strip this
  });

  test('rejects a duplicate email with 409', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' });

    const res = await request(buildApp())
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'supersecret' });

    expect(res.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('rejects a missing field with 400', async () => {
    const res = await request(buildApp()).post('/api/auth/signup').send({ email: 'x@example.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    const passwordHash = await bcrypt.hash('correcthorse', 10);
    User.findOne.mockResolvedValue({
      _id: 'user123',
      passwordHash,
      toObject: () => ({ _id: 'user123', email: 'ada@example.com', passwordHash }),
    });

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'correcthorse' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong password with 401', async () => {
    const passwordHash = await bcrypt.hash('correcthorse', 10);
    User.findOne.mockResolvedValue({
      _id: 'user123',
      passwordHash,
      toObject: () => ({ _id: 'user123', passwordHash }),
    });

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('rejects unknown email with 401 (not 404 — avoids leaking which emails exist)', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});
