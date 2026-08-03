import React, { useState, useRef } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function JDPage() {
  const [mode, setMode] = useState('paste'); // 'paste' | 'url' | 'file'
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    setBusy(true);
    setError('');
    try {
      let jd;
      if (mode === 'file') {
        if (!file) throw new Error('Please select a PDF file first.');
        jd = await api.uploadJdPdf(file);
      } else {
        const body = mode === 'url' ? { url } : { rawText: text };
        jd = await api.analyzeJD(body);
      }
      setResult(jd);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(e) {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  }

  const canSubmit = mode === 'url' ? url.trim().length > 8 : mode === 'file' ? !!file : text.trim().length >= 20;

  return (
    <div>
      <PageHeader
        eyebrow="Step 02"
        title="Job description"
        description="Paste the JD, drop a link to the posting, or upload a job details PDF — we'll extract required skills, nice-to-haves, and responsibilities."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('paste'); setResult(null); setError(''); }}
            className={`text-sm rounded-full px-4 py-2 border transition-colors ${mode === 'paste' ? 'bg-onair text-ink border-onair font-medium' : 'bg-panel2 text-muted border-hairline'}`}
          >
            Paste text
          </button>
          <button
            onClick={() => { setMode('url'); setResult(null); setError(''); }}
            className={`text-sm rounded-full px-4 py-2 border transition-colors ${mode === 'url' ? 'bg-onair text-ink border-onair font-medium' : 'bg-panel2 text-muted border-hairline'}`}
          >
            From URL
          </button>
          <button
            onClick={() => { setMode('file'); setResult(null); setError(''); }}
            className={`text-sm rounded-full px-4 py-2 border transition-colors ${mode === 'file' ? 'bg-onair text-ink border-onair font-medium' : 'bg-panel2 text-muted border-hairline'}`}
          >
            Upload PDF
          </button>
        </div>

        {mode === 'paste' && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here…"
            className="w-full bg-panel border border-hairline rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40 text-white"
          />
        )}

        {mode === 'url' && (
          <div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com/careers/job-posting"
              className="w-full bg-panel border border-hairline rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40 text-white"
            />
            <p className="text-xs text-faint mt-2">
              Best-effort extraction — heavily JS-rendered career pages (Workday, some Greenhouse boards) may come back
              thin. If that happens, switch to "Paste text" instead.
            </p>
          </div>
        )}

        {mode === 'file' && (
          <label className="block border border-dashed border-hairline rounded-xl p-8 text-center cursor-pointer hover:border-onair/50 transition-colors bg-panel">
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <p className="text-text mb-1">{file ? `Selected: ${file.name}` : 'Click to select Job Description PDF'}</p>
            <p className="text-xs text-faint">{file ? 'PDF loaded' : 'PDF files only'}</p>
          </label>
        )}

        <button
          onClick={handleAnalyze}
          disabled={busy || !canSubmit}
          className="bg-onair text-ink font-medium rounded-md px-5 py-2 text-sm hover:bg-onair2 transition-colors disabled:opacity-40"
        >
          {busy ? 'Analyzing…' : 'Analyze job description'}
        </button>

        {error && <p className="text-sm text-alert">{error}</p>}

        {result && (
          <div className="bg-panel border border-hairline rounded-xl p-6 space-y-4">
            <p className="text-xs text-muted font-mono">
              Saved · JD ID <span className="text-text font-semibold">{result._id}</span> — use this on the Match page.
            </p>

            {(result.jobTitle || result.company) && (
              <div className="border-b border-white/5 pb-3">
                {result.jobTitle && <h3 className="text-lg font-bold text-white leading-tight capitalize">{result.jobTitle}</h3>}
                {result.company && <p className="text-sm text-zinc-400 mt-1 capitalize font-medium">{result.company}</p>}
              </div>
            )}

            <Section label="Required skills" items={result.requiredSkills} tone="onair" />
            <Section label="Nice to have" items={result.niceToHave} tone="muted" />
            <Section label="Soft skills" items={result.softSkills} tone="signal" />
            {result.experienceLevel && (
              <p className="text-sm text-text">
                <span className="text-muted">Experience level: </span>
                <span className="font-semibold text-white">{result.experienceLevel}</span>
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
