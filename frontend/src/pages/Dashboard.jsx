import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  if (s >= 80) return '#5FB8A8';
  if (s >= 55) return '#E8A94B';
  return '#E1685A';
}
function scoreLabel(s) {
  if (s >= 80) return 'Good';
  if (s >= 55) return 'Average';
  return 'Needs Work';
}

/* ──────────────────────────────────────────────────────────────
   Sub-components
─────────────────────────────────────────────────────────────── */

/* Stat pill */
function StatPill({ icon, label, value, color = 'var(--color-muted)' }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-panel2 rounded-2xl px-4 py-3 min-w-[90px]">
      <span style={{ color }} className="text-xl">{icon}</span>
      <span className="text-lg font-display font-bold text-text leading-none">{value}</span>
      <span className="text-[10px] font-mono text-faint uppercase tracking-wider text-center">{label}</span>
    </div>
  );
}

/* Skill tag with level bar */
function SkillTag({ name, level = 3, max = 5, strong }) {
  const pct = (level / max) * 100;
  const color = strong ? '#5FB8A8' : '#E8A94B';
  return (
    <div className="flex items-center gap-2 bg-panel2 rounded-xl px-3 py-2">
      <span className="text-xs font-medium text-text flex-1 truncate">{name}</span>
      <div className="w-14 h-1.5 rounded-full bg-hairline overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* Experience entry */
function ExpEntry({ title, company, period, bullets = [] }) {
  return (
    <div className="relative pl-5 border-l border-hairline pb-4 last:pb-0">
      <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-onair bg-panel" />
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-xs text-onair font-mono mt-0.5">{company}</p>
      <p className="text-xs text-faint mt-0.5">{period}</p>
      {bullets.map((b, i) => (
        <p key={i} className="text-xs text-muted mt-1 leading-relaxed">• {b}</p>
      ))}
    </div>
  );
}

/* Progress ring */
function ProgressRing({ pct = 0, size = 80, stroke = 7, color = '#E8A94B', label }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, pct) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-hairline)" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-sm text-text">{pct}%</span>
        </div>
      </div>
      {label && <span className="text-[10px] text-faint font-mono text-center uppercase">{label}</span>}
    </div>
  );
}

