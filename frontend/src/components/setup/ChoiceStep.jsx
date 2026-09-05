import React from 'react';

export default function ChoiceStep({ onFreshStart, onContinue, fetchingLatest }) {
  return (
    <div className="bg-[#0a0a0a]/60 border border-white/5 rounded-2xl p-8 space-y-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_70%)] pointer-events-none" />

      <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-mono text-white/70 uppercase tracking-wider">New Interview Setup</span>
      </div>

      <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">Choose your setup method</h2>
      <p className="text-zinc-400 text-sm max-w-md mx-auto font-body">
        Upload a new resume and job details, or quickly start an interview using your existing profile.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 relative z-10">
        <button
          onClick={onFreshStart}
          className="flex flex-col items-center justify-center p-6 bg-[#0a0a0a]/80 border border-white/5 hover:border-white/20 rounded-xl hover:bg-white/[0.01] transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <span className="text-3xl mb-3 filter grayscale group-hover:grayscale-0 transition-all duration-300">🌱</span>
          <span className="font-semibold text-white">Fresh Start</span>
          <span className="text-xs text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
            Upload a new CV and Job Description to begin
          </span>
        </button>

        <button
          onClick={onContinue}
          disabled={fetchingLatest}
          className="flex flex-col items-center justify-center p-6 bg-[#0a0a0a]/80 border border-white/5 hover:border-white/20 rounded-xl hover:bg-white/[0.01] transition-all hover:scale-[1.02] active:scale-[0.98] group disabled:opacity-50"
        >
          <span className="text-3xl mb-3 filter grayscale group-hover:grayscale-0 transition-all duration-300">⚡</span>
          <span className="font-semibold text-white">
            {fetchingLatest ? 'Retrieving CV/JD...' : 'Continue'}
          </span>
          <span className="text-xs text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
            Start directly with your previously uploaded CV & JD
          </span>
        </button>
      </div>
    </div>
  );
}
