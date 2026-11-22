<?php
declare(strict_types=1);

final class TaskController
{
    public function index(): never
    {
        $user = require_user();
        $status = $_GET['status'] ?? '';
        $assignee = $_GET['user_id'] ?? '';
        if ($status !== '' && !in_array($status, ['todo', 'in-progress', 'done'], true)) respond(422, ['error' => 'Invalid status filter.']);
        $page = max(1, filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT) ?: 1);
        $perPage = min(50, max(1, filter_var($_GET['per_page'] ?? 10, FILTER_VALIDATE_INT) ?: 10));
        $where = [];
        $params = [];
        if ($user['role'] !== 'admin') {
            $where[] = 't.user_id = ?';
            $params[] = $user['id'];
        } elseif ($assignee !== '') {
            if (!filter_var($assignee, FILTER_VALIDATE_INT)) respond(422, ['error' => 'Invalid assignee filter.']);
            $where[] = 't.user_id = ?';
            $params[] = (int) $assignee;
        }
        if ($status !== '') { $where[] = 't.status = ?'; $params[] = $status; }
        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';

        $count = db()->prepare('SELECT COUNT(*) FROM tasks t' . $whereSql);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $query = db()->prepare(
            'SELECT t.id, t.user_id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, t.updated_at, u.name AS owner_name, u.email AS owner_email '
            . 'FROM tasks t JOIN users u ON u.id = t.user_id' . $whereSql
            . ' ORDER BY t.created_at DESC, t.id DESC LIMIT ? OFFSET ?'
        );
        foreach ($params as $index => $value) $query->bindValue($index + 1, $value);
        $query->bindValue(count($params) + 1, $perPage, PDO::PARAM_INT);
        $query->bindValue(count($params) + 2, ($page - 1) * $perPage, PDO::PARAM_INT);
        $query->execute();
        respond(200, ['tasks' => $query->fetchAll(), 'pagination' => ['page' => $page, 'per_page' => $perPage, 'total' => $total, 'pages' => (int) ceil($total / $perPage)]]);
    }

    public function create(): never
    {
        $user = require_user();
        require_csrf();
        $body = request_body();
        $errors = validate_task($body);
        $assigneeId = $this->assigneeId($user, $body['user_id'] ?? null, $errors, true);
        if ($errors) respond(422, ['error' => 'Please correct the task fields.', 'fields' => $errors]);
        $task = task_payload($body);
        $statement = db()->prepare('INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)');
        $statement->execute([$assigneeId, $task['title'], $task['description'], $task['status'], $task['priority'], $task['due_date']]);
        respond(201, ['task' => ['id' => (int) db()->lastInsertId(), 'user_id' => $assigneeId] + $task]);
    }

    public function update(int $id): never
    {
        $user = require_user();
        $taskQuery = db()->prepare('SELECT user_id FROM tasks WHERE id = ?');
        $taskQuery->execute([$id]);
        $ownerId = $taskQuery->fetchColumn();
        if ($ownerId === false) respond(404, ['error' => 'Task not found.']);
        if ($user['role'] !== 'admin' && (int) $ownerId !== (int) $user['id']) respond(403, ['error' => 'You do not have access to this task.']);

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'DELETE') {
            require_csrf();
            $delete = db()->prepare('DELETE FROM tasks WHERE id = ?');
            $delete->execute([$id]);
            respond(200, ['message' => 'Task deleted.']);
        }
        require_csrf();
        $body = request_body();
        if (!$body) respond(422, ['error' => 'Provide at least one task field to update.']);
        $errors = validate_task($body, true);
        $assigneeId = array_key_exists('user_id', $body) ? $this->assigneeId($user, $body['user_id'], $errors, true) : null;
        if ($errors) respond(422, ['error' => 'Please correct the task fields.', 'fields' => $errors]);
        $allowed = ['title', 'description', 'status', 'priority', 'due_date'];
        $sets = [];
        $params = [];
        foreach ($allowed as $field) {
            if (!array_key_exists($field, $body)) continue;
            $value = $body[$field];
            if ($field === 'title') $value = trim((string) $value);
            if ($field === 'description') $value = trim((string) $value) ?: null;
            if ($field === 'due_date' && $value === '') $value = null;
            $sets[] = "$field = ?";
            $params[] = $value;
        }
        if ($assigneeId !== null) { $sets[] = 'user_id = ?'; $params[] = $assigneeId; }
        if (!$sets) respond(422, ['error' => 'No updatable task fields were provided.']);
        $params[] = $id;
        $update = db()->prepare('UPDATE tasks SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $update->execute($params);
        respond(200, ['message' => 'Task updated.']);
    }

    private function assigneeId(array $user, mixed $requested, array &$errors, bool $required): ?int
    {
        if ($user['role'] !== 'admin') return (int) $user['id'];
        if ($requested === null || $requested === '') {
            if ($required) $errors['user_id'] = 'Choose a user for this task.';
            return null;
        }
        if (!filter_var($requested, FILTER_VALIDATE_INT)) {
            $errors['user_id'] = 'Choose a valid user.';
            return null;
        }
        $exists = db()->prepare('SELECT id FROM users WHERE id = ?');
        $exists->execute([(int) $requested]);
        if (!$exists->fetchColumn()) { $errors['user_id'] = 'Choose a valid user.'; return null; }
        return (int) $requested;
    }
}
