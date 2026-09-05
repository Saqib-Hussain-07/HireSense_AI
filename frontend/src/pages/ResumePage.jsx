import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function ResumePage() {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [error, setError] = useState('');
  const [selectedJdId, setSelectedJdId] = useState('');
  const queryClient = useQueryClient();

  const { data: versions } = useQuery({ queryKey: ['resumeVersions'], queryFn: api.getResumeVersions });
  const { data: jds } = useQuery({ queryKey: ['jobDescriptions'], queryFn: api.getJDs });
  const latest = versions?.[0];

  React.useEffect(() => {
    if (latest?.targetJdId) {
      setSelectedJdId(latest.targetJdId);
    } else {
      setSelectedJdId('');
    }
  }, [latest?._id, latest?.targetJdId]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await api.uploadResume(file);
      queryClient.invalidateQueries({ queryKey: ['resumeVersions'] });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleTargetJdChange(newJdId) {
    setSelectedJdId(newJdId);
    if (!latest?._id) return;
    setRescoring(true);
    setError('');
    try {
      await api.rescoreResume({ resumeId: latest._id, jdId: newJdId || null });
      queryClient.invalidateQueries({ queryKey: ['resumeVersions'] });
    } catch (err) {
      setError(err.message);
    } finally {
      setRescoring(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Step 01"
        title="Resume"
        description="Upload a PDF or DOCX. We'll parse it, score it for ATS-friendliness, and suggest bullet rewrites."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <label className="block border border-dashed border-hairline rounded-xl p-8 text-center cursor-pointer hover:border-onair/50 transition-colors bg-panel">
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
          <p className="text-text mb-1">{uploading ? 'Uploading & analyzing…' : 'Click to upload your resume'}</p>
          <p className="text-xs text-faint">PDF or DOCX</p>
        </label>

        {error && <p className="text-sm text-alert">{error}</p>}

        {latest && (
          <div className="bg-panel border border-hairline rounded-xl p-6 space-y-5">
            {/* ── Target JD Selector (Re-score on-demand) ── */}
            <div className="bg-panel2/60 border border-hairline/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-muted uppercase tracking-wider">Evaluation Target</p>
                <p className="text-[11px] text-faint">Re-evaluate against a specific job posting or generic ATS benchmark</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedJdId}
                  disabled={rescoring}
                  onChange={(e) => handleTargetJdChange(e.target.value)}
                  className="bg-panel border border-hairline rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-onair/60 transition-colors"
                >
                  <option value="">Generic ATS Benchmark</option>
                  {jds?.map((jd) => (
                    <option key={jd._id} value={jd._id}>
                      {jd.jobTitle || 'Untitled'}{jd.company ? ` (${jd.company})` : ''}
                    </option>
                  ))}
                </select>
                {rescoring && <span className="text-xs text-onair animate-pulse font-mono">Scoring…</span>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted font-mono">version {latest.version}</p>
              <div className="text-right">
                <p className="text-3xl font-display font-semibold text-onair">{latest.atsScore}</p>
                <p className="text-xs text-faint font-medium">
                  {latest.scoreLabel || (latest.isJdSpecific ? 'JD Match Score' : 'Generic ATS Score')}
                </p>
              </div>
            </div>

            {/* ── ATS Multi-Component Breakdown ── */}
            {latest.atsBreakdown ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted font-mono uppercase tracking-wider">
                    {latest.isJdSpecific ? 'JD Match Breakdown' : 'ATS Score Breakdown'}
                  </p>
                  <span className="text-[10px] font-mono text-faint">35 / 20 / 20 / 15 / 10 Formula</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="space-y-1.5 bg-panel2/60 border border-hairline/60 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text">Keyword & Skill Match</span>
                        <span className="text-[10px] font-mono text-faint bg-panel px-1.5 py-0.5 rounded border border-hairline">35%</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-signal/10 text-signal">Deterministic Code</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-signal">{latest.atsBreakdown.keywordSkillMatch?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal transition-all duration-700" style={{ width: `${latest.atsBreakdown.keywordSkillMatch?.score || 0}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-panel2/60 border border-hairline/60 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text">Parseability & Formatting</span>
                        <span className="text-[10px] font-mono text-faint bg-panel px-1.5 py-0.5 rounded border border-hairline">20%</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-signal/10 text-signal">Deterministic Code</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-signal">{latest.atsBreakdown.formattingParseability?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal transition-all duration-700" style={{ width: `${latest.atsBreakdown.formattingParseability?.score || 0}%` }} />
                    </div>
                    {latest.atsBreakdown.formattingParseability?.issue && (
                      <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg p-2.5 flex items-start gap-2">
                        <span>⚠️</span>
                        <div>
                          <p className="font-semibold text-[11px]">Parseability Alert</p>
                          <p className="text-[11px] opacity-90">{latest.atsBreakdown.formattingParseability.issue}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 bg-panel2/60 border border-hairline/60 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text">Quantified Impact</span>
                        <span className="text-[10px] font-mono text-faint bg-panel px-1.5 py-0.5 rounded border border-hairline">20%</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-signal/10 text-signal">Deterministic Regex</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-signal">{latest.atsBreakdown.quantifiedImpact?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal transition-all duration-700" style={{ width: `${latest.atsBreakdown.quantifiedImpact?.score || 0}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-panel2/60 border border-hairline/60 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text">Section Completeness</span>
                        <span className="text-[10px] font-mono text-faint bg-panel px-1.5 py-0.5 rounded border border-hairline">15%</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-signal/10 text-signal">Deterministic Code</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-signal">{latest.atsBreakdown.sectionCompleteness?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal transition-all duration-700" style={{ width: `${latest.atsBreakdown.sectionCompleteness?.score || 0}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-panel2/60 border border-hairline/60 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text">Bullet & Language Quality</span>
                        <span className="text-[10px] font-mono text-faint bg-panel px-1.5 py-0.5 rounded border border-hairline">10%</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-onair/10 text-onair">LLM Evaluated</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-signal">{latest.atsBreakdown.bulletQuality?.score || 0}/100</span>
                    </div>
                    <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-signal transition-all duration-700" style={{ width: `${latest.atsBreakdown.bulletQuality?.score || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {latest.missingKeywords?.length > 0 && (
              <div>
                <p className="text-xs text-muted font-mono mb-2 uppercase">
                  {latest.isJdSpecific ? 'Missing JD requirements & skills' : 'Missing keywords'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {latest.missingKeywords.map((k) => (
                    <span key={k} className="text-xs bg-panel2 border border-hairline rounded-full px-2.5 py-1 text-muted">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {latest.weakBullets?.length > 0 && (
              <div>
                <p className="text-xs text-muted font-mono mb-2 uppercase">Suggested rewrites & bullet notes</p>
                <div className="space-y-3">
                  {latest.weakBullets.map((b, i) => (
                    <div key={i} className="text-sm bg-panel2/40 border border-hairline/60 rounded-xl p-3 space-y-1.5">
                      <p className="text-faint line-through text-xs">{b.original}</p>
                      <p className="text-signal font-medium">{b.suggested}</p>
                      {b.note && <p className="text-xs text-muted font-sans italic opacity-85">{b.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {latest.parsed?.skills?.length > 0 && (
              <div>
                <p className="text-xs text-muted font-mono mb-2 uppercase">Detected skills</p>
                <div className="flex flex-wrap gap-2">
                  {latest.parsed.skills.map((s) => (
                    <span key={s} className="text-xs bg-signal/10 text-signal border border-signal/30 rounded-full px-2.5 py-1">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
