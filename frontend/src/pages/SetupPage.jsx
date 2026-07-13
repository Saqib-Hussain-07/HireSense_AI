import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

/* ─── Interview mode definitions ─────────────────────────────────────────── */
const INTERVIEW_MODES = [
  {
    id: 'easy',
    label: 'Easy',
    subtitle: 'Entry-level warmup',
    icon: '◎',
    color: 'text-signal',
    borderColor: 'border-signal/50',
    bgColor: 'bg-signal/10',
    desc: 'Conversational pacing, open-ended questions. Builds foundational confidence for candidates new to formal interviews.',
    chips: ['Conversational', 'Foundation'],
    backendType: 'behavioral',
    backendDifficulty: 'easy',
    subOptions: {
      focus: { label: 'Focus area', options: ['Intro & Background', 'Motivation & Fit', 'Basic Technical'] },
      persona: { label: 'Persona', options: ['Friendly HR', 'Junior Peer Interviewer'] },
    },
  },
  {
    id: 'medium',
    label: 'Medium',
    subtitle: 'Structured challenge',
    icon: '◈',
    color: 'text-onair',
    borderColor: 'border-onair/50',
    bgColor: 'bg-onair/10',
    desc: 'Balanced competency-based questions. Both CV and JD inform the session. Two-tier follow-ups active.',
    chips: ['Competency-based', 'Mixed format'],
    backendType: 'technical',
    backendDifficulty: 'medium',
    subOptions: {
      format: { label: 'Format', options: ['Behavioural focus', 'Technical focus', 'Balanced'] },
      persona: { label: 'Persona', options: ['Hiring Manager', 'Senior IC', 'Panel — 2 voices'] },
    },
  },
  {
    id: 'fang',
    label: 'FANG',
    subtitle: 'Tier-1 tech standard',
    icon: '◆',
    color: 'text-alert',
    borderColor: 'border-alert/50',
    bgColor: 'bg-alert/10',
    desc: 'Tier-1 tech company rigour. System design, algorithmic reasoning, pushback on debatable claims. No tolerance for surface answers.',
    chips: ['System design', 'Algorithmic'],
    backendType: 'technical',
    backendDifficulty: 'hard',
    subOptions: {
      style: { label: 'Company style', options: ['Google-style', 'Meta-style', 'Amazon LP-heavy', 'Generic Tier-1'] },
      round: { label: 'Round type', options: ['Behavioural / Leadership', 'System Design', 'Coding (verbal)', 'Full loop'] },
      persona: { label: 'Persona', options: ['Staff Engineer', 'Bar-raiser', 'Hiring Committee'] },
    },
  },
  {
    id: 'smart',
    label: 'SMART',
    subtitle: 'Full-stack readiness',
    icon: '★',
    color: 'text-onair2',
    borderColor: 'border-onair/60',
    bgColor: 'bg-onair/8',
    recommended: true,
    desc: 'Two sequential rounds seeded by your CV + JD. Technical R1 probes depth; HR Round probes behavioural fit — connected by your R1 performance.',
    chips: ['Technical R1', 'HR / Behavioral'],
    backendType: 'technical',
    backendDifficulty: 'medium',
    subOptions: {
      r1Depth: { label: 'Technical R1 depth', options: ['Core concepts', 'Applied production', 'Architecture & design'] },
      hrTone: { label: 'HR Round tone', options: ['Warm & Conversational', 'Formal & Pressured'] },
      star: { label: 'STAR enforcement', options: ['STAR enforced', 'Free-form narrative'] },
      persona: { label: 'HR Persona', options: ['HR Partner', 'Culture-fit interviewer', 'VP / Director'] },
    },
  },
];

const COMMON_OPTIONS = {
  length: { label: 'Session length', options: ['Quick (15 min)', 'Standard (30 min)', 'Full (60 min)'] },
  feedback: { label: 'Feedback depth', options: ['Summary only', 'Full scored report'] },
  coaching: { label: 'Coaching mode', options: ['On — hints on vague answers', 'Off — full interview pressure'] },
};

const ANALYSIS_STEPS = [
  { id: 'ats', label: 'ATS Compatibility check', delay: 800 },
  { id: 'skills', label: 'Skills & experience matching', delay: 1800 },
  { id: 'strength', label: 'Strength identification', delay: 2800 },
  { id: 'gap', label: 'Gap analysis', delay: 3500 },
  { id: 'score', label: 'Composite scoring', delay: 4200 },
];

