import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';

const initials = name => name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();

function UserForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setErrors({});
    try { await onSave(form); }
    catch (problem) { setError(problem.message); setErrors(problem.fields || {}); }
    finally { setBusy(false); }
  };
  return <form className="task-form" onSubmit={submit}>
    <div className="form-heading"><div><p className="eyebrow">TEAM DIRECTORY</p><h2>Add a person</h2></div><button type="button" className="icon-button close-button" onClick={onCancel}>×</button></div>
    <label>Full name<input autoFocus required maxLength="120" value={form.name} onChange={event => change('name', event.target.value)}/>{errors.name && <small className="field-error">{errors.name}</small>}</label>
    <label>Email address<input type="email" required maxLength="254" value={form.email} onChange={event => change('email', event.target.value)}/>{errors.email && <small className="field-error">{errors.email}</small>}</label>
    <label>Temporary password<input type="password" required minLength="10" maxLength="72" value={form.password} onChange={event => change('password', event.target.value)}/><small className="hint">At least 10 characters. Share it securely with the new user.</small>{errors.password && <small className="field-error">{errors.password}</small>}</label>
    <label>Role<select value={form.role} onChange={event => change('role', event.target.value)}><option value="user">Member</option><option value="admin">Administrator</option></select>{errors.role && <small className="field-error">{errors.role}</small>}</label>
    {error && <div className="alert" role="alert">{error}</div>}
    <div className="form-actions"><button type="button" className="button subtle" onClick={onCancel}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'} ↗</button></div>
  </form>;
}

export default function UsersPage() {
  const { csrf } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '10' });
      if (query.trim()) params.set('q', query.trim());
      const result = await api(`/admin/users?${params}`);
      setUsers(result.users);
      setPagination(result.pagination);
      setError('');
    }
    catch (problem) { setError(problem.message); }
    finally { setLoading(false); }
  }, [page, query]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const createUser = async values => {
    await api('/admin/users', { method: 'POST', csrf, body: JSON.stringify(values) });
    setAdding(false);
    setQuery('');
    setPage(1);
  };

  return <div className="page-stack">
    <section className="page-heading-row"><div><span className="eyebrow">TEAM DIRECTORY</span><h1>Good work takes a team.</h1><p>Manage access and see how work is distributed.</p></div><button className="button primary" onClick={() => setAdding(true)}>＋ <span>Add person</span></button></section>
    <section className="content-section"><div className="section-heading users-section-heading"><div><span className="eyebrow">PEOPLE</span><h2>{pagination.total} {pagination.total === 1 ? 'person' : 'people'}</h2></div><label className="search-box"><span>⌕</span><input placeholder="Find a person…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></label></div>
      {error && <div className="alert page-alert">{error}<button onClick={loadUsers}>Retry</button></div>}
      <div className="table-wrap"><table className="people-table"><thead><tr><th>PERSON</th><th>ROLE</th><th>ASSIGNED TASKS</th><th>JOINED</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="4" className="table-message">Loading people…</td></tr> : users.length ? users.map(person => <tr key={person.id}><td><div className="person-cell"><span className="avatar person-avatar">{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.email}</small></span></div></td><td><span className={`role-tag ${person.role}`}>{person.role === 'admin' ? 'Administrator' : 'Member'}</span></td><td><span className="task-count">{person.task_count}</span></td><td className="joined-date">{new Date(person.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td></tr>) : <tr><td colSpan="4" className="table-message">{query.trim() ? 'No people match that search.' : 'No people to show.'}</td></tr>}
      </tbody></table></div>
      {!loading && pagination.pages > 1 && <nav className="pagination" aria-label="People pages"><span>Page {pagination.page} of {pagination.pages}</span><div><button className="button subtle" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>← Previous</button><button className="button subtle" disabled={page >= pagination.pages} onClick={() => setPage(value => value + 1)}>Next →</button></div></nav>}
    </section>
    {adding && <Modal title="Add a person" onClose={() => setAdding(false)}><UserForm onSave={createUser} onCancel={() => setAdding(false)}/></Modal>}
  </div>;
}
