import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function ResumePage() {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: versions } = useQuery({ queryKey: ['resumeVersions'], queryFn: api.getResumeVersions });
  const latest = versions?.[0];

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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted font-mono">version {latest.version}</p>
              <div className="text-right">
                <p className="text-3xl font-display font-semibold text-onair">{latest.atsScore}</p>
                <p className="text-xs text-faint">ATS score</p>
              </div>
            </div>

            {latest.missingKeywords?.length > 0 && (
              <div>
                <p className="text-xs text-muted font-mono mb-2 uppercase">Missing keywords</p>
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
                <p className="text-xs text-muted font-mono mb-2 uppercase">Suggested rewrites</p>
                <div className="space-y-3">
                  {latest.weakBullets.map((b, i) => (
                    <div key={i} className="text-sm">
                      <p className="text-faint line-through">{b.original}</p>
                      <p className="text-signal">{b.suggested}</p>
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
