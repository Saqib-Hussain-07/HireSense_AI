import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MiniNavbar, CanvasRevealEffect } from '../components/ui/sign-in-flow-1.jsx';

/* ─── Static data ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 3v6h6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'CV & Resume Parser',
    desc: 'Deeply analyzes your resume in PDF/DOCX to score ATS compatibility, profile your skills, and flag missing keywords.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Adaptive Spoken Interviews',
    desc: 'Speak your answers aloud. The AI adapts follow-up questions based on what you said, challenging weak claims realistically.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'GitHub Repo Analyzer',
    desc: 'Input any public repository URL to generate highly specific spoken questions probing your actual understanding of the code.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: '7-Day Growth Planner',
    desc: 'Automatically tracks your weak areas across interview sessions and designs a custom, structured learning plan.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <rect x="2" y="10" width="20" height="12" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22V10M17 22V14M7 22V14M4 10V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Company Questions Bank',
    desc: 'Crowdsourced bank of actual interview questions asked at top companies like Google, Stripe, Meta, and others.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Curated Question Packs',
    desc: 'Practice targeted question pools grouped by core categories (System Design, Frontend, Backend, Behavioral, etc.).',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Visual Skill Radar',
    desc: 'Tracks proficiency metrics on a Recharts-powered radar map and maps chronological score growth over time.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Evidence-Based Reports',
    desc: 'Read exact quotes of where you stumbled, compare with ideal answers, and review speech delivery metrics.',
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
      <div className="bg-[#0a0a0a]/80 border border-white/10 rounded-2xl p-6 shadow-[0_0_50px_rgba(255,255,255,0.03)] backdrop-blur-md relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />
        
        {/* File header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">📄</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">senior_engineer_cv.pdf</p>
            <p className="text-xs text-white/40">→ Senior Frontend Engineer at Stripe</p>
          </div>
        </div>

        {/* Score gauge */}
        <div className="mb-5 relative z-10">
          <div className="flex justify-between items-end mb-2">
            <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Match Score</p>
            <p className="font-mono text-3xl text-white font-semibold leading-none">{scoreDisplay}<span className="text-lg text-white/40">/100</span></p>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-white/60 to-white rounded-full animate-gauge"
              style={{ width: `${scoreDisplay}%`, transition: 'width 0.1s linear' }}
            />
          </div>
        </div>

        {/* Chip indicators */}
        <div className="flex flex-wrap gap-2 relative z-10">
          <span className="animate-chip-1 inline-flex items-center gap-1.5 text-xs bg-white/5 text-white/80 border border-white/10 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />ATS Optimized
          </span>
          <span className="animate-chip-2 inline-flex items-center gap-1.5 text-xs bg-white/5 text-white/80 border border-white/10 rounded-full px-2.5 py-1">
            Skills Gap: 2
          </span>
        </div>

        {/* Waveform — voice active indicator */}
        <div className="mt-5 pt-4 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-6">
              {[3,5,7,5,8,4,6,3].map((h, i) => (
                <span
                  key={i}
                  className="wave-bar w-1 rounded-full bg-white/50"
                  style={{ height: `${h * 3}px` }}
                />
              ))}
            </div>
            <p className="text-xs text-white/40 font-mono">Voice interview active</p>
            <span className="ml-auto text-xs text-white/20 italic">demo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Recreated landing page ─────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-body selection:bg-white/20 selection:text-white">
      
      {/* Floating Glassmorphism Navbar */}
      <MiniNavbar />

      {/* Hero Section with CanvasRevealEffect */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16 px-6 md:px-12">
        {/* WebGL Dot Background with Vignette */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <CanvasRevealEffect
            animationSpeed={3.5}
            containerClassName="bg-black"
            colors={[
              [255, 255, 255],
              [255, 255, 255],
            ]}
            dotSize={5}
            reverse={false}
          />
          {/* Ambient Glow Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-800/10 rounded-full filter blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full filter blur-3xl pointer-events-none animate-pulse duration-[10000ms]" />
          {/* Fades the ThreeJS canvas beautifully towards the bottom */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.15)_0%,_rgba(0,0,0,1)_100%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Heading and copy */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-mono text-white/70 tracking-wider uppercase">
                AI-Powered Interview Coach
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-white">
                Know exactly where
              </h1>
              <h1 className="font-serif italic text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-white/80">
                you stand before the room.
              </h1>
            </div>

            <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-lg font-body">
              HireSense AI reads your CV, understands the role, and coaches you through
              a real adaptive spoken interview — then gives you precise scorecards and metrics to improve.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                id="cta-signup"
                onClick={() => navigate('/signup')}
                className="bg-white text-black font-semibold rounded-full px-8 py-4 text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 group"
              >
                Analyse My Resume — It's Free
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-white/60 hover:text-white transition-colors px-6 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign In
              </button>
            </div>
          </motion.div>

          {/* Right Column: Animated scorecard mock */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-5 flex justify-center lg:justify-end"
          >
            <ScoreCard />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 px-6 md:px-12 py-24 scroll-mt-24">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <p className="text-xs font-mono text-white/50 uppercase tracking-widest">Capabilities</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">A complete, intelligent coaching platform.</h2>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {FEATURES.map((f, i) => (
              <div key={f.title} className="group bg-[#0a0a0a]/60 border border-white/5 hover:border-white/20 hover:bg-white/[0.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.02)] transition-all duration-500 rounded-2xl p-7 space-y-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                  {f.icon}
                </div>
                <div className="space-y-2 relative z-10">
                  <h3 className="font-display font-semibold text-white text-lg">{f.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed font-body">{f.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Checklist section */}
      <section id="checklist" className="relative z-10 px-6 md:px-12 pb-24 scroll-mt-24">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-[#0a0a0a]/60 border border-white/10 hover:border-white/20 rounded-3xl p-8 sm:p-10 space-y-6 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.01)] transition-all duration-500 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.015)_0%,transparent_60%)] pointer-events-none" />
            
            <p className="text-xs font-mono text-white/50 uppercase tracking-widest relative z-10">✦ What to have ready</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 relative z-10">
              {CHECKLIST.map((item) => (
                <div key={item.text} className="flex items-start gap-4">
                  <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                  <span className="text-sm text-white/60 leading-relaxed font-body">{item.text}</span>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-white/30 pt-4 border-t border-white/5 font-mono relative z-10">
              That's it. HireSense does the rest.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Process flow steps */}
      <section id="steps" className="relative z-10 px-6 md:px-12 py-24 border-t border-white/10 scroll-mt-24">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <p className="text-xs font-mono text-white/50 uppercase tracking-widest">Process</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Four steps. One honest outcome.</h2>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col lg:flex-row items-stretch lg:items-start gap-8 lg:gap-0"
          >
            {STEPS.map((step, i) => (
              <React.Fragment key={step.n}>
                <div className="flex flex-col items-center text-center flex-1 px-4 space-y-4 group">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/20 group-hover:border-white/50 group-hover:bg-white/10 transition-all duration-300 flex items-center justify-center shadow-inner">
                    <span className="font-mono text-xs text-white font-semibold">{step.n}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-white text-sm font-display">{step.label}</h4>
                    <p className="text-xs text-white/40 leading-relaxed font-body">{step.sub}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center flex-shrink-0 w-8 h-10">
                    <div className="h-px w-6 border-t border-dashed border-white/20" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 px-6 md:px-12 py-28 border-t border-white/10 bg-gradient-to-b from-transparent to-white/[0.01] text-center space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-3"
        >
          <p className="font-serif italic text-3xl sm:text-4xl text-white/90">
            "Your next interview is already scheduled."
          </p>
          <p className="font-serif italic text-2xl sm:text-3xl text-white/50">
            The question is whether you'll be ready.
          </p>
        </motion.div>
        
        <div className="flex justify-center pt-4">
          <button
            onClick={() => navigate('/signup')}
            className="bg-white text-black font-semibold rounded-full px-8 py-4 text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 group"
          >
            Start Your Free Analysis
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-xs text-white/40 font-mono">HireSense AI</span>
        </div>
        <p className="text-xs text-white/30 font-mono">AI-powered interview coaching · © 2026</p>
      </footer>

    </div>
  );
}
