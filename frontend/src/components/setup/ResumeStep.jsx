import React from 'react';
import DropZone from './DropZone.jsx';

export default function ResumeStep({
  resume,
  uploadingResume,
  onFile,
  onContinue,
  onGoToDashboard,
}) {
  return (
    <div className="bg-panel border border-hairline rounded-2xl p-7">
      <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 01</p>
      <h2 className="font-display font-semibold text-xl mb-1">Upload your CV / Resume</h2>
      <p className="text-sm text-muted mb-6">
        We'll extract your skills, experience, and profile — takes about 5 seconds.
      </p>

      <DropZone
        onFile={onFile}
        accept=".pdf"
        busy={uploadingResume}
        label="Drop your CV here, or click to browse"
        sublabel="PDF format only · Max 10 MB"
        accepted={
          resume
            ? `✓ ${resume.rawText ? resume.rawText.slice(0, 40) + '…' : 'Resume uploaded'}`
            : null
        }
      />

      {resume && (
        <div className="mt-5 bg-signal/10 border border-signal/25 rounded-xl p-4 animate-tick">
          <p className="text-sm font-medium text-signal mb-2">✓ CV parsed successfully</p>
          <div className="flex flex-wrap gap-1.5">
            {(resume.parsed?.skills || []).slice(0, 6).map((s) => (
              <span
                key={s}
                className="text-xs bg-panel2 border border-hairline rounded-full px-2.5 py-1 text-muted"
              >
                {s}
              </span>
            ))}
            {resume.atsScore !== undefined && (
              <span className="text-xs bg-onair/10 border border-onair/25 rounded-full px-2.5 py-1 text-onair">
                ATS Score: {resume.atsScore}
              </span>
            )}
          </div>
          <button
            onClick={onContinue}
            className="mt-5 w-full bg-onair text-ink font-medium rounded-full py-3 text-sm hover:bg-onair2 transition-colors shadow-glow"
          >
            Continue to Job Description →
          </button>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-center gap-2">
        <span className="text-xs text-faint">Already set up?</span>
        <button
          onClick={onGoToDashboard}
          className="text-xs text-onair hover:text-onair2 transition-colors font-medium flex items-center gap-1"
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
