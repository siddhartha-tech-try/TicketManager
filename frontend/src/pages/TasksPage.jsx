import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskForm from '../components/TaskForm.jsx';

const statuses = ['', 'todo', 'in-progress', 'done'];
const statusName = value => value === 'in-progress' ? 'In progress' : value ? value[0].toUpperCase() + value.slice(1) : 'All tasks';

export default function TasksPage() {
  const { user, csrf, signOut } = useAuth();
  const isAdmin = user.role === 'admin';
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalTask, setModalTask] = useState(undefined);
  const [toast, setToast] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ page: String(page), per_page: '10' });
      if (status) query.set('status', status);
      if (isAdmin && assignee) query.set('user_id', assignee);
      const result = await api(`/tasks?${query}`);
      setTasks(result.tasks); setPagination(result.pagination);
    } catch (problem) { setError(problem.message); if (problem.status === 401) signOut(); }
    finally { setLoading(false); }
  }, [page, status, assignee, isAdmin]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => {
    if (isAdmin) api('/admin/users').then(result => setUsers(result.users)).catch(problem => setError(problem.message));
  }, [isAdmin]);

  const saveTask = async values => {
    await api(modalTask ? `/tasks/${modalTask.id}` : '/tasks', {
      method: modalTask ? 'PATCH' : 'POST', csrf, body: JSON.stringify(values),
    });
    setModalTask(undefined); setToast(modalTask ? 'Task updated.' : 'Task created.');
    window.setTimeout(() => setToast(''), 2600); await loadTasks();
  };

  const changeStatus = async (task, nextStatus) => {
    try { await api(`/tasks/${task.id}`, { method: 'PATCH', csrf, body: JSON.stringify({ status: nextStatus }) }); await loadTasks(); }
    catch (problem) { setError(problem.message); }
  };

  const deleteTask = async task => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try { await api(`/tasks/${task.id}`, { method: 'DELETE', csrf }); setToast('Task deleted.'); await loadTasks(); }
    catch (problem) { setError(problem.message); }
  };

  const doneCount = tasks.filter(task => task.status === 'done').length;
  const progress = pagination.total ? Math.round(doneCount / Math.max(tasks.length, 1) * 100) : 0;

  return <div className="page-stack">
    <section className="page-hero task-hero"><div><span className="hero-kicker">{isAdmin ? 'TEAM WORKSPACE' : new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span><h1>{isAdmin ? 'Tasks in motion.' : <>A little progress<br/><span>goes a long way.</span></>}</h1><p>{isAdmin ? 'See what the team is working on and keep the next steps clear.' : 'Keep your focus on what matters today.'}</p></div><div className="hero-progress"><div className="progress-ring" style={{ '--progress': `${progress}%` }}><span>{progress}<small>%</small></span></div><div><strong>{doneCount} completed</strong><small>on this page</small></div></div></section>

    <section className="content-section"><div className="section-heading"><div><span className="eyebrow">{isAdmin ? 'TEAM TASKS' : 'YOUR LIST'}</span><h2>{statusName(status)} <span className="count-pill">{pagination.total}</span></h2></div><div className="toolbar"><select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">{statuses.map(value => <option value={value} key={value}>{statusName(value)}</option>)}</select>{isAdmin && <select value={assignee} onChange={event => { setAssignee(event.target.value); setPage(1); }} aria-label="Filter by user"><option value="">Everyone</option>{users.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select>}<button className="button primary" onClick={() => setModalTask(null)}>＋ <span>{isAdmin ? 'Assign task' : 'New task'}</span></button></div></div>
      {error && <div className="alert page-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
      <div className="task-list" aria-live="polite">
        {loading ? <div className="empty-state"><span className="loader"/><p>Gathering your tasks…</p></div> : tasks.length ? tasks.map(task => <TaskCard key={task.id} task={task} isAdmin={isAdmin} onEdit={setModalTask} onDelete={deleteTask} onStatus={changeStatus}/>) : <div className="empty-state"><div className="empty-icon">✳</div><h3>{status ? 'Nothing in this lane yet.' : 'A clear page.'}</h3><p>{isAdmin ? 'Assign a task to get the team moving.' : 'Add a task whenever something comes to mind.'}</p><button className="button primary" onClick={() => setModalTask(null)}>{isAdmin ? 'Assign a task' : 'Add your first task'} ↗</button></div>}
      </div>
      {!loading && pagination.pages > 1 && <nav className="pagination" aria-label="Task pages"><span>Page {pagination.page} of {pagination.pages}</span><div><button className="button subtle" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>← Previous</button><button className="button subtle" disabled={page >= pagination.pages} onClick={() => setPage(value => value + 1)}>Next →</button></div></nav>}
    </section>
    {modalTask !== undefined && <Modal title={modalTask ? 'Edit task' : 'Create task'} onClose={() => setModalTask(undefined)}><TaskForm task={modalTask} users={users} isAdmin={isAdmin} onSave={saveTask} onCancel={() => setModalTask(undefined)}/></Modal>}
    {toast && <div className="toast" role="status">✓ &nbsp;{toast}</div>}
  </div>;
}
