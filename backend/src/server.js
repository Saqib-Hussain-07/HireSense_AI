require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const connectDB = require('./config/db');
const attachWsGateway = require('./services/wsGateway');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const resumeRoutes = require('./routes/resume');
const jdRoutes = require('./routes/jd');
const matchRoutes = require('./routes/match');
const interviewRoutes = require('./routes/interview');
const historyRoutes = require('./routes/history');
const dashboardRoutes = require('./routes/dashboard');
const weaknessTrackerRoutes = require('./routes/weaknessTracker');
const learningPlanRoutes = require('./routes/learningPlan');
const githubRoutes = require('./routes/github');
const helmet = require('helmet');
const morgan = require('morgan');
const { authLimiter, aiLimiter, generalLimiter } = require('./middleware/rateLimiters');

const app = express();

// Security headers hardening
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false, // API server returning JSON & media
  })
);

// HTTP request logging (dev colored output in development; combined in production; muted in tests)
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat, { skip: () => process.env.NODE_ENV === 'test' }));

const DEFAULT_ORIGIN = process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173';
app.use(cors({ origin: process.env.CLIENT_ORIGIN || DEFAULT_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

// Global baseline rate limiter for API routes
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Auth limiter on sensitive authentication routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profile', profileRoutes);

// AI limiter on expensive reasoning & file processing routes
app.use('/api/resume', aiLimiter, resumeRoutes);
app.use('/api/jd', aiLimiter, jdRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/interview', aiLimiter, interviewRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/weakness-tracker', weaknessTrackerRoutes);
app.use('/api/learning-plan', aiLimiter, learningPlanRoutes);
app.use('/api/github', aiLimiter, githubRoutes);

// Centralized error handler as a safety net for anything routes don't catch.
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
attachWsGateway(server);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] HireSense AI backend listening on port ${PORT}`);
    console.log(`[server] WebSocket voice gateway at ws://localhost:${PORT}/ws/interview/:id?token=JWT`);
  });
});
