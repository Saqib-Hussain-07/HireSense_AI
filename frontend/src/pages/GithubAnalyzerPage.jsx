import React, { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function GithubAnalyzerPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    setBusy(true);
    setError('');
    try {
      const data = await api.analyzeGithub(repoUrl);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Differentiator"
        title="GitHub analyzer"
        description="Share a public repo and we'll generate spoken interview questions that probe your actual understanding of that project — hard to fake."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-3">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 bg-panel border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40"
          />
          <button
            onClick={handleAnalyze}
            disabled={busy || !repoUrl.includes('github.com/')}
            className="bg-onair text-ink font-medium rounded-md px-4 py-2 text-sm hover:bg-onair2 transition-colors disabled:opacity-40 shrink-0"
          >
            {busy ? 'Analyzing…' : 'Analyze repo'}
          </button>
        </div>

        {error && <p className="text-sm text-alert">{error}</p>}

        {result && (
          <div className="bg-panel border border-hairline rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text">{result.repo.repoName}</p>
              <span className="text-xs text-faint font-mono">★ {result.repo.stars}</span>
            </div>
            <p className="text-sm text-muted">{result.repo.description}</p>
            <div className="flex flex-wrap gap-2">
              {result.repo.languages.map((l) => (
                <span key={l} className="text-xs bg-panel2 border border-hairline rounded-full px-2.5 py-1 text-muted">
                  {l}
                </span>
              ))}
            </div>

            <div>
              <p className="text-xs text-onair font-mono uppercase mb-2">Interview questions about this project</p>
              <div className="space-y-2">
                {result.questions.map((q, i) => (
                  <p key={i} className="text-sm text-text bg-panel2 rounded-lg px-3 py-2">
                    {q}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