/* Section card */
function Card({ title, icon, children, action, className = '' }) {
  return (
    <div className={`bg-panel border border-hairline rounded-2xl ${className}`}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <p className="text-sm font-semibold text-text">{title}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* Avatar upload */
function AvatarUpload({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="relative group w-20 h-20 cursor-pointer">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-onair/30 to-signal/30 border-2 border-onair/40
        flex items-center justify-center text-2xl font-display font-bold text-text shadow-glow">
        {initials}
      </div>
      <div className="absolute inset-0 rounded-full bg-ink/60 flex items-center justify-center
        opacity-0 group-hover:opacity-100 transition-opacity">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8A94B" strokeWidth="2"
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
            <ProgressRing pct={resumeData.atsScore || 0} size={60} stroke={5} color="#E8A94B" />
            <div>
              <p className="text-xs font-mono text-faint uppercase">ATS Score</p>
              <p className="text-sm text-text font-semibold">v{resumeData.version} — {fmtDate(resumeData.createdAt)}</p>
            </div>
          </div>
          <label className="cursor-pointer text-xs text-muted hover:text-onair border border-hairline hover:border-onair/40
            px-3 py-1.5 rounded-lg transition-colors">
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
            {uploading ? 'Uploading…' : 'Update CV'}
          </label>
        </div>

        {/* Skills from resume */}
        {resumeData.parsed?.skills?.length > 0 && (
          <div>
            <p className="text-xs font-mono text-faint uppercase mb-2">Skills from CV</p>
            <div className="flex flex-wrap gap-1.5">
              {resumeData.parsed.skills.slice(0, 12).map(s => (
                <span key={s} className="text-xs bg-signal/10 text-signal border border-signal/25 rounded-full px-2.5 py-0.5">
                  {s}
                </span>
              ))}
              {resumeData.parsed.skills.length > 12 && (
                <span className="text-xs text-faint px-2">+{resumeData.parsed.skills.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        {/* Experience from resume */}
        {resumeData.parsed?.experience?.length > 0 && (
          <div>
            <p className="text-xs font-mono text-faint uppercase mb-3">Experience</p>
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
            <p className="text-xs font-mono text-faint uppercase mb-2">Missing Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {resumeData.missingKeywords.slice(0, 8).map(k => (
                <span key={k} className="text-xs bg-alert/10 text-alert border border-alert/25 rounded-full px-2.5 py-0.5">
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
    <label className="block border-2 border-dashed border-hairline rounded-xl p-6 text-center cursor-pointer
      hover:border-onair/40 hover:bg-onair/5 transition-all group">
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
      <div className="w-10 h-10 rounded-full bg-panel2 flex items-center justify-center mx-auto mb-3 group-hover:bg-onair/10 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9198AC" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-onair transition-colors">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p className="text-sm text-text font-medium mb-0.5">
        {uploading ? 'Uploading & analysing…' : 'Upload your CV / Resume'}
      </p>
      <p className="text-xs text-faint">PDF or DOCX — we'll parse your skills & experience</p>
      {error && <p className="text-xs text-alert mt-2">{error}</p>}
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
        subject: k.charAt(0).toUpperCase() + k.slice(1),
        score: Math.round(((v || 0) / 10) * 100),
      }))
    : [];

  return (
    <div className="min-h-screen bg-ink">
      {/* ── Top greeting bar ── */}
      <div className="bg-panel border-b border-hairline px-8 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <AvatarUpload name={user?.name} />
            <div>
              <h1 className="font-display font-bold text-xl text-text">
                {user?.name || 'Your Profile'}
              </h1>
              <p className="text-sm text-muted mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
                <span className="text-xs text-faint font-mono">
                  {totalInterviews > 0
                    ? `${totalInterviews} interview${totalInterviews !== 1 ? 's' : ''} completed`
                    : 'No interviews yet'}
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/setup"
            className="flex items-center gap-2 bg-onair text-ink font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-onair2 transition-colors shadow-glow"
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
      {totalInterviews > 0 && (
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex gap-3 flex-wrap">
            <StatPill icon="🎯" label="Interviews" value={totalInterviews} color="#E8A94B" />
            <StatPill icon="📊" label="Avg Score" value={avgScore || '—'} color="#5FB8A8" />
            <StatPill icon="🏆" label="Best Score" value={bestScore || '—'} color="#5FB8A8" />
            <StatPill icon="⚡" label="Weak Areas" value={weakTopics.length || '0'} color="#E1685A" />
            <StatPill icon="💪" label="Strong Areas" value={strongTopics.length || '0'} color="#5FB8A8" />
            {latest && <StatPill icon="📄" label="ATS Score" value={`${latest.atsScore || '—'}`} color="#E8A94B" />}
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-8 pb-10 grid grid-cols-3 gap-5">

        {/* ────── LEFT COLUMN ────── */}
        <div className="col-span-1 space-y-5">

          {/* CV / Resume */}
          <Card title="CV / Resume" icon="📄"
            action={
              latest && (
                <span className="text-xs font-mono text-signal bg-signal/10 px-2 py-0.5 rounded-full">
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
        </div>

        {/* ────── MIDDLE COLUMN ────── */}
        <div className="col-span-1 space-y-5">

          {/* Score trend */}
          <Card title="Score Progress" icon="📈">
            {loadingStats && <p className="text-sm text-muted">Loading…</p>}
            {!loadingStats && (!stats || stats.totalSessions === 0) && (
              <div className="text-center py-6">
                <p className="text-sm text-muted mb-1">No sessions yet</p>
                <p className="text-xs text-faint">Complete interviews to see your progress</p>
              </div>
            )}
            {stats?.scoreTrend?.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.scoreTrend.map(d => ({
                  ...d,
                  date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                }))}>
                  <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="var(--color-faint)" fontSize={10} tick={{ fill: 'var(--color-faint)' }} />
                  <YAxis stroke="var(--color-faint)" fontSize={10} domain={[0, 100]} tick={{ fill: 'var(--color-faint)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-panel)', border: '1px solid var(--color-hairline)', borderRadius: '10px', fontSize: 12 }}
                    labelStyle={{ color: 'var(--color-text)' }}
                  />
                  <Line type="monotone" dataKey="overallScore" stroke="#E8A94B" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#E8A94B' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Rubric radar */}
          {radarData.length > 0 && (
            <Card title="Skill Radar" icon="🔬">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-hairline)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#5FB8A8" fill="#5FB8A8" fillOpacity={0.15} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Recent sessions */}
          <Card title="Recent Interviews" icon="🗂"
            action={
              <Link to="/history" className="text-xs text-muted hover:text-onair transition-colors">
                View all →
              </Link>
            }
          >
            {completedSessions.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">No interviews yet</p>
            ) : (
              <div className="space-y-2">
                {completedSessions.slice(0, 4).map(s => {
                  const sc = s.overallScore || 0;
                  const color = scoreColor(sc);
                  return (
                    <Link key={s._id} to={`/interview/${s._id}/report`}
                      className="flex items-center justify-between bg-panel2 rounded-xl px-3 py-2.5
                        hover:border-onair/30 border border-transparent transition-all">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text truncate capitalize">
                          {(s.type || '').replace(/_/g, ' ')} · {(s.persona || '').replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-faint font-mono mt-0.5">{fmtDate(s.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="font-display font-bold text-sm" style={{ color }}>{sc}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{ background: color + '22', color }}>
                          {scoreLabel(sc)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ────── RIGHT COLUMN ────── */}
        <div className="col-span-1 space-y-5">

          {/* Performance rings */}
          {totalInterviews > 0 && (
            <Card title="Performance Overview" icon="🏅">
              <div className="flex justify-around py-2">
                <ProgressRing pct={avgScore} color="#E8A94B" label="Avg Score" />
                <ProgressRing
                  pct={Math.round((completedSessions.filter(s => (s.overallScore || 0) >= 80).length / totalInterviews) * 100)}
                  color="#5FB8A8" label="Good Rate"
                />
                <ProgressRing
                  pct={Math.min(100, Math.round((totalInterviews / 10) * 100))}
                  color="#9198AC" label="vs Target"
                />
              </div>

              {/* Dim averages grid */}
              {stats?.dimAverages && Object.keys(stats.dimAverages).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Object.entries(stats.dimAverages).map(([dim, val]) => {
                    const pct = Math.round(((val || 0) / 10) * 100);
                    const color = scoreColor(pct);
                    return (
                      <div key={dim} className="bg-panel2 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-mono text-faint uppercase mb-1">{dim}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-hairline rounded-full overflow-hidden">
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
              <Link to="/growth" className="text-xs text-muted hover:text-alert transition-colors">
                Learning plan →
              </Link>
            }
          >
            {weakTopics.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted">No weak areas tracked yet</p>
                <p className="text-xs text-faint mt-1">Weak topics appear after completed interviews</p>
              </div>
            ) : (
              <div className="space-y-2">
                {weakTopics.slice(0, 6).map((t, i) => {
                  const barW = Math.min(100, (t.occurrences / (weakTopics[0]?.occurrences || 1)) * 100);
                  return (
                    <div key={t.topic} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text">{t.topic}</span>
                        <span className="text-xs font-mono text-alert">×{t.occurrences}</span>
                      </div>
                      <div className="h-1 bg-hairline rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-alert/60 transition-all duration-700"
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
                  <span key={t} className="text-xs bg-signal/10 text-signal border border-signal/25 rounded-full px-2.5 py-1 capitalize">
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
                  <span className="text-muted">Total time practiced</span>
                  <span className="text-text font-semibold">
                    ~{Math.round(totalInterviews * 12)} min
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Questions answered</span>
                  <span className="text-text font-semibold">
                    {completedSessions.reduce((a, s) => a + (s.questions?.length || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Last interview</span>
                  <span className="text-text font-semibold">
                    {fmtDate(completedSessions[0]?.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Improvement</span>
                  <span className="font-semibold" style={{
                    color: completedSessions.length >= 2
                      ? scoreColor((completedSessions[0]?.overallScore || 0) - (completedSessions[completedSessions.length - 1]?.overallScore || 0) + 50)
                      : 'var(--color-muted)'
                  }}>
                    {completedSessions.length >= 2
                      ? `${(completedSessions[0]?.overallScore || 0) - (completedSessions[completedSessions.length - 1]?.overallScore || 0) >= 0 ? '+' : ''}${(completedSessions[0]?.overallScore || 0) - (completedSessions[completedSessions.length - 1]?.overallScore || 0)} pts`
                      : '—'}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Empty state (no interviews, no resume) ── */}
      {totalInterviews === 0 && !latest && (
        <div className="max-w-7xl mx-auto px-8 pb-10">
          <div className="bg-panel border border-hairline rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-onair/10 border border-onair/20 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8A94B" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 className="font-display font-bold text-xl text-text mb-2">Build your profile</h2>
            <p className="text-muted text-sm max-w-sm mx-auto mb-6">
              Upload your resume to populate your skills & experience, then run your first interview to start tracking your progress.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/resume"
                className="px-5 py-2.5 border border-hairline text-sm text-muted rounded-xl hover:text-text hover:border-onair/40 transition-colors">
                Upload Resume
              </Link>
              <Link to="/setup"
                className="px-5 py-2.5 bg-onair text-ink text-sm font-semibold rounded-xl hover:bg-onair2 transition-colors shadow-glow">
                Start First Interview
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
