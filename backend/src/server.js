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
const companyQuestionsRoutes = require('./routes/companyQuestions');
const packsRoutes = require('./routes/packs');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/weakness-tracker', weaknessTrackerRoutes);
app.use('/api/learning-plan', learningPlanRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/company-questions', companyQuestionsRoutes);
app.use('/api/packs', packsRoutes);

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
