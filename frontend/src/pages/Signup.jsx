import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signup(name, email, password);
      navigate('/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-onair pulse-onair" />
          </div>
          <h1 className="font-serif text-3xl mb-2">Create your account</h1>
          <p className="text-sm text-muted">Start practicing your next interview out loud.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-hairline rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-muted font-mono">name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-mono">email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-mono">password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-panel2 border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-onair/40"
            />
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-onair text-ink font-medium rounded-md py-2 text-sm hover:bg-onair2 transition-colors disabled:opacity-50"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-onair hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-faint text-center mt-6">
          <Link to="/" className="hover:text-muted transition-colors">
            ← back to overview
          </Link>
        </p>
      </div>
    </div>
  );
}
