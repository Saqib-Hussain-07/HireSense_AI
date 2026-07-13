import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

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

const IconReport = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
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

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconHelp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
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

/* Sun icon for light mode */
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

/* Moon icon for dark mode */
const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

/* ── Nav items ─────────────────────────────────────────────────────────── */
const NAV_MAIN = [
  { to: '/dashboard', label: 'Dashboard',    icon: IconDashboard },
  { to: '/setup',     label: 'New Interview',icon: IconInterview  },
  { to: '/history',   label: 'Reports',      icon: IconReport    },
  { to: '/growth',    label: 'Growth',       icon: IconGrowth    },
];

const NAV_SECONDARY = [
  { to: '/resume',            label: 'Profile',  icon: IconProfile  },
  { to: '/company-questions', label: 'Help',     icon: IconHelp     },
  { to: '/packs',             label: 'Settings', icon: IconSettings },
];

/* ── Logo icon ─────────────────────────────────────────────────────────── */
function LogoIcon() {
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(232,169,75,0.12)', border: '1.5px solid rgba(232,169,75,0.4)' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#E8A94B" strokeWidth="1.5"/>
        <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="#E8A94B" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="2" fill="#E8A94B"/>
      </svg>
    </div>
  );
}

/* ── Nav item — uses sidebar-specific CSS vars ──────────────────────────── */
function NavItem({ item, expanded }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={!expanded ? item.label : undefined}
      className={({ isActive }) =>
        `relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
          isActive
            ? 'border-[rgba(232,169,75,0.3)] bg-[rgba(232,169,75,0.12)] text-[#E8A94B]'
            : 'border-transparent'
        }`
      }
      style={({ isActive }) => ({
        color:      isActive ? '#E8A94B' : 'var(--color-sidebar-muted)',
        background: isActive ? 'rgba(232,169,75,0.10)' : 'transparent',
      })}
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#E8A94B] rounded-full" />
          )}

          <span className="flex-shrink-0 transition-colors" style={{ color: isActive ? '#E8A94B' : 'var(--color-sidebar-muted)' }}>
            <Icon />
          </span>

          {/* Label */}
          <span
            className="whitespace-nowrap transition-all duration-300"
            style={{
              maxWidth: expanded ? '160px' : '0px',
              opacity:  expanded ? 1 : 0,
              overflow: 'hidden',
              color: isActive ? '#E8A94B' : 'var(--color-sidebar-text)',
            }}
          >
            {item.label}
          </span>

          {/* Tooltip when collapsed */}
          {!expanded && (
            <span
              className="pointer-events-none absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl"
              style={{
                background:  'var(--color-sidebar)',
                border:      '1px solid var(--color-sidebar-border)',
                color:       'var(--color-sidebar-text)',
              }}
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
  const { user, logout }  = useAuth();
  const navigate          = useNavigate();
  const { isDark, toggle } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="h-screen overflow-hidden flex bg-ink transition-colors duration-250">

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
            background:  'var(--color-sidebar)',
            borderRight: '1px solid var(--color-sidebar-border)',
            transition:  'background 0.25s ease, border-color 0.25s ease',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 pt-5 pb-4">
            <LogoIcon />
            <span
              className="font-display font-bold text-base tracking-tight whitespace-nowrap transition-all duration-300"
              style={{
                maxWidth: expanded ? '140px' : '0px',
                opacity:  expanded ? 1 : 0,
                overflow: 'hidden',
                color:    'var(--color-sidebar-text)',
              }}
            >
              HireSense
            </span>
          </div>

          {/* Menu label / hamburger */}
          <div className="px-3 mb-2">
            <span
              className="block text-xs font-mono uppercase tracking-widest whitespace-nowrap transition-all duration-300"
              style={{
                maxWidth: expanded ? '140px' : '0px',
                opacity:  expanded ? 1 : 0,
                overflow: 'hidden',
                color:    'var(--color-sidebar-faint)',
              }}
            >
              Menu
            </span>
            {!expanded && (
              <span className="block text-xs font-mono uppercase tracking-widest text-center"
                style={{ color: 'var(--color-sidebar-faint)' }}>
                ☰
              </span>
            )}
          </div>

          {/* Main nav */}
          <nav className="flex-1 px-2 space-y-1 overflow-visible">
            {NAV_MAIN.map(item => (
              <NavItem key={item.to} item={item} expanded={expanded} />
            ))}

            <div className="my-3 mx-1 h-px" style={{ background: 'var(--color-sidebar-border)' }} />

            {NAV_SECONDARY.map(item => (
              <NavItem key={item.to} item={item} expanded={expanded} />
            ))}
          </nav>

          {/* Bottom controls */}
          <div className="px-2 pb-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent"
              style={{ color: 'var(--color-sidebar-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-sidebar-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="flex-shrink-0 transition-transform duration-500"
                style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)', color: 'var(--color-sidebar-muted)' }}>
                {isDark ? <IconSun /> : <IconMoon />}
              </span>
              <span
                className="text-sm font-medium whitespace-nowrap transition-all duration-300"
                style={{
                  maxWidth: expanded ? '160px' : '0px',
                  opacity:  expanded ? 1 : 0,
                  overflow: 'hidden',
                  color:    'var(--color-sidebar-text)',
                }}
              >
                {isDark ? 'Light mode' : 'Dark mode'}
              </span>
              {!expanded && (
                <span
                  className="pointer-events-none absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl"
                  style={{
                    background: 'var(--color-sidebar)',
                    border:     '1px solid var(--color-sidebar-border)',
                    color:      'var(--color-sidebar-text)',
                  }}
                >
                  {isDark ? 'Light mode' : 'Dark mode'}
                </span>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={() => { logout(); navigate('/'); }}
              title={!expanded ? 'Sign out' : undefined}
              className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent"
              style={{ color: 'var(--color-sidebar-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,104,90,0.1)'; e.currentTarget.style.color = '#E1685A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-sidebar-muted)'; }}
            >
              <span className="flex-shrink-0">
                <IconLogout />
              </span>
              <span
                className="text-sm font-medium whitespace-nowrap transition-all duration-300"
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
                  className="pointer-events-none absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl"
                  style={{
                    background: 'var(--color-sidebar)',
                    border:     '1px solid var(--color-sidebar-border)',
                    color:      'var(--color-sidebar-text)',
                  }}
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
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
          style={{
            background:  'var(--color-sidebar)',
            border:      '1px solid var(--color-sidebar-border)',
            color:       'var(--color-sidebar-muted)',
            zIndex:      50,
          }}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,169,75,0.5)'; e.currentTarget.style.color = '#E8A94B'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-sidebar-border)'; e.currentTarget.style.color = 'var(--color-sidebar-muted)'; }}
        >
          <span style={{ display: 'inline-flex', transition: 'transform 0.3s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <IconChevronRight />
          </span>
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 h-full overflow-y-auto bg-ink transition-colors duration-250">
        {children}
      </main>
    </div>
  );
}
