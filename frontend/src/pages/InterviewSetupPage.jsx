import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

const TYPES = ['technical', 'hr', 'dsa', 'system_design', 'behavioral'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const PERSONAS = [
  { id: 'friendly_mentor', label: 'Friendly Mentor' },
  { id: 'strict_recruiter', label: 'Strict Recruiter' },
  { id: 'faang_engineer', label: 'FAANG Engineer' },
  { id: 'startup_founder', label: 'Startup Founder' },
];

export default function InterviewSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const matchReportId = location.state?.matchReportId || '';

  const [type, setType] = useState('technical');
  const [difficulty, setDifficulty] = useState('medium');
  const [persona, setPersona] = useState('friendly_mentor');
  const [panelMode, setPanelMode] = useState(false);
  const [personaB, setPersonaB] = useState('faang_engineer');
  const [mode, setMode] = useState('coaching');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true);
    setError('');
    try {
      const body = {
        type,
        difficulty,
        mode,
        matchReportId: matchReportId || undefined,
        ...(panelMode ? { panelPersonas: [persona, personaB] } : { persona }),
      };
      const session = await api.generateInterview(body);
      navigate(`/interview/${session._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Step 04"
        title="Set up your voice interview"
        description="Choose the format, difficulty, and who's interviewing you. You'll speak your answers out loud — make sure your mic is on."
      />
      <div className="p-8 max-w-xl space-y-6">
        {matchReportId && (
          <p className="text-xs font-mono text-signal bg-signal/10 border border-signal/30 rounded-md px-3 py-2">
            Using your match report — questions will be biased toward your actual skill gaps.
          </p>
        )}

        <Field label="Interview type">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {t.replace('_', ' ')}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Difficulty">
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                {d}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Persona">
          <div className="flex flex-wrap gap-2">
            {PERSONAS.map((p) => (
              <Chip key={p.id} active={persona === p.id} onClick={() => setPersona(p.id)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Panel mode (two interviewers in one session)">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setPanelMode(!panelMode)}
              className={`text-sm rounded-full px-3.5 py-1.5 border transition-colors ${
                panelMode ? 'bg-onair text-ink border-onair' : 'bg-panel2 text-muted border-hairline'
              }`}
            >
              {panelMode ? 'Panel mode on' : 'Panel mode off'}
            </button>
            {panelMode && <span className="text-xs text-faint">Questions alternate between the two personas below.</span>}
          </div>
          {panelMode && (
            <div className="flex flex-wrap gap-2">
              {PERSONAS.filter((p) => p.id !== persona).map((p) => (
                <Chip key={p.id} active={personaB === p.id} onClick={() => setPersonaB(p.id)}>
                  {p.label}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        <Field label="Mode">
          <div className="flex flex-wrap gap-2">
            <Chip active={mode === 'coaching'} onClick={() => setMode('coaching')}>
              Coaching (encouraging)
            </Chip>
            <Chip active={mode === 'neutral_assessment'} onClick={() => setMode('neutral_assessment')}>
              Neutral assessment
            </Chip>
          </div>
        </Field>

        {error && <p className="text-sm text-alert">{error}</p>}

        <button
          onClick={start}
          disabled={busy}
          className="bg-onair text-ink font-medium rounded-md px-5 py-2.5 text-sm hover:bg-onair2 transition-colors disabled:opacity-40"
        >
          {busy ? 'Preparing questions…' : 'Begin voice interview'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted font-mono mb-2 uppercase">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm rounded-full px-3.5 py-1.5 border transition-colors capitalize ${
        active ? 'bg-onair text-ink border-onair' : 'bg-panel2 text-muted border-hairline hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}
