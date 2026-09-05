import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function MatchPage() {
  const navigate = useNavigate();
  const { data: versions } = useQuery({ queryKey: ['resumeVersions'], queryFn: api.getResumeVersions });
  const { data: jds } = useQuery({ queryKey: ['jobDescriptions'], queryFn: api.getJDs });
  
  const [resumeId, setResumeId] = useState('');
  const [jdId, setJdId] = useState('');
  const [customJdMode, setCustomJdMode] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Auto-select latest JD if available
  React.useEffect(() => {
    if (jds && jds.length > 0 && !jdId) {
      setJdId(jds[0]._id);
    }
  }, [jds, jdId]);

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
        description="Pick a resume version and select an analyzed job description to see your match %."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted font-mono">resume version</label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm text-white focus:outline-none"
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
            <div className="flex justify-between items-center">
              <label className="text-xs text-muted font-mono">job description</label>
              <button 
                type="button"
                onClick={() => { setCustomJdMode(!customJdMode); setJdId(''); }}
                className="text-[10px] text-zinc-500 hover:text-white underline font-mono"
              >
                {customJdMode ? 'use list' : 'paste custom ID'}
              </button>
            </div>
            {customJdMode ? (
              <input
                value={jdId}
                onChange={(e) => setJdId(e.target.value)}
                placeholder="paste JD id"
                className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm text-white focus:outline-none"
              />
            ) : (
              <select
                value={jdId}
                onChange={(e) => setJdId(e.target.value)}
                className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="">Select JD…</option>
                {jds?.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.jobTitle || 'Untitled'} ({j.company || 'Unknown'})
                  </option>
                ))}
              </select>
            )}
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
              <div>
                <p className="text-sm font-medium text-text">Match Score</p>
                <p className="text-xs text-muted">Derived from unified 35/20/20/15/10 ATS formula</p>
              </div>
            </div>

            {result.breakdown && (
              <div className="space-y-2 bg-panel2/40 border border-hairline/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted font-mono uppercase tracking-wider">Formula Breakdown</p>
                  <span className="text-[10px] font-mono text-faint">35 / 20 / 20 / 15 / 10</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1 bg-panel/60 border border-hairline/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text">JD Skill & Keyword Match (35%)</span>
                      <span className="text-xs font-bold font-mono text-signal">{result.breakdown.keywordSkillMatch?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${result.breakdown.keywordSkillMatch?.score || 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1 bg-panel/60 border border-hairline/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text">Parseability & Formatting (20%)</span>
                      <span className="text-xs font-bold font-mono text-signal">{result.breakdown.formattingParseability?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${result.breakdown.formattingParseability?.score || 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1 bg-panel/60 border border-hairline/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text">Quantified Impact (20%)</span>
                      <span className="text-xs font-bold font-mono text-signal">{result.breakdown.quantifiedImpact?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${result.breakdown.quantifiedImpact?.score || 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1 bg-panel/60 border border-hairline/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text">Section Completeness (15%)</span>
                      <span className="text-xs font-bold font-mono text-signal">{result.breakdown.sectionCompleteness?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${result.breakdown.sectionCompleteness?.score || 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1 bg-panel/60 border border-hairline/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text">Bullet & Language Quality (10%)</span>
                      <span className="text-xs font-bold font-mono text-signal">{result.breakdown.bulletQuality?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${result.breakdown.bulletQuality?.score || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
