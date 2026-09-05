import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { INTERVIEW_MODES, ANALYSIS_STEPS } from '../components/setup/setupConstants';
import ChoiceStep from '../components/setup/ChoiceStep';
import ResumeStep from '../components/setup/ResumeStep';
import JDStep from '../components/setup/JDStep';
import AnalysisProgressStep from '../components/setup/AnalysisProgressStep';
import ReportStep from '../components/setup/ReportStep';
import ConfigStep from '../components/setup/ConfigStep';

export default function SetupPage() {
  const navigate = useNavigate();

  // Step tracking: 0=choice, 1=resume, 2=jd, 3=analysing, 4=report, 5=interview config
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [fetchingLatest, setFetchingLatest] = useState(false);

  // Step 1 — Resume
  const [resume, setResume] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Step 2 — JD
  const [jdTab, setJdTab] = useState('paste'); // 'paste' | 'pdf' | 'url'
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [jd, setJd] = useState(null);
  const [analyzingJd, setAnalyzingJd] = useState(false);

  // Step 3 — Analysis progress
  const [analysisSteps, setAnalysisSteps] = useState({});

  // Step 4 — Report (derived from resume + jd)
  const [matchReport, setMatchReport] = useState(null);

  // Step 5 — Interview config
  const [modeId, setModeId] = useState('smart');
  const [subSelections, setSubSelections] = useState({});
  const [commonSelections, setCommonSelections] = useState({
    length: 'Standard (30 min)',
    feedback: 'Full scored report',
    coaching: 'On — hints on vague answers',
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [starting, setStarting] = useState(false);

  const selectedMode = INTERVIEW_MODES.find((m) => m.id === modeId);

  /* ── Step 0: Continue from previous session ── */
  async function handleContinue() {
    setFetchingLatest(true);
    setError('');
    try {
      const report = await api.getLatestMatch();
      setMatchReport(report);
      const resumeData = await api.getResume(report.resumeId);
      setResume(resumeData);
      setStep(5);
    } catch (_err) {
      setError('No previous CV/JD found. Redirecting to Fresh Start setup...');
      setTimeout(() => {
        setStep(1);
        setError('');
      }, 2000);
    } finally {
      setFetchingLatest(false);
    }
  }

  /* ── Step 1: Resume upload ── */
  async function handleResumeFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file — we support .pdf format only.');
      return;
    }
    setError('');
    setUploadingResume(true);
    try {
      const result = await api.uploadResume(file);
      setResume(result);
      setTimeout(() => setStep(2), 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingResume(false);
    }
  }

  /* ── Step 2: JD analysis ── */
  async function handleJdAnalyze() {
    setError('');
    setAnalyzingJd(true);
    try {
      let result;
      if (jdTab === 'pdf' && jdFile) {
        result = await api.uploadJdPdf(jdFile);
      } else if (jdTab === 'url' && jdUrl.trim()) {
        result = await api.analyzeJD({ url: jdUrl.trim() });
      } else {
        result = await api.analyzeJD({ rawText: jdText });
      }
      setJd(result);
      runAnalysis(result);
    } catch (err) {
      setError(err.message);
      setAnalyzingJd(false);
    }
  }

  /* ── Step 3: Analysis progression ── */
  function runAnalysis(jdResult) {
    setStep(3);
    setAnalyzingJd(false);
    setAnalysisSteps({});

    ANALYSIS_STEPS.forEach(({ id, delay }) => {
      setTimeout(() => {
        setAnalysisSteps((prev) => ({ ...prev, [id]: true }));
      }, delay);
    });

    const lastDelay = ANALYSIS_STEPS[ANALYSIS_STEPS.length - 1].delay;
    setTimeout(async () => {
      try {
        const match = await api.createMatch({ resumeId: resume._id, jdId: jdResult._id });
        setMatchReport(match);
      } catch (_e) {
        // Non-blocking — proceed with synthesised report
        setMatchReport({ _synth: true, resumeData: resume, jdData: jdResult });
      }
      setTimeout(() => setStep(4), 600);
    }, lastDelay + 800);
  }

  /* ── Step 5: Start interview ── */
  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      const mode = selectedMode;
      const coachingMode = commonSelections.coaching.startsWith('On') ? 'coaching' : 'neutral_assessment';
      const matchReportId = matchReport && !matchReport._synth ? matchReport._id : undefined;

      const isPanel = subSelections.persona === 'Panel — 2 voices';
      const personaVal =
        subSelections.persona === 'Staff Engineer' ? 'faang_engineer'
        : subSelections.persona === 'Hiring Manager' ? 'strict_recruiter'
        : subSelections.persona === 'Friendly HR' ? 'friendly_mentor'
        : subSelections.persona === 'Junior Peer Interviewer' ? 'friendly_mentor'
        : subSelections.persona === 'Senior IC' ? 'faang_engineer'
        : subSelections.persona === 'Bar-raiser' ? 'strict_recruiter'
        : subSelections.persona === 'Hiring Committee' ? 'strict_recruiter'
        : subSelections.persona === 'HR Partner' ? 'friendly_mentor'
        : subSelections.persona === 'Culture-fit interviewer' ? 'friendly_mentor'
        : subSelections.persona === 'VP / Director' ? 'startup_founder'
        : 'friendly_mentor';

      const session = await api.generateInterview({
        type: mode.backendType,
        difficulty: mode.backendDifficulty,
        ...(isPanel ? { panelPersonas: ['strict_recruiter', 'friendly_mentor'] } : { persona: personaVal }),
        mode: coachingMode,
        matchReportId,
      });
      navigate(`/interview/${session._id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  const score = matchReport?.overallScore ?? matchReport?.score ?? 84;
  const resumeSkills = resume?.parsed?.skills?.slice(0, 4) ?? [];
  const jdSkills = jd?.requiredSkills?.slice(0, 4) ?? [];
  const jdReady =
    jdTab === 'paste'
      ? jdText.trim().length >= 20
      : jdTab === 'pdf'
      ? !!jdFile
      : jdUrl.trim().length > 8;

  return (
    <div className="min-h-screen bg-ink px-4 py-10 md:py-14">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        {step >= 1 && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-onair/10 border border-onair/20 rounded-full px-3.5 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-onair" />
              <span className="text-xs font-mono text-onair uppercase tracking-wider">
                HireSense AI — Interview Setup
              </span>
            </div>
            <h1 className="font-serif text-3xl mb-2">Set up your voice interview</h1>
            <p className="text-sm text-muted">
              Upload your CV, add the job, get your analysis, then start your tailored interview.
            </p>
          </div>
        )}

        {/* Progress indicator */}
        {step >= 1 && (
          <div className="flex items-center gap-0 mb-10">
            {['CV Upload', 'Job Description', 'Analysis', 'Report', 'Interview'].map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <React.Fragment key={label}>
                  <div className={`flex flex-col items-center ${n > 1 ? 'flex-1' : ''}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300 ${
                        done ? 'bg-signal text-ink' : active ? 'bg-onair text-ink' : 'bg-panel2 text-faint'
                      }`}
                    >
                      {done ? '✓' : n}
                    </div>
                    <p className={`text-xs mt-1 hidden sm:block ${active ? 'text-text' : 'text-faint'}`}>
                      {label}
                    </p>
                  </div>
                  {i < 4 && (
                    <div
                      className={`flex-1 h-px mx-1 ${step > n + 1 ? 'bg-signal/50' : 'bg-hairline'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mb-5 bg-alert/10 border border-alert/30 rounded-lg px-4 py-3 text-sm text-alert">
            {error}
          </div>
        )}

        {/* ── STEP 0: Selection Choice ── */}
        {step === 0 && (
          <ChoiceStep
            onFreshStart={() => setStep(1)}
            onContinue={handleContinue}
            fetchingLatest={fetchingLatest}
          />
        )}

        {/* ── STEP 1: Resume upload ── */}
        {step === 1 && (
          <ResumeStep
            resume={resume}
            uploadingResume={uploadingResume}
            onFile={handleResumeFile}
            onContinue={() => setStep(2)}
            onGoToDashboard={() => navigate('/dashboard')}
          />
        )}

        {/* ── STEP 2: JD input ── */}
        {step === 2 && (
          <JDStep
            jdTab={jdTab}
            setJdTab={setJdTab}
            jdText={jdText}
            setJdText={setJdText}
            jdUrl={jdUrl}
            setJdUrl={setJdUrl}
            jdFile={jdFile}
            setJdFile={setJdFile}
            jd={jd}
            analyzingJd={analyzingJd}
            jdReady={jdReady}
            onAnalyze={handleJdAnalyze}
            onBack={() => setStep(1)}
            onError={setError}
          />
        )}

        {/* ── STEP 3: Analysis running ── */}
        {step === 3 && <AnalysisProgressStep analysisSteps={analysisSteps} />}

        {/* ── STEP 4: Analysis report ── */}
        {step === 4 && (
          <ReportStep
            score={score}
            resume={resume}
            resumeSkills={resumeSkills}
            jdSkills={jdSkills}
            onProceedToConfig={() => setStep(5)}
            onSelectSmartAndProceed={() => {
              setModeId('smart');
              setStep(5);
            }}
          />
        )}

        {/* ── STEP 5: Interview configuration & confirmation ── */}
        {step === 5 && (
          <ConfigStep
            modeId={modeId}
            setModeId={setModeId}
            subSelections={subSelections}
            setSubSelections={setSubSelections}
            commonSelections={commonSelections}
            setCommonSelections={setCommonSelections}
            showConfirm={showConfirm}
            setShowConfirm={setShowConfirm}
            starting={starting}
            error={error}
            jd={jd}
            step={step}
            onBackToReport={() => setStep(4)}
            onStart={handleStart}
          />
        )}
      </div>
    </div>
  );
}
