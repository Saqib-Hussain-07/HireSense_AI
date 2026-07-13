import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../lib/api';

const TYPES = ['technical', 'hr', 'dsa', 'system_design', 'behavioral'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const PERSONAS = ['friendly_mentor', 'strict_recruiter', 'faang_engineer', 'startup_founder'];

export default function PacksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [companyFilter, setCompanyFilter] = useState('');
  const [starting, setStarting] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', description: '', defaultType: 'technical', defaultDifficulty: 'medium', defaultPersona: 'faang_engineer' });
  const [creating, setCreating] = useState(false);

  const { data: packs, isLoading } = useQuery({
    queryKey: ['packs', companyFilter],
    queryFn: () => api.getPacks(companyFilter ? { company: companyFilter } : {}),
  });

  async function handleStart(packId) {
    setStarting(packId);
    try {
      const { session } = await api.generateInterviewFromPack({ packId });
      navigate(`/interview/${session._id}`);
    } finally {
      setStarting(null);
    }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.company.trim()) return;
    setCreating(true);
    try {
      await api.createPack(form);
      setShowCreate(false);
      setForm({ name: '', company: '', description: '', defaultType: 'technical', defaultDifficulty: 'medium', defaultPersona: 'faang_engineer' });
      queryClient.invalidateQueries({ queryKey: ['packs'] });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Phase 3 · Expansion"
        title="Company interview packs"
        description="A pack pulls real questions from the Company Question Bank for that company first, then tops up with AI-generated ones. No admin curation yet — packs are community-created, same caveat as the question bank."
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-3">
          <input
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            placeholder="Filter by company"
            className="flex-1 bg-panel border border-hairline rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-panel2 border border-hairline text-text rounded-md px-4 py-2 text-sm hover:bg-panel"
          >
            {showCreate ? 'Cancel' : 'New pack'}
          </button>
        </div>

        {showCreate && (
          <div className="bg-panel2 border border-hairline rounded-xl p-5 space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pack name (e.g. Google Backend Screen)"
              className="w-full bg-panel border border-hairline rounded-md px-3 py-2 text-sm"
            />
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company"
              className="w-full bg-panel border border-hairline rounded-md px-3 py-2 text-sm"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-panel border border-hairline rounded-md px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <select value={form.defaultType} onChange={(e) => setForm({ ...form, defaultType: e.target.value })} className="bg-panel border border-hairline rounded-md px-2 py-2 text-sm">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.defaultDifficulty} onChange={(e) => setForm({ ...form, defaultDifficulty: e.target.value })} className="bg-panel border border-hairline rounded-md px-2 py-2 text-sm">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={form.defaultPersona} onChange={(e) => setForm({ ...form, defaultPersona: e.target.value })} className="bg-panel border border-hairline rounded-md px-2 py-2 text-sm">
                {PERSONAS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-onair text-ink font-medium rounded-md px-4 py-2 text-sm hover:bg-onair2 disabled:opacity-40"
            >
              {creating ? 'Creating…' : 'Create pack'}
            </button>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted">Loading…</p>}
        {packs?.length === 0 && <p className="text-sm text-muted">No packs yet for this filter.</p>}
        <div className="space-y-3">
          {packs?.map((pack) => (
            <div key={pack._id} className="bg-panel border border-hairline rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-text font-medium">{pack.name}</p>
                <span className="text-xs font-mono text-onair">{pack.company}</span>
              </div>
              {pack.description && <p className="text-sm text-muted mb-3">{pack.description}</p>}
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs text-faint font-mono">
                  <span>{pack.defaultType}</span>·<span>{pack.defaultDifficulty}</span>·<span>{pack.defaultPersona.replace('_', ' ')}</span>
                </div>
                <button
                  onClick={() => handleStart(pack._id)}
                  disabled={starting === pack._id}
                  className="text-sm bg-onair text-ink font-medium rounded-full px-4 py-1.5 hover:bg-onair2 disabled:opacity-40"
                >
                  {starting === pack._id ? 'Starting…' : 'Start session'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
