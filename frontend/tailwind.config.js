/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // All colors reference CSS custom properties so light/dark mode
        // is driven purely by toggling a class on <html>.
        ink:     'var(--color-ink)',
        panel:   'var(--color-panel)',
        panel2:  'var(--color-panel2)',
        hairline:'var(--color-hairline)',
        onair:   '#E8A94B',   // amber accent — stays constant in both modes
        onair2:  '#F4C583',
        signal:  '#5FB8A8',   // teal — stays constant
        alert:   '#E1685A',   // red — stays constant
        text:    'var(--color-text)',
        muted:   'var(--color-muted)',
        faint:   'var(--color-faint)',
        sidebar: 'var(--color-sidebar)',
        'sidebar-border': 'var(--color-sidebar-border)',
        'sidebar-text':   'var(--color-sidebar-text)',
        'sidebar-muted':  'var(--color-sidebar-muted)',
        'sidebar-faint':  'var(--color-sidebar-faint)',
        'sidebar-hover':  'var(--color-sidebar-hover)',
        'sidebar-active': 'var(--color-sidebar-active)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        serif:   ['"Playfair Display"', 'serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(232,169,75,0.25), 0 0 24px rgba(232,169,75,0.15)',
      },
    },
  },
  plugins: [],
};
