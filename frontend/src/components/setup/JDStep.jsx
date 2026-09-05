import React from 'react';
import DropZone from './DropZone.jsx';

export default function JDStep({
  jdTab,
  setJdTab,
  jdText,
  setJdText,
  jdUrl,
  setJdUrl,
  jdFile,
  setJdFile,
  jd,
  analyzingJd,
  jdReady,
  onAnalyze,
  onBack,
  onError,
}) {
  return (
    <div className="bg-panel border border-hairline rounded-2xl p-7">
      <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 02</p>
      <h2 className="font-display font-semibold text-xl mb-1">Add the Job Description</h2>
      <p className="text-sm text-muted mb-6">
        Paste the text, upload the PDF, or provide the job posting URL.
      </p>

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
            className={`text-xs rounded-full px-3.5 py-2 border transition-colors ${
              jdTab === t.id
                ? 'bg-onair text-ink border-onair'
                : 'bg-panel2 text-muted border-hairline hover:text-text'
            }`}
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
              onError('Please upload a PDF file.');
              return;
            }
            onError('');
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
              <span
                key={s}
                className="text-xs bg-panel2 border border-hairline rounded-full px-2.5 py-1 text-muted"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={analyzingJd || !jdReady}
        className="mt-5 w-full bg-onair text-ink font-medium rounded-full py-3 text-sm hover:bg-onair2 transition-colors disabled:opacity-40 shadow-glow flex items-center justify-center gap-2"
      >
        {analyzingJd ? (
          <>
            <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
            Extracting & analysing…
          </>
        ) : (
          '→ Analyse Job Description'
        )}
      </button>

      <button
        onClick={onBack}
        className="mt-3 w-full text-xs text-faint hover:text-muted transition-colors py-2"
      >
        ← Back to CV upload
      </button>
    </div>
  );
}
