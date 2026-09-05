import React from 'react';
import { ANALYSIS_STEPS } from './setupConstants';

export default function AnalysisProgressStep({ analysisSteps }) {
  return (
    <div className="bg-panel border border-hairline rounded-2xl p-7">
      <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 03</p>
      <h2 className="font-display font-semibold text-xl mb-1">Analysing your profile…</h2>
      <p className="text-sm text-muted mb-7">Mapping your CV against the role. This takes a few seconds.</p>
      <div className="space-y-4">
        {ANALYSIS_STEPS.map(({ id, label }) => {
          const done = !!analysisSteps[id];
          return (
            <div key={id} className="flex items-center gap-4">
              <div
                className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                  done ? 'bg-signal text-ink' : 'border border-hairline bg-panel2'
                }`}
              >
                {done && <span className="text-xs animate-tick">✓</span>}
              </div>
              <p className={`text-sm transition-colors duration-300 ${done ? 'text-text' : 'text-muted'}`}>
                {label}
              </p>
              {!done && (
                <span className="ml-auto text-xs text-faint font-mono">
                  {Object.values(analysisSteps).length > 0 ? 'running…' : 'pending'}
                </span>
              )}
              {done && <span className="ml-auto text-xs text-signal font-mono">✓ complete</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
