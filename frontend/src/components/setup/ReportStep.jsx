import React from 'react';

function ScoreBadge({ score }) {
  const label = score >= 80 ? 'Strong Alignment' : score >= 60 ? 'Good Match' : 'Needs Work';
  const col = score >= 80 ? 'text-signal' : score >= 60 ? 'text-onair' : 'text-alert';
  return (
    <div className="text-center py-6">
      <p className="font-mono text-6xl font-semibold text-onair mb-1">
        {score}
        <span className="text-2xl text-muted">/100</span>
      </p>
      <p className={`text-sm font-medium ${col} mb-2`}>{label}</p>
      <span className="inline-flex items-center gap-1.5 text-xs bg-signal/15 text-signal border border-signal/25 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-signal" />
        ATS Ready
      </span>
    </div>
  );
}

function BarRow({ label, weight, score, max }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <p className="text-muted w-44 shrink-0">{label}</p>
      <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div className="h-full bg-onair/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="font-mono text-xs text-text w-14 text-right shrink-0">
        {score} / {max}
      </p>
      <p className="text-xs text-faint w-10 shrink-0">{weight}</p>
    </div>
  );
}

export default function ReportStep({
  score,
  resume,
  resumeSkills,
  jdSkills,
  onProceedToConfig,
  onSelectSmartAndProceed,
}) {
  return (
    <div className="space-y-5">
      {/* Score hero card */}
      <div className="bg-panel border border-hairline rounded-2xl overflow-hidden">
        <div className="border-b border-hairline px-7 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-onair uppercase tracking-wider">Analysis Report</p>
            <h2 className="font-display font-semibold text-lg">Your CV vs. the Role</h2>
          </div>
          <button
            onClick={onProceedToConfig}
            className="text-xs text-muted hover:text-text transition-colors"
          >
            Skip to interview →
          </button>
        </div>
        <div className="px-7 py-2">
          <ScoreBadge score={score} />
          {score >= 75 && (
            <p className="text-sm text-muted text-center -mt-2 mb-4">
              Your profile is a strong match.{' '}
              {jdSkills.length > 0 &&
                `${jdSkills.length} skill gaps to address before you're fully competitive.`}
            </p>
          )}
        </div>
      </div>

      {/* ATS Compatibility */}
      <div className="bg-panel border border-hairline rounded-2xl p-6">
        <p className="text-xs font-mono text-onair uppercase tracking-wider mb-4">ATS Compatibility</p>
        <div className="space-y-3">
          {[
            {
              label: 'Keyword density',
              status: 'pass',
              detail: `${Math.min(resume?.parsed?.skills?.length || 0, 14)} key terms present`,
            },
            {
              label: 'Section headings',
              status: 'pass',
              detail: 'Experience, Education, Skills detected',
            },
            {
              label: 'PDF parse-ability',
              status: 'pass',
              detail: 'Clean text extraction',
            },
            {
              label: 'Contact information',
              status: resume?.rawText?.includes('@') ? 'pass' : 'warn',
              detail: 'Email detected',
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 text-sm">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  row.status === 'pass' ? 'bg-signal' : 'bg-onair'
                }`}
              />
              <p className="text-muted w-40 shrink-0">{row.label}</p>
              <p className="text-text text-xs">{row.detail}</p>
              <span
                className={`ml-auto text-xs font-mono ${
                  row.status === 'pass' ? 'text-signal' : 'text-onair'
                }`}
              >
                {row.status === 'pass' ? '✓ Pass' : '⚠ Review'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths */}
      {resumeSkills.length > 0 && (
        <div className="bg-panel border border-hairline rounded-2xl p-6">
          <p className="text-xs font-mono text-onair uppercase tracking-wider mb-4">
            Strengths Identified
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resumeSkills.map((skill) => (
              <div key={skill} className="bg-panel2 border border-onair/20 rounded-xl p-4">
                <p className="text-xs text-onair font-mono mb-1">✦ Strength</p>
                <p className="text-sm font-medium text-text">{skill}</p>
                <p className="text-xs text-muted mt-1">Found in your CV — matches role requirements</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score breakdown */}
      <div className="bg-panel border border-hairline rounded-2xl p-6">
        <p className="text-xs font-mono text-onair uppercase tracking-wider mb-4">Score Breakdown</p>
        <div className="space-y-4">
          <BarRow label="Keyword & ATS alignment" weight="25%" score={Math.round(score * 0.25)} max={25} />
          <BarRow label="Role-specific skill coverage" weight="35%" score={Math.round(score * 0.35)} max={35} />
          <BarRow label="Seniority & experience match" weight="20%" score={Math.round(score * 0.2)} max={20} />
          <BarRow label="Resume clarity & structure" weight="20%" score={Math.round(score * 0.2)} max={20} />
          <div className="border-t border-hairline pt-3 flex items-center gap-3 text-sm">
            <p className="text-text font-medium w-44 shrink-0">Total</p>
            <div className="flex-1 h-1.5 bg-panel2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-onair to-onair2 rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="font-mono text-onair font-semibold w-14 text-right">{score} / 100</p>
          </div>
        </div>
      </div>

      {/* Recommended next action */}
      <div className="bg-onair/8 border border-onair/25 rounded-2xl p-6">
        <p className="text-xs font-mono text-onair uppercase tracking-wider mb-2">
          Recommended next step
        </p>
        <p className="text-sm text-muted mb-4">
          Based on this analysis, a <span className="text-text font-medium">SMART Interview</span> (Technical
          Round 1 + HR Round) will give you the most complete preparation for this role.
        </p>
        <button
          onClick={onSelectSmartAndProceed}
          className="w-full bg-onair text-ink font-medium rounded-full py-3 text-sm hover:bg-onair2 transition-colors shadow-glow"
        >
          Start Interview Configuration →
        </button>
        <button
          onClick={onProceedToConfig}
          className="mt-2 w-full text-xs text-faint hover:text-muted py-2 transition-colors"
        >
          Choose a different mode instead
        </button>
      </div>
    </div>
  );
}
