const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE = API_URL ? `${API_URL}/api` : '/api';

function getToken() {
  return localStorage.getItem('hiresense_token');
}

async function getAuthToken() {
  if (typeof window !== 'undefined' && window.Clerk?.session) {
    try {
      const clerkToken = await window.Clerk.session.getToken();
      if (clerkToken) return clerkToken;
    } catch (_e) {
      // ignore
    }
  }
  return getToken();
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = await getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  clerkSession: (payload) => {
    const body = typeof payload === 'string' ? { sessionToken: payload } : payload;
    return request('/auth/clerk-session', { method: 'POST', body });
  },

  getProfile: () => request('/profile'),
  updateProfile: (body) => request('/profile', { method: 'PUT', body }),

  uploadResume: (file) => {
    const form = new FormData();
    form.append('resume', file);
    return request('/resume/upload', { method: 'POST', body: form, isForm: true });
  },
  rescoreResume: (body) => request('/resume/rescore', { method: 'POST', body }),
  getResumeVersions: () => request('/resume/versions'),
  getResume: (id) => request(`/resume/${id}`),

  analyzeJD: (body) => request('/jd/analyze', { method: 'POST', body }),
  uploadJdPdf: (file) => {
    const form = new FormData();
    form.append('jd', file);
    return request('/jd/upload-pdf', { method: 'POST', body: form, isForm: true });
  },
  getJDs: () => request('/jd'),

  createMatch: (body) => request('/match', { method: 'POST', body }),
  getMatch: (id) => request(`/match/${id}`),
  getLatestMatch: () => request('/match/latest'),

  generateInterview: (body) => request('/interview/generate', { method: 'POST', body }),
  getInterview: (id) => request(`/interview/${id}`),
  answerInterview: (id, body) => request(`/interview/${id}/answer`, { method: 'POST', body }),
  followupInterview: (id, body) => request(`/interview/${id}/followup`, { method: 'POST', body }),
  redoInterview: (id, body) => request(`/interview/${id}/redo`, { method: 'POST', body }),
  finishInterview: (id) => request(`/interview/${id}/finish`, { method: 'POST' }),
  tts: (text) => request('/interview/tts', { method: 'POST', body: { text } }),

  getHistory: () => request('/history'),
  getDashboardStats: () => request('/dashboard/stats'),

  getWeaknessTracker: () => request('/weakness-tracker'),
  getLearningPlan: () => request('/learning-plan'),
  analyzeGithub: (repoUrl) => request('/github/analyze', { method: 'POST', body: { repoUrl } }),
};

export function wsUrl(sessionId, overrideToken) {
  const token = overrideToken || getToken() || '';
  if (API_URL) {
    const urlObj = new URL(API_URL);
    const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${urlObj.host}/ws/interview/${sessionId}?token=${token}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/interview/${sessionId}?token=${token}`;
}

export { getToken, getAuthToken };