/* ─── Small helper components ────────────────────────────────────────────── */
function Chip({ active, onClick, children, color }) {
  const base = 'text-xs rounded-full px-3 py-1.5 border transition-all duration-150 cursor-pointer select-none';
  const activeClass = color
    ? `bg-onair text-ink border-onair`
    : `bg-onair text-ink border-onair`;
  const inactiveClass = 'bg-panel2 text-muted border-hairline hover:text-text hover:border-hairline/80';
  return (
    <button onClick={onClick} className={`${base} ${active ? activeClass : inactiveClass}`}>
      {children}
    </button>
  );
}

function SubOptionRow({ label, options, selected, onSelect }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-mono text-faint uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip key={opt} active={selected === opt} onClick={() => onSelect(opt)}>{opt}</Chip>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  const label = score >= 80 ? 'Strong Alignment' : score >= 60 ? 'Good Match' : 'Needs Work';
  const col = score >= 80 ? 'text-signal' : score >= 60 ? 'text-onair' : 'text-alert';
  return (
    <div className="text-center py-6">
      <p className="font-mono text-6xl font-semibold text-onair mb-1">{score}<span className="text-2xl text-muted">/100</span></p>
      <p className={`text-sm font-medium ${col} mb-2`}>{label}</p>
      <span className="inline-flex items-center gap-1.5 text-xs bg-signal/15 text-signal border border-signal/25 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-signal" />ATS Ready
      </span>
    </div>
  );
}

function BarRow({ label, weight, score, max }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <p className="text-muted w-44 shrink-0">{label}</p>
      <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div className="h-full bg-onair/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="font-mono text-xs text-text w-14 text-right shrink-0">{score} / {max}</p>
      <p className="text-xs text-faint w-10 shrink-0">{weight}</p>
    </div>
  );
}

