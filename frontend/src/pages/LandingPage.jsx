import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Static data ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-onair">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 3v6h6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Your CV, decoded in seconds',
    desc: 'Upload your resume and the job description. HireSense maps your skills against what the role actually demands — and flags what\'s missing before an interviewer does.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-signal">
        <path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'A real interview. Right now.',
    desc: 'Speak your answers aloud. The AI listens, adapts follow-up questions based on exactly what you said, and challenges weak claims — the same way a senior interviewer would.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-onair">
        <path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.355a3.375 3.375 0 01-3 0M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Know what to fix. Not just that something\'s wrong.',
    desc: 'Every answer is scored on relevance, structure, and clarity. You get exact quotes from your own words, an ideal answer to compare against, and a 7-day improvement plan.',
  },
];

const CHECKLIST = [
  { icon: '📄', text: 'Your CV or Resume in PDF format' },
  { icon: '📋', text: 'The job description (paste text or upload PDF)' },
  { icon: '🎙️', text: 'A quiet space and a working microphone' },
  { icon: '⏱️', text: '15–25 minutes for a full mock interview session' },
];

const STEPS = [
  { n: '01', label: 'Upload your CV + Job Desc', sub: 'PDF or paste text, takes seconds' },
  { n: '02', label: 'We analyse fit & gaps', sub: 'ATS check · skills map · scoring' },
  { n: '03', label: 'Speak your interview aloud', sub: 'Adaptive AI follows your answers' },
  { n: '04', label: 'Get your full report', sub: 'Scores · quotes · ideal answers' },
];

const STATS = [
  { value: 12400, suffix: '+', label: 'Interviews coached' },
  { value: 91, suffix: '%', label: 'Report improved offers' },
  { value: 3.2, suffix: '×', label: 'Higher callback rate', isFloat: true },
];

/* ─── Animated counter hook ─────────────────────────────────────────────── */
function useCounter(target, duration = 1800, isFloat = false) {
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(isFloat ? +(target * eased).toFixed(1) : Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration, isFloat]);

  return { count, ref };
}

