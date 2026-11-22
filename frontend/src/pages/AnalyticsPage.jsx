import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const number = value => new Intl.NumberFormat().format(value || 0);
const statusNames = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
const statusColors = { todo: '#a8b4c5', in_progress: '#7097d1', done: '#76b49a' };

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/admin/analytics').then(setData).catch(problem => setError(problem.message)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="empty-state"><span className="loader"/><p>Pulling together the overview…</p></div>;
  if (error) return <div className="alert page-alert">{error}</div>;

  const { summary, users, recent_tasks: recent } = data;
  const allTasks = summary.tasks || 0;
  const completion = allTasks ? Math.round(summary.done / allTasks * 100) : 0;
  const maxUserTasks = Math.max(...users.map(person => person.total), 1);
  const statuses = ['todo', 'in_progress', 'done'];

  return <div className="page-stack">
    <section className="page-heading-row analytics-heading"><div><span className="eyebrow">TEAM PULSE · {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase()}</span><h1>Work, at a glance.</h1><p>A simple view of assignments, progress, and what needs attention.</p></div><Link className="button primary" to="/tasks">View all tasks ↗</Link></section>
    <section className="metric-grid">
      <article className="metric-card metric-indigo"><span className="metric-label">TOTAL TASKS</span><strong>{number(allTasks)}</strong><span className="metric-foot">Across the workspace</span><span className="metric-icon">▤</span></article>
      <article className="metric-card metric-green"><span className="metric-label">COMPLETED</span><strong>{number(summary.done)}</strong><span className="metric-foot">{completion}% completion rate</span><span className="metric-icon">✓</span></article>
      <article className="metric-card metric-amber"><span className="metric-label">IN PROGRESS</span><strong>{number(summary.in_progress)}</strong><span className="metric-foot">Moving forward now</span><span className="metric-icon">↗</span></article>
      <article className="metric-card metric-rose"><span className="metric-label">PAST DUE</span><strong>{number(summary.overdue)}</strong><span className="metric-foot">Unfinished past due date</span><span className="metric-icon">◷</span></article>
    </section>
    <section className="analytics-grid">
      <article className="content-section chart-panel"><div className="section-heading"><div><span className="eyebrow">STATUS BREAKDOWN</span><h2>How work is moving</h2></div><span className="count-pill">{number(allTasks)} total</span></div>
        <div className="stacked-track">{statuses.map(key => <span key={key} style={{ width: `${allTasks ? (summary[key] / allTasks) * 100 : 0}%`, background: statusColors[key] }} title={`${statusNames[key]}: ${summary[key]}`}/>)}</div>
        <div className="status-legend">{statuses.map(key => <div key={key}><span className="legend-dot" style={{ background: statusColors[key] }}/><span>{statusNames[key]}</span><strong>{number(summary[key])}</strong></div>)}</div>
        <div className="completion-note"><div className="completion-circle">{completion}%</div><div><strong>Completion rate</strong><p>Tasks marked done across your workspace.</p></div></div>
      </article>
      <article className="content-section workload-panel"><div className="section-heading"><div><span className="eyebrow">ASSIGNMENTS</span><h2>Work by person</h2></div><Link to="/admin/users">People ↗</Link></div>
        {users.length ? <div className="workload-list">{users.map(person => <div className="workload-row" key={person.id}><div className="workload-person"><span className="avatar">{person.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{person.name}</strong><small>{person.total} tasks</small></span></div><div className="workload-track"><span style={{ width: `${Math.max(person.total / maxUserTasks * 100, person.total ? 5 : 0)}%` }}/></div></div>)}</div> : <div className="chart-empty">No assigned tasks yet.</div>}
      </article>
    </section>
    <section className="content-section recent-panel"><div className="section-heading"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Recently assigned</h2></div><Link className="text-link" to="/tasks">All tasks ↗</Link></div>
      {recent.length ? <div className="recent-list">{recent.map(task => <div className="recent-row" key={task.id}><span className={`recent-mark status-${task.status}`}>{task.status === 'done' ? '✓' : '•'}</span><div className="recent-copy"><strong>{task.title}</strong><small>Assigned to {task.owner_name}</small></div><span className={`status-chip status-${task.status}`}>{task.status === 'in-progress' ? 'In progress' : task.status}</span></div>)}</div> : <div className="chart-empty">No tasks to show yet.</div>}
    </section>
  </div>;
}
