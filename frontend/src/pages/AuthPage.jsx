import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { user, ready, csrf, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  if (!ready) return <div className="page-loading">Checking your session…</div>;
  if (user) return <Navigate to="/tasks" replace />;

  const submit = async event => {
    event.preventDefault(); setError(''); setFieldErrors({}); setBusy(true);
    try {
      const result = await api(`/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', csrf, body: JSON.stringify(form) });
      signIn(result.user, result.csrf_token);
      navigate(location.state?.from || (result.user.role === 'admin' ? '/admin/analytics' : '/tasks'), { replace: true });
    } catch (problem) { setError(problem.message); setFieldErrors(problem.fields || {}); }
    finally { setBusy(false); }
  };

  return <main className="auth-shell">
    <section className="auth-card">
      <Link className="brand" to="/login"><span className="brand-mark">✓</span> daymark</Link>
      <p className="eyebrow">YOUR SPACE, IN ORDER</p>
      <h1>{isRegister ? 'Make room for focus.' : 'Good to have you back.'}</h1>
      <p className="muted">{isRegister ? 'Create an account and get your tasks moving.' : 'Sign in to pick up where you left off.'}</p>
      <form className="auth-form" onSubmit={submit}>
        {isRegister && <label>Your name<input autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required maxLength="120" />{fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}</label>}
        <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required maxLength="254" />{fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}</label>
        <label>Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required minLength={isRegister ? 10 : 1} maxLength="72" />{isRegister && <small className="hint">At least 10 characters.</small>}{fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}</label>
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="button primary full" disabled={busy}>{busy ? 'One moment…' : isRegister ? 'Create account' : 'Sign in'} <span>↗</span></button>
      </form>
      <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to daymark?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
    </section>
    <aside className="auth-visual"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=88" alt="A light-filled, plant-filled modern workspace" /><div className="auth-visual-shade"/><div className="auth-visual-copy"><span className="art-pill">A LITTLE MORE CLARITY</span><h2>Small steps.<br /><em>Real momentum.</em></h2><p>Keep the important things close, and move through your day with intention.</p></div></aside>
  </main>;
}
