import { useState } from 'react';

const statuses = ['todo', 'in-progress', 'done'];
const priorities = ['low', 'medium', 'high'];
const statusLabel = value => value === 'in-progress' ? 'In progress' : value[0].toUpperCase() + value.slice(1);

export default function TaskForm({ task, users = [], isAdmin, onSave, onCancel }) {
  const [form, setForm] = useState(task ? { ...task } : { title: '', description: '', status: 'todo', priority: 'medium', due_date: '', user_id: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setFieldErrors({});
    try { await onSave({ ...form, due_date: form.due_date || null, ...(isAdmin ? { user_id: Number(form.user_id) } : {}) }); }
    catch (problem) { setError(problem.message); setFieldErrors(problem.fields || {}); }
    finally { setBusy(false); }
  };

  return <form className="task-form" onSubmit={submit}>
    <div className="form-heading"><div><p className="eyebrow">{task ? 'UPDATE DETAILS' : 'MAKE A PLAN'}</p><h2>{task ? 'Edit task' : 'Create a task'}</h2></div><button type="button" className="icon-button close-button" onClick={onCancel} aria-label="Close">×</button></div>
    <label>Task title<input autoFocus required maxLength="200" value={form.title} onChange={event => change('title', event.target.value)} placeholder="What needs to get done?" />{fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}</label>
    <label>Description <span className="optional-label">OPTIONAL</span><textarea rows="3" maxLength="10000" value={form.description || ''} onChange={event => change('description', event.target.value)} placeholder="Add a little context…" />{fieldErrors.description && <small className="field-error">{fieldErrors.description}</small>}</label>
    <div className="form-grid"><label>Status<select value={form.status} onChange={event => change('status', event.target.value)}>{statuses.map(status => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></label><label>Priority<select value={form.priority} onChange={event => change('priority', event.target.value)}>{priorities.map(priority => <option value={priority} key={priority}>{priority}</option>)}</select></label></div>
    <div className={isAdmin ? 'form-grid' : ''}><label>Due date <span className="optional-label">OPTIONAL</span><input type="date" value={form.due_date || ''} onChange={event => change('due_date', event.target.value)} />{fieldErrors.due_date && <small className="field-error">{fieldErrors.due_date}</small>}</label>{isAdmin && <label>Assign to<select required value={form.user_id || ''} onChange={event => change('user_id', event.target.value)}><option value="">Choose a person</option>{users.map(person => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select>{fieldErrors.user_id && <small className="field-error">{fieldErrors.user_id}</small>}</label>}</div>
    {error && <div className="alert" role="alert">{error}</div>}
    <div className="form-actions"><button type="button" className="button subtle" onClick={onCancel}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : task ? 'Save task' : 'Create task'} <span>↗</span></button></div>
  </form>;
}
