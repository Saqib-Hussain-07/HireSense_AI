import React from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function GrowthPage() {
  const { data: tracker, isLoading: loadingTracker } = useQuery({
    queryKey: ['weaknessTracker'],
    queryFn: api.getWeaknessTracker,
    staleTime: 5 * 60 * 1000,
  });
  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: ['learningPlan'],
    queryFn: api.getLearningPlan,
    staleTime: 5 * 60 * 1000,
  });

  const sortedTopics = [...(tracker?.weakTopics || [])].sort((a, b) => b.occurrences - a.occurrences);

  return (
    <div>
      <PageHeader
        eyebrow="Weakness tracker + learning plan"
        title="Growth"
        description="Topics that keep showing up in your lowest-scoring answers, and a 7-day plan to close the gaps."
      />
      <div className="p-8 grid grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-panel border border-hairline rounded-xl p-6">
          <p className="text-sm font-medium text-text mb-4">Weak topics</p>
          {loadingTracker && <p className="text-sm text-muted">Loading…</p>}
          {sortedTopics.length === 0 && !loadingTracker && (
            <p className="text-sm text-muted">
              Nothing tracked yet — topics show up here automatically after you finish sessions with some lower-scoring
              answers.
            </p>
          )}
          <div className="space-y-2">
            {sortedTopics.map((t) => (
              <div key={t.topic} className="flex items-center justify-between bg-panel2 rounded-lg px-3 py-2">
                <span className="text-sm text-text">{t.topic}</span>
                <span className="text-xs font-mono text-onair">×{t.occurrences}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-panel border border-hairline rounded-xl p-6">
          <p className="text-sm font-medium text-text mb-4">7-day learning plan</p>
          {loadingPlan && <p className="text-sm text-muted">Generating…</p>}
          {plan?.note && <p className="text-sm text-muted">{plan.note}</p>}
          <div className="space-y-2">
            {plan?.days?.map((d, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xs font-mono text-faint w-9 pt-0.5 shrink-0">{d.day}</span>
                <span className="text-sm text-text">{d.task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
