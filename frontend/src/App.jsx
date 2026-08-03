import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Shell from "./components/Shell.jsx";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const SetupPage = lazy(() => import("./pages/SetupPage.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const ResumePage = lazy(() => import("./pages/ResumePage.jsx"));
const JDPage = lazy(() => import("./pages/JDPage.jsx"));
const MatchPage = lazy(() => import("./pages/MatchPage.jsx"));
const InterviewSetupPage = lazy(() => import("./pages/InterviewSetupPage.jsx"));
const VoiceInterviewSessionPage = lazy(
  () => import("./pages/VoiceInterviewSessionPage.jsx"),
);
const SessionReportPage = lazy(() => import("./pages/SessionReportPage.jsx"));
const HistoryPage = lazy(() => import("./pages/HistoryPage.jsx"));
const GrowthPage = lazy(() => import("./pages/GrowthPage.jsx"));
const GithubAnalyzerPage = lazy(() => import("./pages/GithubAnalyzerPage.jsx"));
const CompanyQuestionsPage = lazy(
  () => import("./pages/CompanyQuestionsPage.jsx"),
);
const PacksPage = lazy(() => import("./pages/PacksPage.jsx"));

function WithShell({ children }) {
  return (
    <ProtectedRoute>
      <Shell>{children}</Shell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          Loading...
        </div>
      }
    >
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
        <Route
          path="/interview/:id/report"
          element={
            <WithShell>
              <SessionReportPage />
            </WithShell>
          }
        />

        {/* Secondary / advanced pages — reachable from inside the app shell,
            not part of the required 4-step critical path */}
        <Route
          path="/dashboard"
          element={
            <WithShell>
              <Dashboard />
            </WithShell>
          }
        />
        <Route
          path="/resume"
          element={
            <WithShell>
              <ResumePage />
            </WithShell>
          }
        />
        <Route
          path="/jd"
          element={
            <WithShell>
              <JDPage />
            </WithShell>
          }
        />
        <Route
          path="/match"
          element={
            <WithShell>
              <MatchPage />
            </WithShell>
          }
        />
        <Route
          path="/interview/new"
          element={
            <WithShell>
              <InterviewSetupPage />
            </WithShell>
          }
        />
        <Route
          path="/history"
          element={
            <WithShell>
              <HistoryPage />
            </WithShell>
          }
        />
        <Route
          path="/growth"
          element={
            <WithShell>
              <GrowthPage />
            </WithShell>
          }
        />
        <Route
          path="/github"
          element={
            <WithShell>
              <GithubAnalyzerPage />
            </WithShell>
          }
        />
        <Route
          path="/company-questions"
          element={
            <WithShell>
              <CompanyQuestionsPage />
            </WithShell>
          }
        />
        <Route
          path="/packs"
          element={
            <WithShell>
              <PacksPage />
            </WithShell>
          }
        />
      </Routes>
    </Suspense>
  );
}