/* ─── Stat counter component ────────────────────────────────────────────── */
function StatCounter({ value, suffix, label, isFloat }) {
  const { count, ref } = useCounter(value, 1800, isFloat);
  return (
    <div ref={ref} className="text-center px-8">
      <p className="font-mono text-4xl md:text-5xl text-onair font-semibold tracking-tight">
        {isFloat ? count.toFixed(1) : count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-muted mt-2 font-body">{label}</p>
    </div>
  );
}

/* ─── Animated score card (hero right column) ────────────────────────────── */
function ScoreCard() {
  const [scoreDisplay, setScoreDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 2000;
    const target = 84;
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setScoreDisplay(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="animate-hero-card w-full max-w-sm mx-auto">
      <div className="bg-panel border border-hairline rounded-2xl p-6 shadow-[0_0_60px_rgba(232,169,75,0.08)]">
        {/* File header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-hairline">
          <div className="w-9 h-9 rounded-lg bg-panel2 border border-hairline flex items-center justify-center text-lg flex-shrink-0">📄</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">senior_engineer_cv.pdf</p>
            <p className="text-xs text-muted">→ Senior Frontend Engineer at Stripe</p>
          </div>
        </div>

        {/* Score gauge */}
        <div className="mb-5">
          <div className="flex justify-between items-end mb-2">
            <p className="text-xs text-muted font-mono uppercase tracking-wider">Match Score</p>
            <p className="font-mono text-3xl text-onair font-semibold leading-none">{scoreDisplay}<span className="text-lg text-muted">/100</span></p>
          </div>
          <div className="h-2 bg-panel2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-onair to-onair2 rounded-full animate-gauge"
              style={{ width: `${scoreDisplay}%`, transition: 'width 0.1s linear' }}
            />
          </div>
        </div>

        {/* Chip indicators */}
        <div className="flex flex-wrap gap-2">
          <span className="animate-chip-1 inline-flex items-center gap-1.5 text-xs bg-signal/15 text-signal border border-signal/25 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-signal" />ATS Ready
          </span>
          <span className="animate-chip-2 inline-flex items-center gap-1.5 text-xs bg-onair/10 text-onair border border-onair/20 rounded-full px-2.5 py-1">
            Skills Gap: 2
          </span>
          <span className="animate-chip-3 inline-flex items-center gap-1.5 text-xs bg-panel2 text-muted border border-hairline rounded-full px-2.5 py-1">
            Score: 84 / 100
          </span>
        </div>

        {/* Waveform — voice active indicator */}
        <div className="mt-5 pt-4 border-t border-hairline">
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-6">
              {[3,5,7,5,8,4,6,3].map((h, i) => (
                <span
                  key={i}
                  className="wave-bar w-1 rounded-full bg-signal/70"
                  style={{ height: `${h * 3}px` }}
                />
              ))}
            </div>
            <p className="text-xs text-muted font-mono">Voice interview active</p>
            <span className="ml-auto text-xs text-faint italic">demo preview</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main landing page ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink text-text overflow-x-hidden">

      {/* ── Nav bar ── */}
      <header className="border-b border-hairline/50 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-onair pulse-onair" />
          <span className="font-display font-semibold text-base tracking-tight">HireSense AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="text-sm text-muted hover:text-text transition-colors">Sign in</button>
          <button
            onClick={() => navigate('/signup')}
            className="text-sm bg-onair text-ink font-medium rounded-full px-4 py-2 hover:bg-onair2 transition-colors"
          >
            Get started →
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-6 md:px-12 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-onair/10 border border-onair/20 rounded-full px-3.5 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-onair" />
              <span className="text-xs font-mono text-onair tracking-wider uppercase">AI-Powered Interview Intelligence</span>
            </div>

            <h1 className="font-display font-semibold text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-3">
              Know exactly where
            </h1>
            <h1 className="font-serif italic text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-onair mb-7">
              you stand before the room.
            </h1>

            <p className="text-muted text-lg leading-relaxed max-w-lg mb-10">
              HireSense AI reads your CV, understands the job, and coaches you through
              a real spoken interview — then tells you precisely what to fix.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="cta-signup"
                onClick={() => navigate('/signup')}
                className="bg-onair text-ink font-medium rounded-full px-7 py-3.5 text-sm hover:bg-onair2 transition-colors shadow-glow"
              >
                Analyse My Resume — It's Free →
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-muted hover:text-text transition-colors px-4 py-3.5"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>

          {/* Right: animated score card */}
          <div className="flex justify-center md:justify-end">
            <ScoreCard />
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <section className="border-y border-hairline bg-panel/30 py-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
          {STATS.map((s) => (
            <StatCounter key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* ── Feature triptych ── */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-onair uppercase tracking-widest text-center mb-3">What it does</p>
          <h2 className="font-display font-semibold text-3xl text-center mb-12">Three things. Done exceptionally well.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card bg-panel border border-hairline rounded-2xl p-6">
                <div className="w-11 h-11 rounded-xl bg-panel2 border border-hairline flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <p className="font-display font-semibold text-text mb-3 leading-snug">{f.title}</p>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before you begin card ── */}
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-panel border border-hairline rounded-2xl p-7 border-l-4 border-l-onair/60">
            <p className="text-xs font-mono text-onair uppercase tracking-widest mb-5">✦ What to have ready</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHECKLIST.map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                  <span className="text-sm text-muted leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-faint mt-5 pt-4 border-t border-hairline">That's it. HireSense does the rest.</p>
          </div>
        </div>
      </section>

      {/* ── Process rail ── */}
      <section className="px-6 md:px-12 py-16 border-t border-hairline">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-onair uppercase tracking-widest text-center mb-3">How it works</p>
          <h2 className="font-display font-semibold text-3xl text-center mb-14">Four steps. One honest result.</h2>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.n}>
                <div className="flex flex-col items-center text-center flex-1 px-4">
                  <div className="w-10 h-10 rounded-full bg-onair/10 border border-onair/30 flex items-center justify-center mb-4">
                    <span className="font-mono text-xs text-onair font-semibold">{step.n}</span>
                  </div>
                  <p className="font-medium text-text text-sm mb-1 leading-snug">{step.label}</p>
                  <p className="text-xs text-muted leading-relaxed">{step.sub}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block flex-shrink-0 w-16 text-center">
                    <div className="h-px w-full border-t border-dashed border-onair/30" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="px-6 md:px-12 py-24 border-t border-hairline bg-panel/20 text-center">
        <p className="font-serif italic text-3xl md:text-4xl text-text mb-3 leading-snug">
          "Your next interview is already scheduled.
        </p>
        <p className="font-serif italic text-3xl md:text-4xl text-onair mb-10 leading-snug">
          The question is whether you'll be ready."
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/signup')}
            className="bg-onair text-ink font-medium rounded-full px-8 py-3.5 text-sm hover:bg-onair2 transition-colors shadow-glow"
          >
            Start Your Free Analysis →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-hairline px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-onair" />
          <span className="text-xs text-faint font-mono">HireSense AI</span>
        </div>
        <p className="text-xs text-faint">AI-powered interview coaching</p>
      </footer>

    </div>
  );
}
