import React, { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function JDPage() {
  const [mode, setMode] = useState('paste'); // 'paste' | 'url'
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    setBusy(true);
    setError('');
    try {
      const body = mode === 'url' ? { url } : { rawText: text };
      const jd = await api.analyzeJD(body);
      setResult(jd);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = mode === 'url' ? url.trim().length > 8 : text.trim().length >= 20;

  return (
    <div>
      <PageHeader
        eyebrow="Step 02"
        title="Job description"
        description="Paste the JD, or drop a link to the posting — we'll fetch and extract required skills, nice-to-haves, and responsibilities."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('paste')}
            className={`text-sm rounded-full px-3.5 py-1.5 border transition-colors ${mode === 'paste' ? 'bg-onair text-ink border-onair' : 'bg-panel2 text-muted border-hairline'}`}
          >
            Paste text
          </button>
          <button
            onClick={() => setMode('url')}
            className={`text-sm rounded-full px-3.5 py-1.5 border transition-colors ${mode === 'url' ? 'bg-onair text-ink border-onair' : 'bg-panel2 text-muted border-hairline'}`}
          >
            From URL
          </button>
        </div>

        {mode === 'paste' ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here…"
            className="w-full bg-panel border border-hairline rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40"
          />
        ) : (
          <div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com/careers/job-posting"
              className="w-full bg-panel border border-hairline rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40"
            />
            <p className="text-xs text-faint mt-2">
              Best-effort extraction — heavily JS-rendered career pages (Workday, some Greenhouse boards) may come back
              thin. If that happens, switch to "Paste text" instead.
            </p>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={busy || !canSubmit}
          className="bg-onair text-ink font-medium rounded-md px-4 py-2 text-sm hover:bg-onair2 transition-colors disabled:opacity-40"
        >
          {busy ? 'Analyzing…' : 'Analyze job description'}
        </button>

        {error && <p className="text-sm text-alert">{error}</p>}

        {result && (
          <div className="bg-panel border border-hairline rounded-xl p-6 space-y-4">
            <p className="text-xs text-muted font-mono">
              Saved · JD ID <span className="text-text">{result._id}</span> — use this on the Match page.
            </p>
            <Section label="Required skills" items={result.requiredSkills} tone="onair" />
            <Section label="Nice to have" items={result.niceToHave} tone="muted" />
            <Section label="Soft skills" items={result.softSkills} tone="signal" />
            {result.experienceLevel && (
              <p className="text-sm text-text">
                <span className="text-muted">Experience level: </span>
                {result.experienceLevel}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, items, tone }) {
  if (!items || items.length === 0) return null;
  const toneClass =
    tone === 'onair'
      ? 'bg-onair/10 text-onair border-onair/30'
      : tone === 'signal'
      ? 'bg-signal/10 text-signal border-signal/30'
      : 'bg-panel2 text-muted border-hairline';
  return (
    <div>
      <p className="text-xs text-muted font-mono mb-2 uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <span key={s} className={`text-xs rounded-full px-2.5 py-1 border ${toneClass}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

