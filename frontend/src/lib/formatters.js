/**
 * Shared Formatting Utilities
 * ----------------------------
 * Centralizes date, duration, score color, and score label formatting
 * used across Dashboard, SessionReportPage, HistoryPage, and VoiceInterview.
 */

/**
 * Formats a Date object or ISO string into a concise localized date (e.g. "12 Jan 2025").
 * Returns a graceful fallback '—' when the input is null, undefined, or invalid.
 */
export function fmtDate(d, locale = 'en-IN') {
  if (!d) return '—';
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (_e) {
    return '—';
  }
}

/**
 * Formats duration in seconds into a human-readable string (e.g. "2m 15s" or "45s").
 */
export function fmtDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Normalizes a score value to a safe float.
 */
function normalizeScore(s) {
  const num = typeof s === 'number' ? s : parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/**
 * Returns a consistent theme hex color for a given score.
 * Seamlessly handles both 0–10 scales and 0–100 scales.
 *
 * Variants:
 * - 'brand' (default):
 *     >= 80% -> #5FB8A8 (emerald / signal)
 *     >= 55% -> #E8A94B (amber / onair)
 *     <  55% -> #E1685A (rose / alert)
 * - 'monochrome':
 *     >= 80% -> #ffffff
 *     >= 55% -> #d4d4d8
 *     <  55% -> #71717a
 */
export function scoreColor(score, variant = 'brand') {
  const num = normalizeScore(score);
  // Auto-detect whether score is on 0-10 or 0-100 scale
  const normalized = num <= 10 ? num * 10 : num;

  if (variant === 'monochrome') {
    if (normalized >= 80) return '#ffffff';
    if (normalized >= 55) return '#d4d4d8';
    return '#71717a';
  }

  // Brand variant
  if (normalized >= 80) return '#5FB8A8';
  if (normalized >= 55) return '#E8A94B';
  return '#E1685A';
}

/**
 * Returns a human-readable verdict or performance label for a given score.
 * Seamlessly handles both 0–10 scales and 0–100 scales.
 *
 * Variants:
 * - 'verdict' (default): Aligned with backend InterviewSession enum ('Hire' | 'Hold' | 'Pass')
 *     >= 80% -> 'Hire'
 *     >= 60% -> 'Hold'
 *     <  60% -> 'Pass'
 * - 'proficiency': Used for dashboard competency summaries
 *     >= 80% -> 'Exceptional'
 *     >= 55% -> 'Proficient'
 *     <  55% -> 'Developing'
 * - 'rating': Used for in-session real-time feedback
 *     >= 80% -> 'Good'
 *     >= 55% -> 'Average'
 *     <  55% -> 'Needs work'
 */
export function scoreLabel(score, variant = 'verdict') {
  const num = normalizeScore(score);
  const normalized = num <= 10 ? num * 10 : num;

  if (variant === 'proficiency') {
    if (normalized >= 80) return 'Exceptional';
    if (normalized >= 55) return 'Proficient';
    return 'Developing';
  }

  if (variant === 'rating') {
    if (normalized >= 80) return 'Good';
    if (normalized >= 55) return 'Average';
    return 'Needs work';
  }

  // Default: backend-aligned verdict
  if (normalized >= 80) return 'Hire';
  if (normalized >= 60) return 'Hold';
  return 'Pass';
}
