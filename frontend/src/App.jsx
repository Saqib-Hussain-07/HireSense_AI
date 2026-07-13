import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Shell from './components/Shell.jsx';

import LandingPage from './pages/LandingPage.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import SetupPage from './pages/SetupPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ResumePage from './pages/ResumePage.jsx';
import JDPage from './pages/JDPage.jsx';
import MatchPage from './pages/MatchPage.jsx';
import InterviewSetupPage from './pages/InterviewSetupPage.jsx';
import VoiceInterviewSessionPage from './pages/VoiceInterviewSessionPage.jsx';
import SessionReportPage from './pages/SessionReportPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import GrowthPage from './pages/GrowthPage.jsx';
import GithubAnalyzerPage from './pages/GithubAnalyzerPage.jsx';
import CompanyQuestionsPage from './pages/CompanyQuestionsPage.jsx';
import PacksPage from './pages/PacksPage.jsx';

function WithShell({ children }) {
  return (
    <ProtectedRoute>
      <Shell>{children}</Shell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* 1. Landing — public marketing/explainer page */}
      <Route path="/" element={<LandingPage />} />

      {/* 2. Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 3. Setup — combined resume + JD + interview config (primary flow) */}
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <SetupPage />
          </ProtectedRoute>
        }
      />

      {/* 4. Voice interview + report */}
      <Route
        path="/interview/:id"
        element={
          <ProtectedRoute>
            <VoiceInterviewSessionPage />
          </ProtectedRoute>
        }
      />
      <Route path="/interview/:id/report" element={<WithShell><SessionReportPage /></WithShell>} />

      {/* Secondary / advanced pages — reachable from inside the app shell,
          not part of the required 4-step critical path */}
      <Route path="/dashboard" element={<WithShell><Dashboard /></WithShell>} />
      <Route path="/resume" element={<WithShell><ResumePage /></WithShell>} />
      <Route path="/jd" element={<WithShell><JDPage /></WithShell>} />
      <Route path="/match" element={<WithShell><MatchPage /></WithShell>} />
      <Route path="/interview/new" element={<WithShell><InterviewSetupPage /></WithShell>} />
      <Route path="/history" element={<WithShell><HistoryPage /></WithShell>} />
      <Route path="/growth" element={<WithShell><GrowthPage /></WithShell>} />
      <Route path="/github" element={<WithShell><GithubAnalyzerPage /></WithShell>} />
      <Route path="/company-questions" element={<WithShell><CompanyQuestionsPage /></WithShell>} />
      <Route path="/packs" element={<WithShell><PacksPage /></WithShell>} />
    </Routes>
  );
}
