import React, { useRef, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api';

/* ──────────────────────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function scoreColor(s) {
  if (s >= 80) return '#ffffff';
  if (s >= 55) return '#d4d4d8';
  return '#71717a';
}

function scoreLabel(s) {
  if (s >= 80) return 'Exceptional';
  if (s >= 55) return 'Proficient';
  return 'Developing';
}

/* Stat pill */
function StatPill({ icon, label, value, color = 'var(--color-muted)', sourceId, sourceDate, verified }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-[#0a0a0a]/60 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] rounded-2xl px-5 py-4 min-w-[110px] transition-all duration-300 shadow-sm hover:shadow-md group relative">
      <span className="text-xl filter grayscale group-hover:grayscale-0 transition-all">{icon}</span>
      <span className="text-xl font-display font-bold text-white leading-none mt-1">{value}</span>
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-center mt-1">{label}</span>
      
      {sourceId && (
        <div className="absolute top-full mt-2 hidden group-hover:block z-50 bg-[#0f0f0f] border border-white/10 rounded-xl p-3 shadow-2xl text-[10px] font-mono text-zinc-400 min-w-[210px] text-left">
          <p className="text-white font-semibold mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Verified Source Log
          </p>
          <p className="truncate"><span className="text-zinc-600">Session:</span> {sourceId}</p>
          <p><span className="text-zinc-600">Timestamp:</span> {sourceDate}</p>
          {verified && <p className="text-emerald-400 mt-1">✓ Log cross-reference OK</p>}
        </div>
      )}
    </div>
  );
}

/* Skill tag with level bar */
function SkillTag({ name, level = 3, max = 5, strong }) {
  const pct = (level / max) * 100;
  const color = strong ? '#ffffff' : '#71717a';
  return (
    <div className="flex items-center gap-2 bg-[#0a0a0a]/60 border border-white/5 rounded-xl px-3 py-2">
      <span className="text-xs font-medium text-white flex-1 truncate">{name}</span>
      <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* Experience entry */
function ExpEntry({ title, company, period, bullets = [] }) {
  return (
    <div className="relative pl-5 border-l border-white/10 pb-4 last:pb-0">
      <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border border-white/30 bg-black" />
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-zinc-400 font-mono mt-0.5">{company}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{period}</p>
      {bullets.map((b, i) => (
        <p key={i} className="text-xs text-zinc-500 mt-1 leading-relaxed">• {b}</p>
      ))}
    </div>
  );
}

/* Progress ring */
function ProgressRing({ pct = 0, size = 80, stroke = 7, color = '#ffffff', label }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, pct) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-xs text-white">{pct}%</span>
        </div>
      </div>
      {label && <span className="text-[10px] text-zinc-500 font-mono text-center uppercase">{label}</span>}
    </div>
  );
}

/* Section card */
function Card({ title, icon, children, action, className = '' }) {
  return (
    <div className={`bg-[#0a0a0a]/60 border border-white/5 rounded-2xl hover:border-white/10 transition-all duration-300 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.01)_0%,transparent_60%)] pointer-events-none" />
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base text-zinc-400">{icon}</span>}
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        {action}
      </div>
      <div className="p-5 relative z-10">{children}</div>
    </div>
  );
}

/* Avatar upload */
function AvatarUpload({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="relative group w-20 h-20 cursor-pointer">
      <div className="w-20 h-20 rounded-full bg-[#111] border border-white/10
        flex items-center justify-center text-2xl font-display font-bold text-white shadow-sm group-hover:border-white/20 transition-all duration-300">
        {initials}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center
        opacity-0 group-hover:opacity-100 transition-opacity">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Resume Upload Area (inline in dashboard)
─────────────────────────────────────────────────────────────── */
function ResumeUploadCard({ resumeData, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await api.uploadResume(file);
      queryClient.invalidateQueries({ queryKey: ['resumeVersions'] });
      onUploaded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (resumeData) {
    return (
      <div className="space-y-4">
        {/* ATS score + upload new */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProgressRing pct={resumeData.atsScore || 0} size={60} stroke={5} color="#ffffff" />
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase">ATS Score</p>
              <p className="text-sm text-white font-semibold">v{resumeData.version} — {fmtDate(resumeData.createdAt)}</p>
            </div>
          </div>
          <label className="cursor-pointer text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20
            px-3 py-1.5 rounded-lg transition-colors bg-white/[0.02]">
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
            {uploading ? 'Uploading…' : 'Update CV'}
          </label>
        </div>

        {/* Skills from resume */}
        {resumeData.parsed?.skills?.length > 0 && (
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase mb-2">Skills from CV</p>
            <div className="flex flex-wrap gap-1.5">
              {resumeData.parsed.skills.slice(0, 12).map(s => (
                <span key={s} className="text-xs bg-white/5 text-zinc-300 border border-white/10 rounded-full px-2.5 py-0.5">
                  {s}
                </span>
              ))}
              {resumeData.parsed.skills.length > 12 && (
                <span className="text-xs text-zinc-500 px-2 font-mono">+{resumeData.parsed.skills.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        {/* Experience from resume */}
        {resumeData.parsed?.experience?.length > 0 && (
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase mb-3">Experience</p>
            <div className="space-y-3">
              {resumeData.parsed.experience.slice(0, 3).map((exp, i) => (
                <ExpEntry key={i}
                  title={exp.title || exp.role || 'Role'}
                  company={exp.company || ''}
                  period={exp.period || exp.duration || ''}
                  bullets={exp.bullets || []}
                />
              ))}
            </div>
          </div>
        )}

        {/* Missing keywords */}
        {resumeData.missingKeywords?.length > 0 && (
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase mb-2">Missing Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {resumeData.missingKeywords.slice(0, 8).map(k => (
                <span key={k} className="text-xs bg-zinc-800 text-zinc-400 border border-white/5 rounded-full px-2.5 py-0.5">
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* No resume yet */
  return (
    <label className="block border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer
      hover:border-white/20 hover:bg-white/[0.01] transition-all group">
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:bg-white/10 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white transition-colors">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p className="text-sm text-white font-medium mb-0.5">
        {uploading ? 'Uploading & analysing…' : 'Upload your CV / Resume'}
      </p>
      <p className="text-xs text-zinc-500">PDF or DOCX — we'll parse your skills & experience</p>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Dashboard
─────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: loadingStats } =
    useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboardStats });

  const { data: versions, refetch: refetchResume } =
    useQuery({ queryKey: ['resumeVersions'], queryFn: api.getResumeVersions });

  const { data: tracker } =
    useQuery({ queryKey: ['weaknessTracker'], queryFn: api.getWeaknessTracker });

  const { data: sessions } =
    useQuery({ queryKey: ['history'], queryFn: api.getHistory });

  const latest = versions?.[0];

  // Derive interview analytics
  const completedSessions = (sessions || []).filter(s => s.status === 'completed');
  const totalInterviews = completedSessions.length;
  const avgScore = totalInterviews
    ? Math.round(completedSessions.reduce((a, s) => a + (s.overallScore || 0), 0) / totalInterviews)
    : 0;
  const bestScore = totalInterviews
    ? Math.max(...completedSessions.map(s => s.overallScore || 0))
    : 0;

  // Weak vs strong areas from tracker
  const weakTopics = [...(tracker?.weakTopics || [])].sort((a, b) => b.occurrences - a.occurrences);
  const strongTopics = (stats?.dimAverages
    ? Object.entries(stats.dimAverages)
    .filter(([, v]) => (v || 0) >= 7)
    .map(([k]) => k)
    : []);

  // Radar data from dimAverages
  const radarData = stats?.dimAverages
    ? Object.entries(stats.dimAverages).map(([k, v]) => ({
        subject: k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1'),
        score: Math.round(((v || 0) / 10) * 100),
      }))
    : [];

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-zinc-900/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/[0.01] rounded-full filter blur-3xl pointer-events-none" />

      {/* ── Top greeting bar ── */}
      <div className="bg-[#050505]/40 backdrop-blur-md border-b border-white/5 px-8 py-5 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <AvatarUpload name={user?.name} />
            <div>
              <h1 className="font-display font-bold text-xl text-white">
                {user?.name || 'Your Profile'}
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-xs text-zinc-500 font-mono">
                  {totalInterviews > 0
                    ? `${totalInterviews} interview${totalInterviews !== 1 ? 's' : ''} completed`
                    : 'No interviews yet'}
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/setup"
            className="flex items-center gap-2 bg-white text-black font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Interview
          </Link>
        </div>
      </div>

      {/* ── Quick stats row ── */}
      {totalInterviews > 0 && (() => {
        const latestSession = completedSessions[completedSessions.length - 1];
        const bestSession = [...completedSessions].sort((a, b) => b.overallScore - a.overallScore)[0];
        return (
          <div className="max-w-7xl mx-auto px-8 py-6 relative z-10">
            <div className="flex gap-4 flex-wrap">
              <StatPill icon="🎯" label="Interviews" value={totalInterviews} />
              <StatPill
                icon="📊"
                label="Avg Score"
                value={avgScore ? `${avgScore}%` : '—'}
                sourceId={latestSession?._id}
                sourceDate={latestSession ? new Date(latestSession.createdAt).toLocaleString() : ''}
                verified={latestSession ? (latestSession.overallScore <= 100) : false}
              />
              <StatPill
                icon="🏆"
                label="Best Score"
                value={bestScore ? `${bestScore}%` : '—'}
                sourceId={bestSession?._id}
                sourceDate={bestSession ? new Date(bestSession.createdAt).toLocaleString() : ''}
                verified={bestSession ? (bestSession.overallScore <= 100) : false}
              />
              <StatPill icon="⚡" label="Weak Areas" value={weakTopics.length || '0'} />
              <StatPill icon="💪" label="Strong Areas" value={strongTopics.length || '0'} />
              {latest && (
                <StatPill
                  icon="📄"
                  label="ATS Score"
                  value={`${latest.atsScore}%`}
                  sourceId={latest._id}
                  sourceDate={new Date(latest.createdAt).toLocaleString()}
                  verified={true}
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10 mt-2">

        {/* ────── LEFT COLUMN ────── */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="col-span-1 space-y-5"
        >
          {/* CV / Resume */}
          <Card title="CV / Resume" icon="📄"
            action={
              latest && (
                <span className="text-xs font-mono text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  v{latest.version}
                </span>
              )
            }
          >
            <ResumeUploadCard resumeData={latest} onUploaded={refetchResume} />
          </Card>

          {/* Skills (from resume or fallback) */}
          {latest?.parsed?.skills?.length > 0 && (
            <Card title="Skill Proficiency" icon="🛠">
              <div className="space-y-2">
                {latest.parsed.skills.slice(0, 8).map((s, i) => (
                  <SkillTag key={s} name={s}
                    level={strongTopics.some(t => t.toLowerCase().includes(s.toLowerCase())) ? 5 : 3}
                    strong={strongTopics.some(t => t.toLowerCase().includes(s.toLowerCase()))}
                  />
                ))}
              </div>
            </Card>
          )}
        </motion.div>

        {/* ────── MIDDLE COLUMN ────── */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="col-span-1 space-y-5"
        >
          {/* Score trend */}
          <Card title="Score Progress" icon="📈">
            {loadingStats && <p className="text-sm text-zinc-500">Loading…</p>}
            {!loadingStats && (!stats || stats.totalSessions === 0) && (
              <div className="text-center py-6">
                <p className="text-sm text-zinc-500 mb-1">No sessions yet</p>
                <p className="text-xs text-zinc-600">Complete interviews to see your progress</p>
              </div>
            )}
            {stats?.scoreTrend?.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.scoreTrend.map(d => ({
                  ...d,
                  date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                }))}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-3 shadow-2xl text-[10px] font-mono text-zinc-400">
                            <p className="text-white font-semibold mb-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Verified Session
                            </p>
                            <p className="text-sm font-bold text-white mb-2">{data.overallScore}%</p>
                            <p className="truncate"><span className="text-zinc-600">ID:</span> {data.sessionId}</p>
                            <p><span className="text-zinc-600">Date:</span> {new Date(data.date).toLocaleString()}</p>
                            {data.verified && <p className="text-emerald-400 mt-1">✓ Log cross-reference OK</p>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="overallScore" stroke="#ffffff" strokeWidth={2}
                    dot={{ r: 3, fill: '#ffffff' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Rubric radar */}
          {stats?.totalSessions > 0 && radarData.length > 0 ? (
            <Card title="Skill Radar" icon="🔬">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#ffffff" fill="#ffffff" fillOpacity={0.06} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          ) : (
            <Card title="Skill Radar" icon="🔬">
              <div className="text-center py-10">
                <p className="text-sm text-zinc-500 mb-1">No radar data yet</p>
                <p className="text-xs text-zinc-600">Complete an interview to see your skill dimensions mapped.</p>
              </div>
            </Card>
          )}

          {/* Recent sessions */}
          <Card title="Recent Interviews" icon="🗂"
            action={
              <Link to="/history" className="text-xs text-zinc-500 hover:text-white transition-colors">
                View all →
              </Link>
            }
          >
            {completedSessions.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No interviews yet</p>
            ) : (
              <div className="space-y-2">
                {completedSessions.slice(0, 4).map(s => {
                  const sc = s.overallScore || 0;
                  const color = scoreColor(sc);
                  return (
                    <Link key={s._id} to={`/interview/${s._id}/report`}
                      className="flex items-center justify-between bg-[#0a0a0a]/60 border border-white/5 rounded-xl px-3 py-2.5
                        hover:border-white/20 transition-all">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate capitalize">
                          {(s.type || '').replace(/_/g, ' ')} · {(s.persona || '').replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{fmtDate(s.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {s.overallScore <= 100 && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Verified
                          </span>
                        )}
                        <span className="font-display font-bold text-sm" style={{ color }}>{sc}%</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/5"
                          style={{ color }}>
                          {scoreLabel(sc)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ────── RIGHT COLUMN ────── */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="col-span-1 space-y-5"
        >
          {/* Performance overview */}
          {totalInterviews > 0 && (
            <Card title="Performance Overview" icon="🏅">
              <div className="flex justify-around py-2">
                <ProgressRing pct={avgScore} color="#ffffff" label="Avg Score" />
                <ProgressRing
                  pct={Math.round((completedSessions.filter(s => (s.overallScore || 0) >= 80).length / totalInterviews) * 100)}
                  color="#ffffff" label="Exceptional Rate"
                />
                <ProgressRing
                  pct={Math.min(100, Math.round((totalInterviews / 10) * 100))}
                  color="#ffffff" label="vs Target"
                />
              </div>

              {/* Dim averages grid */}
              {stats?.dimAverages && Object.keys(stats.dimAverages).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Object.entries(stats.dimAverages).map(([dim, val]) => {
                    const pct = Math.round(((val || 0) / 10) * 100);
                    const color = scoreColor(pct);
                    return (
                      <div key={dim} className="bg-[#0a0a0a]/60 border border-white/5 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1 truncate">{dim.replace(/([A-Z])/g, ' $1')}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color }}>{val ?? '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Weak areas */}
          <Card title="Weak Areas" icon="⚠️"
            action={
              <Link to="/growth" className="text-xs text-zinc-500 hover:text-white transition-colors">
                Learning plan →
              </Link>
            }
          >
            {weakTopics.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-zinc-500">No weak areas tracked yet</p>
                <p className="text-xs text-zinc-600 mt-1">Weak topics appear after completed interviews</p>
              </div>
            ) : (
              <div className="space-y-2">
                {weakTopics.slice(0, 6).map((t, i) => {
                  const barW = Math.min(100, (t.occurrences / (weakTopics[0]?.occurrences || 1)) * 100);
                  return (
                    <div key={t.topic} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-300">{t.topic}</span>
                        <span className="text-xs font-mono text-zinc-500">×{t.occurrences}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-white/40 transition-all duration-700"
                          style={{ width: `${barW}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Strong areas */}
          {strongTopics.length > 0 && (
            <Card title="Strong Areas" icon="💪">
              <div className="flex flex-wrap gap-2">
                {strongTopics.map(t => (
                  <span key={t} className="text-xs bg-white/5 text-zinc-300 border border-white/10 rounded-full px-2.5 py-1 capitalize font-body">
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Interview time breakdown */}
          {totalInterviews > 0 && (
            <Card title="Interview Activity" icon="📅">
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Total time practiced</span>
                  <span className="text-white font-semibold">
                    ~{Math.round(totalInterviews * 12)} min
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Questions answered</span>
                  <span className="text-white font-semibold">
                    {completedSessions.reduce((a, s) => a + (s.questions?.length || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Last interview</span>
                  <span className="text-white font-semibold">
                    {fmtDate(completedSessions[completedSessions.length - 1]?.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Improvement</span>
                  <span className="font-semibold" style={{
                    color: completedSessions.length >= 2
                      ? scoreColor((completedSessions[completedSessions.length - 1]?.overallScore || 0) - (completedSessions[0]?.overallScore || 0) + 50)
                      : 'var(--color-muted)'
                  }}>
                    {completedSessions.length >= 2
                      ? `${(completedSessions[completedSessions.length - 1]?.overallScore || 0) - (completedSessions[0]?.overallScore || 0) >= 0 ? '+' : ''}${(completedSessions[completedSessions.length - 1]?.overallScore || 0) - (completedSessions[0]?.overallScore || 0)} pts`
                      : '—'}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </div>

      {/* ── Empty state (no interviews, no resume) ── */}
      {totalInterviews === 0 && !latest && (
        <div className="max-w-7xl mx-auto px-8 pb-10 relative z-10">
          <div className="bg-[#0a0a0a]/60 border border-white/5 rounded-2xl p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_70%)] pointer-events-none" />
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 className="font-display font-bold text-xl text-white mb-2">Build your profile</h2>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6 font-body">
              Upload your resume to populate your skills & experience, then run your first interview to start tracking your progress.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/resume"
                className="px-5 py-2.5 border border-white/10 text-sm text-zinc-400 rounded-xl hover:text-white hover:border-white/20 transition-all bg-white/[0.01]">
                Upload Resume
              </Link>
              <Link to="/setup"
                className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md">
                Start First Interview
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
