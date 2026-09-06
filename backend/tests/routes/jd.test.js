jest.mock('../../src/models/JobDescription');
jest.mock('../../src/services/aiAdapter');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const dns = require('dns').promises;
const JobDescription = require('../../src/models/JobDescription');
const { callAI } = require('../../src/services/aiAdapter');
const jdRoutes = require('../../src/routes/jd');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/jd', jdRoutes);
  return app;
}

describe('POST /api/jd/analyze (SSRF Hardening & JD Extraction)', () => {
  const userId = '507f1f77bcf86cd799439011';
  let token;
  let originalFetch;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_key';
    token = jwt.sign({ userId }, process.env.JWT_SECRET);
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requires authentication', async () => {
    const res = await request(buildApp()).post('/api/jd/analyze').send({ rawText: 'Sample JD' });
    expect(res.status).toBe(401);
  });

  test('blocks SSRF attempt targeting AWS/cloud metadata service (169.254.169.254)', async () => {
    const res = await request(buildApp())
      .post('/api/jd/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'http://169.254.169.254/latest/meta-data/' });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('private network address');
    expect(JobDescription.create).not.toHaveBeenCalled();
  });

  test('blocks SSRF attempt targeting localhost / loopback address', async () => {
    const res = await request(buildApp())
      .post('/api/jd/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'http://localhost:5000/internal-admin' });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('private or local network address');
    expect(JobDescription.create).not.toHaveBeenCalled();
  });

  test('blocks SSRF attempt where DNS resolves to private IP (10.0.0.1)', async () => {
    const lookupSpy = jest.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '10.0.0.1', family: 4 },
    ]);

    const res = await request(buildApp())
      .post('/api/jd/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://evil-internal-rebinder.com/job' });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('private network address');

    lookupSpy.mockRestore();
  });

  test('blocks SSRF attempt via redirect hop targeting cloud metadata endpoint', async () => {
    const lookupSpy = jest.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4 }, // example.com
    ]);

    // First fetch returns a 302 redirect pointing to 169.254.169.254
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 302,
      headers: {
        get: (name) => (name.toLowerCase() === 'location' ? 'http://169.254.169.254/secret' : null),
      },
    });

    const res = await request(buildApp())
      .post('/api/jd/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://careers.example.com/redirect' });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('private network address');

    lookupSpy.mockRestore();
  });

  test('successfully extracts JD from legitimate public URL', async () => {
    const lookupSpy = jest.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4 }, // example.com
    ]);

    const mockHtml = `
      <html>
        <body>
          <h1>Senior Fullstack Engineer</h1>
          <p>We are seeking an experienced Node.js and React engineer to join our high-growth platform team.</p>
          <p>Responsibilities include architecting scalable microservices, writing unit tests, and mentoring junior developers.</p>
        </body>
      </html>
    `;

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => mockHtml,
    });

    callAI.mockResolvedValue({
      data: {
        jobTitle: 'Senior Fullstack Engineer',
        company: 'Example Corp',
        requiredSkills: ['Node.js', 'React'],
        niceToHave: ['Docker'],
        softSkills: ['Mentorship'],
        experienceLevel: 'Senior',
        responsibilities: ['Architecting scalable microservices'],
      },
    });

    const mockCreatedJd = {
      _id: 'jd123',
      userId,
      jobTitle: 'Senior Fullstack Engineer',
      company: 'Example Corp',
      requiredSkills: ['Node.js', 'React'],
    };
    JobDescription.create = jest.fn().mockResolvedValue(mockCreatedJd);

    const res = await request(buildApp())
      .post('/api/jd/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://careers.example.com/senior-engineer' });

    expect(res.status).toBe(201);
    expect(res.body.jobTitle).toBe('Senior Fullstack Engineer');
    expect(JobDescription.create).toHaveBeenCalled();

    lookupSpy.mockRestore();
  });
});
