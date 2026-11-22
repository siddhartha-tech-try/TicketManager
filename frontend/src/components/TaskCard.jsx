const statuses = ['todo', 'in-progress', 'done'];
const label = value => value === 'in-progress' ? 'In progress' : value[0].toUpperCase() + value.slice(1);
const dateLabel = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

export default function TaskCard({ task, isAdmin, onEdit, onDelete, onStatus }) {
  return <article className={`task-card ${task.status === 'done' ? 'is-done' : ''}`}>
    <button className={`task-check ${task.status === 'done' ? 'checked' : ''}`} onClick={() => onStatus(task, task.status === 'done' ? 'todo' : 'done')} aria-label={task.status === 'done' ? 'Reopen task' : 'Complete task'}>{task.status === 'done' ? '✓' : ''}</button>
    <div className="task-card-copy">
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      {isAdmin && <span className="assigned-owner">Assigned to <strong>{task.owner_name}</strong></span>}
      <div className="task-meta"><span className={`status-chip status-${task.status}`}>{label(task.status)}</span><span className={`priority-dot priority-${task.priority}`}>{task.priority} priority</span>{task.due_date && <span className="due-date">◷ {dateLabel(task.due_date)}</span>}</div>
    </div>
    <div className="task-card-actions"><select aria-label={`Status for ${task.title}`} value={task.status} onChange={event => onStatus(task, event.target.value)}>{statuses.map(status => <option value={status} key={status}>{label(status)}</option>)}</select><button className="icon-button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>↗</button><button className="icon-button danger-hover" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>⌫</button></div>
  </article>;
}
