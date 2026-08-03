import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { CanvasRevealEffect } from './ui/sign-in-flow-1.jsx';

/* ── Icons ─────────────────────────────────────────────────────────────── */
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);

const IconInterview = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
);

const IconProfile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconGrowth = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconGithub = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const IconCompany = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="10" width="20" height="12" rx="2" ry="2" />
    <path d="M12 22V10" />
    <path d="M17 22V14" />
    <path d="M7 22V14" />
    <path d="M4 10V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
  </svg>
);

const IconPacks = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/* ── Nav items ─────────────────────────────────────────────────────────── */
const NAV_MAIN = [
  { to: '/dashboard', label: 'Dashboard',       icon: IconDashboard },
  { to: '/setup',     label: 'New Interview',   icon: IconInterview },
  { to: '/history',   label: 'History',         icon: IconHistory   },
  { to: '/growth',    label: 'Growth Tracker',  icon: IconGrowth    },
];

const NAV_SECONDARY = [
  { to: '/github',            label: 'GitHub Analyzer',  icon: IconGithub   },
  { to: '/company-questions', label: 'Company Qs',       icon: IconCompany  },
  { to: '/packs',             label: 'Question Packs',   icon: IconPacks    },
  { to: '/resume',            label: 'Profile & Resume', icon: IconProfile  },
];

/* ── Logo icon ─────────────────────────────────────────────────────────── */
function LogoIcon() {
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="1.5"/>
        <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="2" fill="#ffffff"/>
      </svg>
    </div>
  );
}

/* ── Nav item ───────────────────────────────────────────────────────────── */
function NavItem({ item, expanded }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={!expanded ? item.label : undefined}
      className={({ isActive }) =>
        `relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
          isActive
            ? 'border-white/10 bg-white/5 text-white shadow-sm'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-full" />
          )}

          <span className="flex-shrink-0 transition-colors">
            <Icon />
          </span>

          {/* Label */}
          <span
            className="whitespace-nowrap transition-all duration-300 font-body"
            style={{
              maxWidth: expanded ? '160px' : '0px',
              opacity:  expanded ? 1 : 0,
              overflow: 'hidden',
            }}
          >
            {item.label}
          </span>

          {/* Tooltip when collapsed */}
          {!expanded && (
            <span
              className="pointer-events-none absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium font-mono bg-black border border-white/10 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl"
            >
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/* ── Shell ─────────────────────────────────────────────────────────────── */
export default function Shell({ children }) {
  const { logout }  = useAuth();
  const navigate          = useNavigate();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="h-screen overflow-hidden flex bg-black text-white transition-colors duration-250">

      {/* ── Sidebar wrapper ── */}
      <div
        className="relative shrink-0 flex h-full z-30"
        style={{
          width:      expanded ? '220px' : '68px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <aside
          className="flex flex-col w-full h-full overflow-hidden"
          style={{
            background:  '#050505',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            transition:  'border-color 0.25s ease',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 pt-5 pb-4">
            <LogoIcon />
            <span
              className="font-display font-bold text-base tracking-tight whitespace-nowrap transition-all duration-300 text-white"
              style={{
                maxWidth: expanded ? '140px' : '0px',
                opacity:  expanded ? 1 : 0,
                overflow: 'hidden',
              }}
            >
              HireSense
            </span>
          </div>

          {/* Menu label / hamburger */}
          <div className="px-3 mb-2">
            <span
              className="block text-xs font-mono uppercase tracking-widest whitespace-nowrap transition-all duration-300 text-zinc-600"
              style={{
                maxWidth: expanded ? '140px' : '0px',
                opacity:  expanded ? 1 : 0,
                overflow: 'hidden',
              }}
            >
              Menu
            </span>
            {!expanded && (
              <span className="block text-xs font-mono uppercase tracking-widest text-center text-zinc-600">
                ☰
              </span>
            )}
          </div>

          {/* Main nav */}
          <nav className="flex-1 px-2 space-y-1 overflow-visible">
            {NAV_MAIN.map(item => (
              <NavItem key={item.to} item={item} expanded={expanded} />
            ))}

            <div className="my-3 mx-1 h-px bg-white/5" />

            {NAV_SECONDARY.map(item => (
              <NavItem key={item.to} item={item} expanded={expanded} />
            ))}
          </nav>

          {/* Bottom controls */}
          <div className="px-2 pb-4 pt-3 space-y-1 border-t border-white/5">
            {/* Logout */}
            <button
              onClick={() => { logout(); navigate('/'); }}
              title={!expanded ? 'Sign out' : undefined}
              className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <span className="flex-shrink-0">
                <IconLogout />
              </span>
              <span
                className="text-sm font-medium whitespace-nowrap transition-all duration-300 font-body"
                style={{
                  maxWidth: expanded ? '160px' : '0px',
                  opacity:  expanded ? 1 : 0,
                  overflow: 'hidden',
                }}
              >
                Sign out
              </span>
              {!expanded && (
                <span
                  className="pointer-events-none absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium font-mono bg-black border border-white/10 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl"
                >
                  Sign out
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* Expand / collapse toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg bg-black text-zinc-400 border border-white/10"
          style={{
            zIndex:      50,
          }}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#a1a1aa'; }}
        >
          <span style={{ display: 'inline-flex', transition: 'transform 0.3s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <IconChevronRight />
          </span>
        </button>
      </div>

      {/* Main content with WebGL Background */}
      <main className="flex-1 h-full overflow-y-auto bg-black text-white relative transition-colors duration-250 z-10">
        
        {/* Canvas reveal WebGL Dot background matching Auth/Landing */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.15)_0%,_rgba(0,0,0,0.95)_100%)]" />
        </div>

        <div className="relative z-10 h-full w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
