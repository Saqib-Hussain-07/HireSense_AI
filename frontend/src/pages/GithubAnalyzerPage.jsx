import React, { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

const langColors = {
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python: '#3572a5',
  html: '#e34c26',
  css: '#563d7c',
  go: '#00add8',
  rust: '#dea584',
  cpp: '#f34b7d',
  'c++': '#f34b7d',
  java: '#b07219',
  ruby: '#701516',
  php: '#4f5d95',
  shell: '#89e051',
  c: '#555555'
};

export default function GithubAnalyzerPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (val) => {
    let cleaned = val;
    // Deduplicate doubled URLs (e.g. from subagent double keypress or double paste)
    if (cleaned.trim().startsWith('https://github.com/') && cleaned.trim().indexOf('https://github.com/', 1) !== -1) {
      const secondIndex = cleaned.trim().indexOf('https://github.com/', 1);
      cleaned = cleaned.trim().slice(0, secondIndex);
    }
    setRepoUrl(cleaned);
  };

  async function handleAnalyze() {
    setBusy(true);
    setError('');
    try {
      const data = await api.analyzeGithub(repoUrl.trim());
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
        description="Share a public repo and we'll perform a technical audit and generate spoken interview questions that probe your actual implementation knowledge."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <input
              value={repoUrl}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-panel border border-hairline rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40 text-white"
            />
            {repoUrl && (
              <button
                type="button"
                onClick={() => setRepoUrl('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white font-mono text-base font-semibold leading-none"
                title="Clear input"
              >
                ×
              </button>
            )}
          </div>
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
          <div className="bg-panel border border-hairline rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <p className="font-semibold text-white text-base leading-snug">{result.repo.repoName}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  <a href={result.repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-zinc-300">
                    View on GitHub ↗
                  </a>
                </p>
              </div>
              <span className="text-xs text-faint font-mono bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                ★ {result.repo.stars} stars
              </span>
            </div>

            {result.repo.description && (
              <p className="text-sm text-muted leading-relaxed font-body">{result.repo.description}</p>
            )}

            {/* Language distribution bar */}
            {result.repo.languages?.length > 0 && (
              <div className="space-y-3 bg-[#0a0a0a]/40 border border-white/5 rounded-xl p-4">
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Language Distribution</p>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                  {result.repo.languages.map((l) => (
                    <div
                      key={l.name}
                      style={{
                        width: `${l.percentage}%`,
                        backgroundColor: langColors[l.name.toLowerCase()] || '#888888',
                      }}
                      title={`${l.name}: ${l.percentage}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                  {result.repo.languages.slice(0, 6).map((l) => (
                    <div key={l.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: langColors[l.name.toLowerCase()] || '#888888' }}
                      />
                      <span className="font-medium text-zinc-300">{l.name}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">{l.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Explainer */}
            {result.summary && (
              <div className="bg-[#050505]/60 border border-white/5 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-onair font-mono uppercase tracking-wider">Project Explainer & Architecture</p>
                <p className="text-sm text-zinc-300 leading-relaxed font-body">{result.summary}</p>
              </div>
            )}

            {/* Categorized Questions */}
            {result.categories && (
              <div className="space-y-4 pt-1">
                <p className="text-[10px] text-onair font-mono uppercase tracking-wider">Categorized Spoken Questions</p>
                <div className="space-y-4">
                  {Object.entries(result.categories).map(([cat, qs]) => {
                    if (!qs || qs.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-2 border border-white/5 bg-[#0a0a0a]/20 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-onair animate-pulse" />
                          {cat}
                        </h4>
                        <div className="space-y-2">
                          {qs.map((q, idx) => (
                            <p key={idx} className="text-sm text-zinc-300 bg-[#070707]/80 border border-white/5 rounded-lg px-4 py-2.5 leading-relaxed font-body">
                              {q}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
