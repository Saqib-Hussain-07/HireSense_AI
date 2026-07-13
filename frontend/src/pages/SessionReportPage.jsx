import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/* ──────────────────────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function scoreColor(s) {
  if (s >= 80) return '#5FB8A8';
  if (s >= 55) return '#E8A94B';
  return '#E1685A';
}

function scoreLabel(s) {
  if (s >= 80) return 'Good';
  if (s >= 55) return 'Average';
  return 'Needs Work';
}

/* ── Donut chart using only real score ─────────────────────── */
function ScoreDonut({ score, size = 120 }) {
  const r = 42, stroke = 9;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  const filled = (pct / 100) * circ;
  const color = scoreColor(pct);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-hairline)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-2xl text-text leading-none">{pct}</span>
        <span className="text-[10px] text-faint font-mono mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ── Score chip ─────────────────────────────────────────────── */
function ScoreBadge({ score }) {
  const color = scoreColor(score || 0);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
      style={{ background: color + '22', color }}>
      {scoreLabel(score || 0)}
    </span>
  );
}

/* ── Rubric bar ─────────────────────────────────────────────── */
function RubricBar({ label, value, max = 10 }) {
  const pct = Math.round((value / max) * 100);
  const color = scoreColor(pct);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted capitalize">{label.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── STAR badge ─────────────────────────────────────────────── */
function StarBadge({ name, present }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${
      present
        ? 'bg-signal/10 text-signal border-signal/30'
        : 'bg-hairline text-faint border-hairline'
    }`}>
      {present ? '✓' : '○'} {name}
    </span>
  );
}

/* ── Section card ───────────────────────────────────────────── */
function Card({ children, className = '' }) {
  return (
    <div className={`bg-panel border border-hairline rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Question accordion item — only shows fields that have data
─────────────────────────────────────────────────────────────── */
function QuestionCard({ q, index, totalAnswered }) {
  const [open, setOpen] = useState(false);
  const hasAnswer = !!q.answerTranscript?.trim();
  const hasScore  = q.finalScore > 0;
  const hasRubric = q.rubricScores && Object.values(q.rubricScores).some(v => v > 0);
  const hasSTAR   = q.starCheck && Object.values(q.starCheck).some(v => v === true);
  const hasEvidence = q.evidenceQuotes?.length > 0;
  const hasIdeal  = !!q.idealAnswer?.trim();
  const hasGap    = !!q.gapNotes?.trim();
  const hasPushback = !!q.pushback?.trim();
  const hasFollowUps = q.followUps?.some(fu => fu.q?.trim());

  const color = hasScore ? scoreColor(q.finalScore) : 'var(--color-faint)';

  return (
    <Card>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-panel2/50 transition-colors rounded-2xl"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xs font-mono text-faint bg-panel2 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
            Q{index + 1}
          </span>
          <p className="text-sm font-medium text-text leading-relaxed">{q.questionText}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasScore && (
            <>
              <span className="font-display font-bold text-lg" style={{ color }}>{q.finalScore}</span>
              <ScoreBadge score={q.finalScore} />
            </>
          )}
          {q.timedOut && (
            <span className="text-xs font-mono text-alert bg-alert/10 px-1.5 py-0.5 rounded">timed out</span>
          )}
          {!hasAnswer && !hasScore && (
            <span className="text-xs text-faint">skipped</span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {/* Expanded detail — only real fields */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-hairline pt-4">

          {/* Timed out notice */}
          {q.timedOut && (
            <p className="text-xs text-alert font-mono bg-alert/10 border border-alert/20 rounded-lg px-3 py-2">
              Auto-advanced after silence timeout — no answer recorded.
            </p>
          )}

          {/* Answer transcript */}
          {hasAnswer && (
            <div>
              <p className="text-xs font-mono text-faint uppercase mb-2">Your Answer</p>
              <p className="text-sm text-muted leading-relaxed bg-panel2 rounded-xl px-4 py-3">
                {q.answerTranscript}
              </p>
            </div>
          )}

          {/* Rubric scores — only if AI actually scored */}
          {hasRubric && (
            <div>
              <p className="text-xs font-mono text-faint uppercase mb-3">Score Breakdown</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(q.rubricScores)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <RubricBar key={k} label={k} value={v} max={10} />
                  ))}
              </div>
            </div>
          )}

          {/* STAR check — only if AI ran it and any field was found */}
          {hasSTAR && (
            <div>
              <p className="text-xs font-mono text-faint uppercase mb-2">STAR Analysis</p>
              <div className="flex flex-wrap gap-2">
                {['situation', 'task', 'action', 'result'].map(k => (
                  <StarBadge key={k} name={k} present={!!q.starCheck[k]} />
                ))}
              </div>
            </div>
          )}

          {/* Evidence quotes — exact phrases flagged by AI */}
          {hasEvidence && (
            <div>
              <p className="text-xs font-mono text-faint uppercase mb-2">Evidence Flagged by AI</p>
              <div className="space-y-1.5">
                {q.evidenceQuotes.map((eq, j) => (
                  <p key={j} className="text-xs text-muted bg-panel2 rounded-lg px-3 py-2 leading-relaxed">
                    <span className="text-faint font-mono">{eq.criterion}: </span>
                    <span className="italic">"{eq.quote}"</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up questions that were asked */}
          {hasFollowUps && (
            <div>
              <p className="text-xs font-mono text-faint uppercase mb-2">Follow-up Questions Asked</p>
              <div className="space-y-2">
                {q.followUps.filter(fu => fu.q?.trim()).map((fu, j) => (
                  <div key={j} className="border border-hairline rounded-xl px-3 py-2">
                    <p className="text-xs text-muted">{fu.q}</p>
                    {fu.aTranscript?.trim() && (
                      <p className="text-xs text-faint mt-1.5 italic">→ {fu.aTranscript}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pushback — only if AI generated one */}
          {hasPushback && (
            <div className="bg-alert/10 border border-alert/25 rounded-xl px-4 py-3">
              <p className="text-xs font-mono text-alert uppercase mb-1">Pushback from AI</p>
              <p className="text-sm text-alert">{q.pushback}</p>
            </div>
          )}

          {/* Ideal answer — what a strong answer would look like */}
          {hasIdeal && (
            <div>
              <p className="text-xs font-mono text-signal uppercase mb-2">Ideal Answer</p>
              <p className="text-sm text-muted leading-relaxed bg-signal/5 border border-signal/20 rounded-xl px-4 py-3">
                {q.idealAnswer}
              </p>
            </div>
          )}

          {/* Gap notes */}
          {hasGap && (
            <div>
              <p className="text-xs font-mono text-faint uppercase mb-2">Gap Notes</p>
              <p className="text-sm text-muted leading-relaxed">{q.gapNotes}</p>
            </div>
          )}

          {/* Completely unanswered / no AI data */}
          {!hasAnswer && !hasScore && !q.timedOut && (
            <p className="text-sm text-faint text-center py-2">This question was not answered.</p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Report Page
─────────────────────────────────────────────────────────────── */
export default function SessionReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getInterview(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-onair border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted text-sm">Loading report…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Report not found.</p>
      </div>
    );
  }

  /* ── Derive only real values from the session ── */
  const questions        = session.questions || [];
  const answeredQs       = questions.filter(q => q.answerTranscript?.trim());
  const scoredQs         = questions.filter(q => q.finalScore > 0);
  const timedOutQs       = questions.filter(q => q.timedOut);
  const overallScore     = session.overallScore ?? 0;

  // Aggregate rubric averages — only from questions that were actually scored
  const rubricTotals = {};
  const rubricCounts = {};
  scoredQs.forEach(q => {
    Object.entries(q.rubricScores || {}).forEach(([k, v]) => {
      if (v > 0) {
        rubricTotals[k] = (rubricTotals[k] || 0) + v;
        rubricCounts[k] = (rubricCounts[k] || 0) + 1;
      }
    });
  });
  const rubricAvg = Object.keys(rubricTotals).reduce((acc, k) => {
    acc[k] = +(rubricTotals[k] / rubricCounts[k]).toFixed(1);
    return acc;
  }, {});

  // Session-level metadata
  const typeLabel       = (session.type || '').replace(/_/g, ' ');
  const personaLabel    = (session.persona || '').replace(/_/g, ' ');
  const diffLabel       = session.difficulty || '';
  const modeLabel       = session.mode || '';

  return (
    <div className="min-h-screen bg-ink text-text">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-panel border-b border-hairline px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <span className="font-display font-semibold text-sm text-text">Interview Report</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${session.status === 'completed' ? 'bg-signal' : 'bg-onair'}`} />
          <span className="text-xs font-mono text-faint capitalize">{session.status}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* ── Session overview ── */}
        <Card>
          <div className="p-5 flex items-center gap-6">
            <ScoreDonut score={overallScore} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display font-bold text-xl text-text">Overall Score</h1>
                <ScoreBadge score={overallScore} />
              </div>
              {/* Session metadata — only real fields */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted">
                {typeLabel    && <span>Type: <span className="text-text capitalize">{typeLabel}</span></span>}
                {diffLabel    && <span>Difficulty: <span className="text-text capitalize">{diffLabel}</span></span>}
                {personaLabel && <span>Persona: <span className="text-text capitalize">{personaLabel}</span></span>}
                {modeLabel    && <span>Mode: <span className="text-text capitalize">{modeLabel}</span></span>}
                {session.createdAt && <span>Date: <span className="text-text">{fmtDate(session.createdAt)}</span></span>}
              </div>
              {/* Question stats */}
              <div className="flex gap-4 mt-3">
                {[
                  { label: 'Questions', value: questions.length },
                  { label: 'Answered',  value: answeredQs.length },
                  { label: 'Scored',    value: scoredQs.length },
                  timedOutQs.length > 0 && { label: 'Timed out', value: timedOutQs.length },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} className="text-center bg-panel2 rounded-xl px-4 py-2">
                    <p className="font-display font-bold text-lg text-text leading-none">{value}</p>
                    <p className="text-[10px] font-mono text-faint uppercase mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Rubric averages — only shown if there's real scored data ── */}
        {Object.keys(rubricAvg).length > 0 && (
          <Card>
            <div className="px-5 pt-4 pb-3 border-b border-hairline">
              <p className="text-sm font-semibold text-text">AI Rubric Averages</p>
              <p className="text-xs text-faint mt-0.5">Averaged across {scoredQs.length} scored answer{scoredQs.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(rubricAvg).map(([k, v]) => (
                <RubricBar key={k} label={k} value={v} max={10} />
              ))}
            </div>
          </Card>
        )}

        {/* ── Per-question breakdown ── */}
        <div>
          <p className="text-xs font-mono text-faint uppercase tracking-widest mb-3 px-1">
            Question Breakdown ({questions.length})
          </p>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} totalAnswered={answeredQs.length} />
            ))}
          </div>
        </div>

        {/* ── No scored data message ── */}
        {scoredQs.length === 0 && (
          <Card>
            <div className="p-8 text-center">
              <p className="text-muted text-sm mb-1">No scored answers in this session.</p>
              <p className="text-faint text-xs">The session may have ended before any answers were submitted.</p>
            </div>
          </Card>
        )}

        {/* ── Bottom actions ── */}
        <div className="flex items-center justify-between pt-2">
          <Link to="/history"
            className="text-sm text-muted hover:text-text border border-hairline px-4 py-2 rounded-xl transition-colors">
            ← All Reports
          </Link>
          <Link to="/setup"
            className="text-sm bg-onair text-ink font-semibold px-5 py-2 rounded-xl hover:bg-onair2 transition-colors">
            New Interview
          </Link>
        </div>
      </div>
    </div>
  );
}
