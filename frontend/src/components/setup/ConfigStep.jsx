import React from 'react';
import { INTERVIEW_MODES, COMMON_OPTIONS } from './setupConstants';

function Chip({ active, onClick, children }) {
  const base =
    'text-xs rounded-full px-3 py-1.5 border transition-all duration-150 cursor-pointer select-none';
  const activeClass = 'bg-onair text-ink border-onair';
  const inactiveClass =
    'bg-panel2 text-muted border-hairline hover:text-text hover:border-hairline/80';
  return (
    <button onClick={onClick} className={`${base} ${active ? activeClass : inactiveClass}`}>
      {children}
    </button>
  );
}

function SubOptionRow({ label, options, selected, onSelect }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-mono text-faint uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip key={opt} active={selected === opt} onClick={() => onSelect(opt)}>
            {opt}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function ConfigStep({
  modeId,
  setModeId,
  subSelections,
  setSubSelections,
  commonSelections,
  setCommonSelections,
  showConfirm,
  setShowConfirm,
  starting,
  error,
  jd,
  step,
  onBackToReport,
  onStart,
}) {
  const selectedMode = INTERVIEW_MODES.find((m) => m.id === modeId);

  if (showConfirm) {
    return (
      <div className="bg-panel border border-hairline rounded-2xl p-7">
        <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Confirm & Start</p>
        <h2 className="font-display font-semibold text-xl mb-6">Your interview is configured</h2>

        <div className="space-y-3 mb-7">
          {[
            { label: 'Mode', value: `${selectedMode?.label} — ${selectedMode?.subtitle}` },
            { label: 'CV', value: 'Uploaded ✓', color: 'text-signal' },
            {
              label: 'Job Description',
              value: jd ? `${jd.requiredSkills?.length || 0} required skills extracted ✓` : 'Loaded',
              color: 'text-signal',
            },
            {
              label: 'Round config',
              value:
                selectedMode?.id === 'smart'
                  ? 'Technical R1 + HR Round'
                  : selectedMode?.subtitle,
            },
            { label: 'Session length', value: commonSelections.length },
            {
              label: 'Coaching mode',
              value: commonSelections.coaching.startsWith('On')
                ? 'On — coaching hints enabled'
                : 'Off — full interview pressure',
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between text-sm border-b border-hairline pb-2 last:border-0"
            >
              <p className="text-muted">{row.label}</p>
              <p className={`font-medium ${row.color || 'text-text'}`}>{row.value}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-alert mb-4">{error}</p>}

        <button
          onClick={onStart}
          disabled={starting}
          className="w-full bg-onair text-ink font-medium rounded-full py-3.5 text-sm hover:bg-onair2 transition-colors disabled:opacity-50 shadow-glow flex items-center justify-center gap-2"
        >
          {starting ? (
            <>
              <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
              Preparing your interviewer…
            </>
          ) : (
            "I'm ready — start the interview →"
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="mt-3 w-full text-xs text-faint hover:text-muted py-2 transition-colors"
        >
          ← Adjust settings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-panel border border-hairline rounded-2xl p-7">
        <p className="text-xs font-mono text-onair uppercase tracking-wider mb-1">Step 05</p>
        <h2 className="font-display font-semibold text-xl mb-1">Configure your interview</h2>
        <p className="text-sm text-muted mb-7">Choose a primary mode — sub-options appear below your selection.</p>

        {/* 2×2 Mode grid */}
        <div className="grid grid-cols-2 gap-3 mb-7">
          {INTERVIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setModeId(mode.id);
                setSubSelections({});
              }}
              className={`mode-card text-left p-5 rounded-xl border relative transition-all ${
                modeId === mode.id
                  ? `mode-card-active ${mode.borderColor}`
                  : 'border-hairline bg-panel2'
              }`}
            >
              {mode.recommended && (
                <span className="absolute top-2.5 right-2.5 text-xs bg-onair text-ink rounded-full px-2 py-0.5 font-mono">
                  ★ Recommended
                </span>
              )}
              <p className={`text-2xl mb-1 ${mode.color}`}>{mode.icon}</p>
              <p className="font-display font-semibold text-text text-base">{mode.label}</p>
              <p className="text-xs text-muted mb-3">{mode.subtitle}</p>
              <div className="flex flex-wrap gap-1.5">
                {mode.chips.map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-panel border border-hairline rounded-full px-2 py-0.5 text-faint"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Selected mode detail + sub-options */}
        {selectedMode && (
          <div className="border border-hairline/60 rounded-xl p-5 bg-panel2/50">
            <p className="text-sm text-muted leading-relaxed mb-5">{selectedMode.desc}</p>

            {/* SMART: show two-round structure */}
            {selectedMode.id === 'smart' && (
              <div className="mb-5 grid grid-cols-2 gap-3">
                {[
                  {
                    label: '① Technical Round 1',
                    sub: 'CV-seeded depth questions · ~20 questions',
                    color: 'border-onair/30 bg-onair/5',
                  },
                  {
                    label: '② HR Round',
                    sub: 'Behavioural · STAR · culture fit · ~10 questions',
                    color: 'border-signal/30 bg-signal/5',
                  },
                ].map((r) => (
                  <div key={r.label} className={`rounded-xl border p-4 ${r.color}`}>
                    <p className="text-xs font-medium text-text mb-1">{r.label}</p>
                    <p className="text-xs text-muted leading-snug">{r.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-option chips */}
            {Object.entries(selectedMode.subOptions).map(([key, { label, options }]) => (
              <SubOptionRow
                key={key}
                label={label}
                options={options}
                selected={subSelections[key] || options[0]}
                onSelect={(val) => setSubSelections((prev) => ({ ...prev, [key]: val }))}
              />
            ))}

            <div className="border-t border-hairline mt-4 pt-4">
              <p className="text-xs font-mono text-faint uppercase tracking-wider mb-3">
                Common options
              </p>
              {Object.entries(COMMON_OPTIONS).map(([key, { label, options }]) => (
                <SubOptionRow
                  key={key}
                  label={label}
                  options={options}
                  selected={commonSelections[key] || options[0]}
                  onSelect={(val) => setCommonSelections((prev) => ({ ...prev, [key]: val }))}
                />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          className="mt-6 w-full bg-onair text-ink font-medium rounded-full py-3.5 text-sm hover:bg-onair2 transition-colors shadow-glow"
        >
          Review & Confirm →
        </button>
        {step > 1 && (
          <button
            onClick={onBackToReport}
            className="mt-2 w-full text-xs text-faint hover:text-muted py-2 transition-colors"
          >
            ← Back to report
          </button>
        )}
      </div>
    </div>
  );
}
