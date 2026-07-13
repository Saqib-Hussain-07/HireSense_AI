import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function MatchPage() {
  const navigate = useNavigate();
  const { data: versions } = useQuery({ queryKey: ['resumeVersions'], queryFn: api.getResumeVersions });
  const [resumeId, setResumeId] = useState('');
  const [jdId, setJdId] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleMatch() {
    setBusy(true);
    setError('');
    try {
      const report = await api.createMatch({ resumeId, jdId });
      setResult(report);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Step 03"
        title="Match & skill gaps"
        description="Pick a resume version and paste the JD ID from the Job Description page to see your match %."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted font-mono">resume version</label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {versions?.map((r) => (
                <option key={r._id} value={r._id}>
                  v{r.version} · ATS {r.atsScore}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted font-mono">JD id</label>
            <input
              value={jdId}
              onChange={(e) => setJdId(e.target.value)}
              placeholder="paste JD id"
              className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleMatch}
          disabled={busy || !resumeId || !jdId}
          className="bg-onair text-ink font-medium rounded-md px-4 py-2 text-sm hover:bg-onair2 transition-colors disabled:opacity-40"
        >
          {busy ? 'Comparing…' : 'Generate match report'}
        </button>

        {error && <p className="text-sm text-alert">{error}</p>}

        {result && (
          <div className="bg-panel border border-hairline rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-display font-semibold text-onair">{result.matchPercent}%</div>
              <p className="text-sm text-muted">match with this job description</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-signal font-mono mb-2 uppercase">Strong areas</p>
                <div className="flex flex-wrap gap-2">
                  {result.strong?.map((s) => (
                    <span key={s} className="text-xs bg-signal/10 text-signal border border-signal/30 rounded-full px-2.5 py-1">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-alert font-mono mb-2 uppercase">Missing</p>
                <div className="flex flex-wrap gap-2">
                  {result.missing?.map((s) => (
                    <span key={s} className="text-xs bg-alert/10 text-alert border border-alert/30 rounded-full px-2.5 py-1">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {result.skillGaps?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted font-mono uppercase">Skill gap plan</p>
                {result.skillGaps.map((g, i) => (
                  <div key={i} className="bg-panel2 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{g.skill}</p>
                      <span className="text-xs text-faint font-mono">~{g.estHours}h</span>
                    </div>
                    <p className="text-sm text-muted mt-1">{g.why}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/interview/new', { state: { matchReportId: result._id } })}
              className="bg-onair text-ink font-medium rounded-md px-4 py-2 text-sm hover:bg-onair2 transition-colors"
            >
              Start a voice interview from this match →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