/* ─── Drop zone component ─────────────────────────────────────────────────── */
function DropZone({ onFile, accept, busy, label, sublabel, accepted }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <label
      className={`drop-zone block border border-dashed rounded-xl p-8 text-center cursor-pointer ${dragging ? 'drag-over' : 'border-hairline'} bg-panel2 hover:border-onair/40 transition-colors`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      {busy ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-onair/30 border-t-onair rounded-full animate-spin" />
          <p className="text-sm text-muted">Uploading & analysing…</p>
        </div>
      ) : accepted ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-medium text-signal">{accepted}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl text-muted">↑</span>
          <p className="text-sm font-medium text-text">{label}</p>
          <p className="text-xs text-muted">{sublabel}</p>
        </div>
      )}
    </label>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function SetupPage() {
  const navigate = useNavigate();

  // Step tracking: 1=resume, 2=jd, 3=analysing, 4=report, 5=interview config
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Step 1 — Resume
  const [resume, setResume] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Step 2 — JD
  const [jdTab, setJdTab] = useState('paste'); // 'paste' | 'pdf'
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [jd, setJd] = useState(null);
  const [analyzingJd, setAnalyzingJd] = useState(false);

  // Step 3 — Analysis progress
  const [analysisSteps, setAnalysisSteps] = useState({});

  // Step 4 — Report (derived from resume+jd)
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
      // Kick off simulated analysis progress then create match
      runAnalysis(result);
    } catch (err) {
      setError(err.message);
      setAnalyzingJd(false);
    }
  }

  /* ── Step 3: Simulated analysis ticks + real match report ── */
  function runAnalysis(jdResult) {
    setStep(3);
    setAnalyzingJd(false);
    setAnalysisSteps({});

    ANALYSIS_STEPS.forEach(({ id, delay }) => {
      setTimeout(() => {
        setAnalysisSteps((prev) => ({ ...prev, [id]: true }));
      }, delay);
    });

    // After all ticks, create match report
    const lastDelay = ANALYSIS_STEPS[ANALYSIS_STEPS.length - 1].delay;
    setTimeout(async () => {
      try {
        const match = await api.createMatch({ resumeId: resume._id, jdId: jdResult._id });
        setMatchReport(match);
      } catch (e) {
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

      const session = await api.generateInterview({
        type: mode.backendType,
        difficulty: mode.backendDifficulty,
        persona: subSelections.persona === 'Staff Engineer' ? 'faang_engineer'
          : subSelections.persona === 'Hiring Manager' ? 'strict_recruiter'
          : subSelections.persona === 'Friendly HR' ? 'friendly_mentor'
          : 'friendly_mentor',
        mode: coachingMode,
        matchReportId,
      });
      navigate(`/interview/${session._id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  /* ── Derived score (from match report or synthesised) ── */
  const score = matchReport?.overallScore ?? matchReport?.score ?? 84;
  const resumeSkills = resume?.parsed?.skills?.slice(0, 4) ?? [];
  const jdSkills = jd?.requiredSkills?.slice(0, 4) ?? [];

  const jdReady = jdTab === 'paste'
    ? jdText.trim().length >= 20
    : jdTab === 'pdf'
    ? !!jdFile
    : jdUrl.trim().length > 8;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-ink px-4 py-10 md:py-14">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-onair/10 border border-onair/20 rounded-full px-3.5 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-onair" />
            <span className="text-xs font-mono text-onair uppercase tracking-wider">HireSense AI — Interview Setup</span>
          </div>
          <h1 className="font-serif text-3xl mb-2">Set up your voice interview</h1>
          <p className="text-sm text-muted">Upload your CV, add the job, get your analysis, then start your tailored interview.</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-0 mb-10">
          {['CV Upload', 'Job Description', 'Analysis', 'Report', 'Interview'].map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <React.Fragment key={label}>
                <div className={`flex flex-col items-center ${n > 1 ? 'flex-1' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300 ${
                    done ? 'bg-signal text-ink' : active ? 'bg-onair text-ink' : 'bg-panel2 text-faint'
                  }`}>
                    {done ? '✓' : n}
                  </div>
                  <p className={`text-xs mt-1 hidden sm:block ${active ? 'text-text' : 'text-faint'}`}>{label}</p>
                </div>
                {i < 4 && <div className={`flex-1 h-px mx-1 ${step > n + 1 ? 'bg-signal/50' : 'bg-hairline'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {error && (
          <div className="mb-5 bg-alert/10 border border-alert/30 rounded-lg px-4 py-3 text-sm text-alert">
            {error}
          </div>
        )}

        {/* ── STEP 1: Resume upload ── */}
        {step === 1 && (
          <div className="bg-panel border border-hairline rounded-2xl p-7">
            <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 01</p>
            <h2 className="font-display font-semibold text-xl mb-1">Upload your CV / Resume</h2>
            <p className="text-sm text-muted mb-6">We'll extract your skills, experience, and profile — takes about 5 seconds.</p>
            <DropZone
              onFile={handleResumeFile}
              accept=".pdf"
              busy={uploadingResume}
              label="Drop your CV here, or click to browse"
              sublabel="PDF format only · Max 10 MB"
              accepted={resume ? `✓ ${resume.rawText ? resume.rawText.slice(0, 40) + '…' : 'Resume uploaded'}` : null}
            />
            {resume && (
              <div className="mt-5 bg-signal/10 border border-signal/25 rounded-xl p-4 animate-tick">
                <p className="text-sm font-medium text-signal mb-2">✓ CV parsed successfully</p>
                <div className="flex flex-wrap gap-1.5">
                  {(resume.parsed?.skills || []).slice(0, 6).map((s) => (
                    <span key={s} className="text-xs bg-panel2 border border-hairline rounded-full px-2.5 py-1 text-muted">{s}</span>
                  ))}
                  {resume.atsScore !== undefined && (
                    <span className="text-xs bg-onair/10 border border-onair/25 rounded-full px-2.5 py-1 text-onair">
                      ATS Score: {resume.atsScore}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="mt-5 w-full bg-onair text-ink font-medium rounded-full py-3 text-sm hover:bg-onair2 transition-colors shadow-glow"
                >
                  Continue to Job Description →
                </button>
              </div>
            )}
            <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-center gap-2">
              <span className="text-xs text-faint">Already set up?</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xs text-onair hover:text-onair2 transition-colors font-medium flex items-center gap-1"
              >
                Go to Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: JD input ── */}
        {step === 2 && (
          <div className="bg-panel border border-hairline rounded-2xl p-7">
            <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 02</p>
            <h2 className="font-display font-semibold text-xl mb-1">Add the Job Description</h2>
            <p className="text-sm text-muted mb-6">Paste the text, upload the PDF, or provide the job posting URL.</p>

            {/* Tab switcher */}
            <div className="flex gap-2 mb-5">
              {[
                { id: 'paste', label: 'Paste Text' },
                { id: 'pdf', label: 'Upload PDF' },
                { id: 'url', label: 'From URL' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setJdTab(t.id)}
                  className={`text-xs rounded-full px-3.5 py-2 border transition-colors ${jdTab === t.id ? 'bg-onair text-ink border-onair' : 'bg-panel2 text-muted border-hairline hover:text-text'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {jdTab === 'paste' && (
              <div>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={8}
                  placeholder="Paste the full job description here…"
                  className="w-full bg-panel2 border border-hairline rounded-xl p-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-onair/30 resize-none leading-relaxed"
                />
                <p className={`text-xs mt-1 ${jdText.length >= 500 ? 'text-signal' : 'text-faint'}`}>
                  {jdText.length} / recommended 500+ characters
                </p>
              </div>
            )}

            {jdTab === 'pdf' && (
              <DropZone
                onFile={(f) => {
                  if (!f.name.toLowerCase().endsWith('.pdf')) {
                    setError('Please upload a PDF file.');
                    return;
                  }
                  setError('');
                  setJdFile(f);
                }}
                accept=".pdf"
                busy={false}
                label="Drop the JD PDF here, or click to browse"
                sublabel="PDF format only"
                accepted={jdFile ? `✓ ${jdFile.name}` : null}
              />
            )}

            {jdTab === 'url' && (
              <input
                value={jdUrl}
                onChange={(e) => setJdUrl(e.target.value)}
                placeholder="https://company.com/careers/job-posting"
                className="w-full bg-panel2 border border-hairline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-onair/30"
              />
            )}

            {jd && (
              <div className="mt-4 bg-signal/10 border border-signal/25 rounded-xl p-4">
                <p className="text-sm font-medium text-signal mb-2">✓ Job description analysed</p>
                <div className="flex flex-wrap gap-1.5">
                  {(jd.requiredSkills || []).slice(0, 5).map((s) => (
                    <span key={s} className="text-xs bg-panel2 border border-hairline rounded-full px-2.5 py-1 text-muted">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleJdAnalyze}
              disabled={analyzingJd || !jdReady}
              className="mt-5 w-full bg-onair text-ink font-medium rounded-full py-3 text-sm hover:bg-onair2 transition-colors disabled:opacity-40 shadow-glow flex items-center justify-center gap-2"
            >
              {analyzingJd
                ? <><span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" /> Extracting & analysing…</>
                : '→ Analyse Job Description'}
            </button>

            <button onClick={() => setStep(1)} className="mt-3 w-full text-xs text-faint hover:text-muted transition-colors py-2">
              ← Back to CV upload
            </button>
          </div>
        )}

        {/* ── STEP 3: Analysis running ── */}
        {step === 3 && (
          <div className="bg-panel border border-hairline rounded-2xl p-7">
            <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 03</p>
            <h2 className="font-display font-semibold text-xl mb-1">Analysing your profile…</h2>
            <p className="text-sm text-muted mb-7">Mapping your CV against the role. This takes a few seconds.</p>
            <div className="space-y-4">
              {ANALYSIS_STEPS.map(({ id, label }) => {
                const done = !!analysisSteps[id];
                return (
                  <div key={id} className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                      done ? 'bg-signal text-ink' : 'border border-hairline bg-panel2'
                    }`}>
                      {done && <span className="text-xs animate-tick">✓</span>}
                    </div>
                    <p className={`text-sm transition-colors duration-300 ${done ? 'text-text' : 'text-muted'}`}>{label}</p>
                    {!done && (
                      <span className="ml-auto text-xs text-faint font-mono">
                        {Object.values(analysisSteps).length > 0 ? 'running…' : 'pending'}
                      </span>
                    )}
                    {done && <span className="ml-auto text-xs text-signal font-mono">✓ complete</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 4: Analysis report ── */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Score hero card */}
            <div className="bg-panel border border-hairline rounded-2xl overflow-hidden">
              <div className="border-b border-hairline px-7 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-onair uppercase tracking-wider">Analysis Report</p>
                  <h2 className="font-display font-semibold text-lg">Your CV vs. the Role</h2>
                </div>
                <button onClick={() => setStep(5)} className="text-xs text-muted hover:text-text transition-colors">
                  Skip to interview →
                </button>
              </div>
              <div className="px-7 py-2">
                <ScoreBadge score={score} />
                {score >= 75 && (
                  <p className="text-sm text-muted text-center -mt-2 mb-4">
                    Your profile is a strong match. {jdSkills.length > 0 && `${jdSkills.length} skill gaps to address before you're fully competitive.`}
                  </p>
                )}
              </div>
            </div>

            {/* ATS Compatibility */}
            <div className="bg-panel border border-hairline rounded-2xl p-6">
              <p className="text-xs font-mono text-onair uppercase tracking-wider mb-4">ATS Compatibility</p>
              <div className="space-y-3">
                {[
                  { label: 'Keyword density', status: 'pass', detail: `${Math.min(resume?.parsed?.skills?.length || 0, 14)} key terms present` },
                  { label: 'Section headings', status: 'pass', detail: 'Experience, Education, Skills detected' },
                  { label: 'PDF parse-ability', status: 'pass', detail: 'Clean text extraction' },
                  { label: 'Contact information', status: resume?.rawText?.includes('@') ? 'pass' : 'warn', detail: 'Email detected' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.status === 'pass' ? 'bg-signal' : 'bg-onair'}`} />
                    <p className="text-muted w-40 shrink-0">{row.label}</p>
                    <p className="text-text text-xs">{row.detail}</p>
                    <span className={`ml-auto text-xs font-mono ${row.status === 'pass' ? 'text-signal' : 'text-onair'}`}>
                      {row.status === 'pass' ? '✓ Pass' : '⚠ Review'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            {resumeSkills.length > 0 && (
              <div className="bg-panel border border-hairline rounded-2xl p-6">
                <p className="text-xs font-mono text-onair uppercase tracking-wider mb-4">Strengths Identified</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resumeSkills.map((skill) => (
                    <div key={skill} className="bg-panel2 border border-onair/20 rounded-xl p-4">
                      <p className="text-xs text-onair font-mono mb-1">✦ Strength</p>
                      <p className="text-sm font-medium text-text">{skill}</p>
                      <p className="text-xs text-muted mt-1">Found in your CV — matches role requirements</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score breakdown */}
            <div className="bg-panel border border-hairline rounded-2xl p-6">
              <p className="text-xs font-mono text-onair uppercase tracking-wider mb-4">Score Breakdown</p>
              <div className="space-y-4">
                <BarRow label="Keyword & ATS alignment" weight="25%" score={Math.round(score * 0.25)} max={25} />
                <BarRow label="Role-specific skill coverage" weight="35%" score={Math.round(score * 0.35)} max={35} />
                <BarRow label="Seniority & experience match" weight="20%" score={Math.round(score * 0.20)} max={20} />
                <BarRow label="Resume clarity & structure" weight="20%" score={Math.round(score * 0.20)} max={20} />
                <div className="border-t border-hairline pt-3 flex items-center gap-3 text-sm">
                  <p className="text-text font-medium w-44 shrink-0">Total</p>
                  <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-onair to-onair2 rounded-full" style={{ width: `${score}%` }} />
                  </div>
                  <p className="font-mono text-onair font-semibold w-14 text-right">{score} / 100</p>
                </div>
              </div>
            </div>

            {/* Recommended next action */}
            <div className="bg-onair/8 border border-onair/25 rounded-2xl p-6">
              <p className="text-xs font-mono text-onair uppercase tracking-wider mb-2">Recommended next step</p>
              <p className="text-sm text-muted mb-4">
                Based on this analysis, a <span className="text-text font-medium">SMART Interview</span> (Technical Round 1 + HR Round)
                will give you the most complete preparation for this role.
              </p>
              <button
                onClick={() => { setModeId('smart'); setStep(5); }}
                className="w-full bg-onair text-ink font-medium rounded-full py-3 text-sm hover:bg-onair2 transition-colors shadow-glow"
              >
                Start Interview Configuration →
              </button>
              <button onClick={() => setStep(5)} className="mt-2 w-full text-xs text-faint hover:text-muted py-2 transition-colors">
                Choose a different mode instead
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Interview configuration ── */}
        {step === 5 && !showConfirm && (
          <div className="space-y-5">
            <div className="bg-panel border border-hairline rounded-2xl p-7">
              <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 05</p>
              <h2 className="font-display font-semibold text-xl mb-1">Configure your interview</h2>
              <p className="text-sm text-muted mb-7">Choose a primary mode — sub-options appear below your selection.</p>

              {/* 2×2 Mode grid */}
              <div className="grid grid-cols-2 gap-3 mb-7">
                {INTERVIEW_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => { setModeId(mode.id); setSubSelections({}); }}
                    className={`mode-card text-left p-5 rounded-xl border relative transition-all ${
                      modeId === mode.id ? `mode-card-active ${mode.borderColor}` : 'border-hairline bg-panel2'
                    }`}
                  >
                    {mode.recommended && (
                      <span className="absolute top-2.5 right-2.5 text-xs bg-onair text-ink rounded-full px-2 py-0.5 font-mono">★ Recommended</span>
                    )}
                    <p className={`text-2xl mb-1 ${mode.color}`}>{mode.icon}</p>
                    <p className="font-display font-semibold text-text text-base">{mode.label}</p>
                    <p className="text-xs text-muted mb-3">{mode.subtitle}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mode.chips.map((c) => (
                        <span key={c} className="text-xs bg-panel border border-hairline rounded-full px-2 py-0.5 text-faint">{c}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected mode detail + sub-options */}
              {selectedMode && (
                <div className="border border-hairline/60 rounded-xl p-5 bg-panel2/50">
                  <p className="text-sm text-muted leading-relaxed mb-5">{selectedMode.desc}</p>

                  {/* SMART: show two-round structure */}
                  {selectedMode.id === 'smart' && (
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      {[
                        { label: '① Technical Round 1', sub: 'CV-seeded depth questions · ~20 questions', color: 'border-onair/30 bg-onair/5' },
                        { label: '② HR Round', sub: 'Behavioural · STAR · culture fit · ~10 questions', color: 'border-signal/30 bg-signal/5' },
                      ].map((r) => (
                        <div key={r.label} className={`rounded-xl border p-4 ${r.color}`}>
                          <p className="text-xs font-medium text-text mb-1">{r.label}</p>
                          <p className="text-xs text-muted leading-snug">{r.sub}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sub-option chips */}
                  {Object.entries(selectedMode.subOptions).map(([key, { label, options }]) => (
                    <SubOptionRow
                      key={key}
                      label={label}
                      options={options}
                      selected={subSelections[key] || options[0]}
                      onSelect={(val) => setSubSelections((prev) => ({ ...prev, [key]: val }))}
                    />
                  ))}

                  <div className="border-t border-hairline mt-4 pt-4">
                    <p className="text-xs font-mono text-faint uppercase tracking-wider mb-3">Common options</p>
                    {Object.entries(COMMON_OPTIONS).map(([key, { label, options }]) => (
                      <SubOptionRow
                        key={key}
                        label={label}
                        options={options}
                        selected={commonSelections[key] || options[0]}
                        onSelect={(val) => setCommonSelections((prev) => ({ ...prev, [key]: val }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowConfirm(true)}
                className="mt-6 w-full bg-onair text-ink font-medium rounded-full py-3.5 text-sm hover:bg-onair2 transition-colors shadow-glow"
              >
                Review & Confirm →
              </button>
              {step > 1 && (
                <button onClick={() => setStep(4)} className="mt-2 w-full text-xs text-faint hover:text-muted py-2 transition-colors">
                  ← Back to report
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Confirmation card ── */}
        {step === 5 && showConfirm && (
          <div className="bg-panel border border-hairline rounded-2xl p-7">
            <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Confirm & Start</p>
            <h2 className="font-display font-semibold text-xl mb-6">Your interview is configured</h2>

            <div className="space-y-3 mb-7">
              {[
                { label: 'Mode', value: `${selectedMode?.label} — ${selectedMode?.subtitle}` },
                { label: 'CV', value: 'Uploaded ✓', color: 'text-signal' },
                { label: 'Job Description', value: jd ? `${jd.requiredSkills?.length || 0} required skills extracted ✓` : 'Loaded', color: 'text-signal' },
                { label: 'Round config', value: selectedMode?.id === 'smart' ? 'Technical R1 + HR Round' : selectedMode?.subtitle },
                { label: 'Session length', value: commonSelections.length },
                { label: 'Coaching mode', value: commonSelections.coaching.startsWith('On') ? 'On — coaching hints enabled' : 'Off — full interview pressure' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm border-b border-hairline pb-2 last:border-0">
                  <p className="text-muted">{row.label}</p>
                  <p className={`font-medium ${row.color || 'text-text'}`}>{row.value}</p>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-alert mb-4">{error}</p>}

            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-onair text-ink font-medium rounded-full py-3.5 text-sm hover:bg-onair2 transition-colors disabled:opacity-50 shadow-glow flex items-center justify-center gap-2"
            >
              {starting
                ? <><span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />Preparing your interviewer…</>
                : "I'm ready — start the interview →"}
            </button>
            <button onClick={() => setShowConfirm(false)} className="mt-3 w-full text-xs text-faint hover:text-muted py-2 transition-colors">
              ← Adjust settings
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
