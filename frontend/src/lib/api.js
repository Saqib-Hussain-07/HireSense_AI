const BASE = '/api';

function getToken() {
  return localStorage.getItem('hiresense_token');
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
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
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  googleAuth: (idToken) => request('/auth/google', { method: 'POST', body: { idToken } }),

  getProfile: () => request('/profile'),
  updateProfile: (body) => request('/profile', { method: 'PUT', body }),

  uploadResume: (file) => {
    const form = new FormData();
    form.append('resume', file);
    return request('/resume/upload', { method: 'POST', body: form, isForm: true });
  },
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
  generateInterviewFromPack: (body) => request('/interview/generate-from-pack', { method: 'POST', body }),
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
  getCompanyQuestions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/company-questions${qs ? `?${qs}` : ''}`);
  },
  submitCompanyQuestion: (body) => request('/company-questions', { method: 'POST', body }),

  getPacks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/packs${qs ? `?${qs}` : ''}`);
  },
  createPack: (body) => request('/packs', { method: 'POST', body }),
};

export function wsUrl(sessionId) {
  const token = getToken();
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // In dev, Vite proxies /ws to the backend (see vite.config.js).
  return `${protocol}://${window.location.host}/ws/interview/${sessionId}?token=${token}`;
}

export { getToken };
