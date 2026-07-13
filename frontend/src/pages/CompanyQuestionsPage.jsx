import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

export default function CompanyQuestionsPage() {
  const [company, setCompany] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['companyQuestions', searchCompany],
    queryFn: () => api.getCompanyQuestions(searchCompany ? { company: searchCompany } : {}),
  });

  async function handleSubmit() {
    if (!newCompany.trim() || !newQuestion.trim()) return;
    setSubmitting(true);
    try {
      await api.submitCompanyQuestion({ company: newCompany, questionText: newQuestion });
      setNewQuestion('');
      queryClient.invalidateQueries({ queryKey: ['companyQuestions'] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Differentiator"
        title="Company question bank"
        description="Questions tagged by company and recency. User-submitted entries are unverified — there's no moderation pipeline yet, so treat them as crowd tips, not confirmed facts."
      />
      <div className="p-8 max-w-2xl space-y-8">
        <div>
          <div className="flex gap-3 mb-4">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearchCompany(company)}
              placeholder="Filter by company (e.g. Google)"
              className="flex-1 bg-panel border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40"
            />
            <button
              onClick={() => setSearchCompany(company)}
              className="bg-panel2 border border-hairline text-text rounded-md px-4 py-2 text-sm hover:bg-panel"
            >
              Filter
            </button>
          </div>

          {isLoading && <p className="text-sm text-muted">Loading…</p>}
          {questions?.length === 0 && <p className="text-sm text-muted">No questions yet for this filter — be the first to add one below.</p>}
          <div className="space-y-2">
            {questions?.map((q) => (
              <div key={q._id} className="bg-panel border border-hairline rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-onair">{q.company}</span>
                  <span className="text-xs text-faint">{new Date(q.recency).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-text">{q.questionText}</p>
                {q.source === 'user_submitted' && <p className="text-xs text-faint mt-1">unverified · user-submitted</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-panel2 border border-hairline rounded-xl p-5 space-y-3">
          <p className="text-sm font-medium text-text">Submit a question you were asked</p>
          <input
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="Company"
            className="w-full bg-panel border border-hairline rounded-md px-3 py-2 text-sm"
          />
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            rows={3}
            placeholder="The question you were asked…"
            className="w-full bg-panel border border-hairline rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newCompany.trim() || !newQuestion.trim()}
            className="bg-onair text-ink font-medium rounded-md px-4 py-2 text-sm hover:bg-onair2 transition-colors disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
