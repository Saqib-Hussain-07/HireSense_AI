/* ─── Interview mode definitions ─────────────────────────────────────────── */
export const INTERVIEW_MODES = [
  {
    id: 'easy',
    label: 'Easy',
    subtitle: 'Entry-level warmup',
    icon: '◎',
    color: 'text-signal',
    borderColor: 'border-signal/50',
    bgColor: 'bg-signal/10',
    desc: 'Conversational pacing, open-ended questions. Builds foundational confidence for candidates new to formal interviews.',
    chips: ['Conversational', 'Foundation'],
    backendType: 'behavioral',
    backendDifficulty: 'easy',
    subOptions: {
      focus: { label: 'Focus area', options: ['Intro & Background', 'Motivation & Fit', 'Basic Technical'] },
      persona: { label: 'Persona', options: ['Friendly HR', 'Junior Peer Interviewer'] },
    },
  },
  {
    id: 'medium',
    label: 'Medium',
    subtitle: 'Structured challenge',
    icon: '◈',
    color: 'text-onair',
    borderColor: 'border-onair/50',
    bgColor: 'bg-onair/10',
    desc: 'Balanced competency-based questions. Both CV and JD inform the session. Two-tier follow-ups active.',
    chips: ['Competency-based', 'Mixed format'],
    backendType: 'technical',
    backendDifficulty: 'medium',
    subOptions: {
      format: { label: 'Format', options: ['Behavioural focus', 'Technical focus', 'Balanced'] },
      persona: { label: 'Persona', options: ['Hiring Manager', 'Senior IC', 'Panel — 2 voices'] },
    },
  },
  {
    id: 'fang',
    label: 'FANG',
    subtitle: 'Tier-1 tech standard',
    icon: '◆',
    color: 'text-alert',
    borderColor: 'border-alert/50',
    bgColor: 'bg-alert/10',
    desc: 'Tier-1 tech company rigour. System design, algorithmic reasoning, pushback on debatable claims. No tolerance for surface answers.',
    chips: ['System design', 'Algorithmic'],
    backendType: 'technical',
    backendDifficulty: 'hard',
    subOptions: {
      style: { label: 'Company style', options: ['Google-style', 'Meta-style', 'Amazon LP-heavy', 'Generic Tier-1'] },
      round: { label: 'Round type', options: ['Behavioural / Leadership', 'System Design', 'Coding (verbal)', 'Full loop'] },
      persona: { label: 'Persona', options: ['Staff Engineer', 'Bar-raiser', 'Hiring Committee'] },
    },
  },
  {
    id: 'smart',
    label: 'SMART',
    subtitle: 'Full-stack readiness',
    icon: '★',
    color: 'text-onair2',
    borderColor: 'border-onair/60',
    bgColor: 'bg-onair/8',
    recommended: true,
    desc: 'Two sequential rounds seeded by your CV + JD. Technical R1 probes depth; HR Round probes behavioural fit — connected by your R1 performance.',
    chips: ['Technical R1', 'HR / Behavioral'],
    backendType: 'technical',
    backendDifficulty: 'medium',
    subOptions: {
      r1Depth: { label: 'Technical R1 depth', options: ['Core concepts', 'Applied production', 'Architecture & design'] },
      hrTone: { label: 'HR Round tone', options: ['Warm & Conversational', 'Formal & Pressured'] },
      star: { label: 'STAR enforcement', options: ['STAR enforced', 'Free-form narrative'] },
      persona: { label: 'HR Persona', options: ['HR Partner', 'Culture-fit interviewer', 'VP / Director'] },
    },
  },
];

export const COMMON_OPTIONS = {
  length: { label: 'Session length', options: ['Quick (15 min)', 'Standard (30 min)', 'Full (60 min)'] },
  feedback: { label: 'Feedback depth', options: ['Summary only', 'Full scored report'] },
  coaching: { label: 'Coaching mode', options: ['On — hints on vague answers', 'Off — full interview pressure'] },
};

export const ANALYSIS_STEPS = [
  { id: 'ats', label: 'ATS Compatibility check', delay: 800 },
  { id: 'skills', label: 'Skills & experience matching', delay: 1800 },
  { id: 'strength', label: 'Strength identification', delay: 2800 },
  { id: 'gap', label: 'Gap analysis', delay: 3500 },
  { id: 'score', label: 'Composite scoring', delay: 4200 },
];
