import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['history', page],
    queryFn: () => api.getHistory({ page, limit }),
    keepPreviousData: true,
  });

  const sessions = Array.isArray(data) ? data : (data?.sessions || []);
  const total = typeof data?.total === 'number' ? data.total : sessions.length;
  const totalPages = data?.totalPages || Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <PageHeader
        eyebrow="Session history"
        title="History & replay"
        description={total > 0 ? `${total} past interview session${total === 1 ? '' : 's'} recorded.` : 'Every past session, in one place.'}
      />
      <div className="p-8 max-w-3xl space-y-4">
        {isLoading && <p className="text-muted text-sm">Loading…</p>}
        {!isLoading && sessions.length === 0 && (
          <p className="text-muted text-sm">No sessions found.</p>
        )}

        {sessions.map((s) => (
          <Link
            key={s._id}
            to={s.status === 'completed' ? `/interview/${s._id}/report` : `/interview/${s._id}`}
            className="flex items-center justify-between bg-panel border border-hairline rounded-xl px-5 py-4 hover:border-onair/40 transition-colors"
          >
            <div>
              <p className="text-text text-sm font-medium capitalize">
                {(s.type || '').replace(/_/g, ' ')} · {(s.persona || '').replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-faint font-mono mt-1">
                {new Date(s.createdAt).toLocaleString()} · {s.status}
              </p>
            </div>
            <p className="text-xl font-display font-semibold text-onair">{s.overallScore || '—'}</p>
          </Link>
        ))}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-hairline/60">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-hairline bg-panel text-xs text-text hover:border-onair/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs text-muted font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-hairline bg-panel text-xs text-text hover:border-onair/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

