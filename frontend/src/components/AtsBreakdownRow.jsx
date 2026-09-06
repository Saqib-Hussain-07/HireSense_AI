import React from 'react';

export const ATS_BREAKDOWN_ROWS = [
  { key: 'keywordSkillMatch', label: 'Keyword & Skill Match', weight: 35, source: 'Deterministic Code' },
  { key: 'formattingParseability', label: 'Parseability & Formatting', weight: 20, source: 'Deterministic Code' },
  { key: 'quantifiedImpact', label: 'Quantified Impact', weight: 20, source: 'Deterministic Regex' },
  { key: 'sectionCompleteness', label: 'Section Completeness', weight: 15, source: 'Deterministic Code' },
  { key: 'bulletQuality', label: 'Bullet & Language Quality', weight: 10, source: 'LLM Evaluated' },
];

export function AtsBreakdownRow({ label, weight, source, score = 0, issue }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const isLlm = source === 'LLM Evaluated';

  return (
    <div className="space-y-1.5 bg-panel2/60 border border-hairline/60 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text">{label}</span>
          <span className="text-[10px] font-mono text-faint bg-panel px-1.5 py-0.5 rounded border border-hairline">
            {weight}%
          </span>
          {source && (
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                isLlm ? 'bg-onair/10 text-onair' : 'bg-signal/10 text-signal'
              }`}
            >
              {source}
            </span>
          )}
        </div>
        <span className="text-xs font-bold font-mono text-signal">{safeScore}/100</span>
      </div>
      <div className="h-1.5 bg-panel rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-signal transition-all duration-700"
          style={{ width: `${safeScore}%` }}
        />
      </div>
      {issue && (
        <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg p-2.5 flex items-start gap-2">
          <span>⚠️</span>
          <div>
            <p className="font-semibold text-[11px]">Notice</p>
            <p className="text-[11px] opacity-90">{issue}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AtsBreakdownRow;
