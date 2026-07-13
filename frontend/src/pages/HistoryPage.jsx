import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function HistoryPage() {
  const { data: sessions, isLoading } = useQuery({ queryKey: ['history'], queryFn: api.getHistory });

  return (
    <div>
      <PageHeader eyebrow="Session history" title="History & replay" description="Every past session, in one place." />
      <div className="p-8 max-w-3xl space-y-3">
        {isLoading && <p className="text-muted text-sm">Loading…</p>}
        {sessions?.length === 0 && <p className="text-muted text-sm">No sessions yet.</p>}
        {sessions?.map((s) => (
          <Link
            key={s._id}
            to={s.status === 'completed' ? `/interview/${s._id}/report` : `/interview/${s._id}`}
            className="flex items-center justify-between bg-panel border border-hairline rounded-xl px-5 py-4 hover:border-onair/40 transition-colors"
          >
            <div>
              <p className="text-text text-sm font-medium capitalize">
                {s.type.replace('_', ' ')} · {s.persona.replace('_', ' ')}
              </p>
              <p className="text-xs text-faint font-mono mt-1">
                {new Date(s.createdAt).toLocaleString()} · {s.status}
              </p>
            </div>
            <p className="text-xl font-display font-semibold text-onair">{s.overallScore || '—'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
