<?php
declare(strict_types=1);

final class AdminController
{
    public function users(): never
    {
        require_admin();
        $page = max(1, filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT) ?: 1);
        $perPage = min(50, max(1, filter_var($_GET['per_page'] ?? 10, FILTER_VALIDATE_INT) ?: 10));
        $search = trim((string) ($_GET['q'] ?? ''));
        $where = '';
        $params = [];
        if ($search !== '') {
            $where = ' WHERE u.name LIKE ? OR u.email LIKE ? OR r.name LIKE ?';
            $pattern = '%' . $search . '%';
            $params = [$pattern, $pattern, $pattern];
        }
        $count = db()->prepare('SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id' . $where);
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $statement = db()->prepare(
            'SELECT u.id, u.name, u.email, r.name AS role, u.created_at, COUNT(t.id) AS task_count '
            . 'FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN tasks t ON t.user_id = u.id '
            . $where
            . ' GROUP BY u.id, u.name, u.email, r.name, u.created_at ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?'
        );
        foreach ($params as $index => $value) $statement->bindValue($index + 1, $value);
        $statement->bindValue(count($params) + 1, $perPage, PDO::PARAM_INT);
        $statement->bindValue(count($params) + 2, ($page - 1) * $perPage, PDO::PARAM_INT);
        $statement->execute();
        respond(200, [
            'users' => $statement->fetchAll(),
            'pagination' => ['page' => $page, 'per_page' => $perPage, 'total' => $total, 'pages' => (int) ceil($total / $perPage)],
        ]);
    }

    public function createUser(): never
    {
        require_admin();
        require_csrf();
        $body = request_body();
        $name = trim((string) ($body['name'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = $body['password'] ?? null;
        $role = $body['role'] ?? 'user';
        $errors = [];
        if ($name === '' || text_length($name) > 120) $errors['name'] = 'Name is required and must be at most 120 characters.';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) $errors['email'] = 'Enter a valid email address.';
        if (!is_string($password) || strlen($password) < 10 || strlen($password) > 72) $errors['password'] = 'Password must be between 10 and 72 characters.';
        if (!in_array($role, ['admin', 'user'], true)) $errors['role'] = 'Choose a valid role.';
        if ($errors) respond(422, ['error' => 'Please correct the highlighted fields.', 'fields' => $errors]);

        try {
            $statement = db()->prepare('INSERT INTO users (role_id, name, email, password_hash) SELECT id, ?, ?, ? FROM roles WHERE name = ?');
            $statement->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $role]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') respond(409, ['error' => 'An account with that email already exists.']);
            throw $error;
        }
        respond(201, ['user' => ['id' => (int) db()->lastInsertId(), 'name' => $name, 'email' => $email, 'role' => $role, 'task_count' => 0]]);
    }

    public function analytics(): never
    {
        require_admin();
        $summary = db()->query(
            "SELECT (SELECT COUNT(*) FROM users) AS users, COUNT(*) AS tasks, "
            . "COALESCE(SUM(status = 'done'), 0) AS done, COALESCE(SUM(status = 'in-progress'), 0) AS in_progress, "
            . "COALESCE(SUM(status = 'todo'), 0) AS todo, COALESCE(SUM(status <> 'done' AND due_date < CURRENT_DATE()), 0) AS overdue "
            . 'FROM tasks'
        )->fetch();
        $byUser = db()->query(
            'SELECT u.id, u.name, u.email, COUNT(t.id) AS total, '
            . "COALESCE(SUM(t.status = 'done'), 0) AS done, COALESCE(SUM(t.status = 'in-progress'), 0) AS in_progress, COALESCE(SUM(t.status = 'todo'), 0) AS todo "
            . 'FROM users u LEFT JOIN tasks t ON t.user_id = u.id GROUP BY u.id, u.name, u.email ORDER BY total DESC, u.name ASC LIMIT 8'
        )->fetchAll();
        $recent = db()->query(
            'SELECT t.id, t.title, t.status, t.priority, t.due_date, t.created_at, u.name AS owner_name '
            . 'FROM tasks t JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC, t.id DESC LIMIT 6'
        )->fetchAll();
        $summary = array_map(static fn ($value) => (int) $value, $summary);
        foreach ($byUser as &$row) $row = array_map(static fn ($value) => is_numeric($value) ? (int) $value : $value, $row);
        unset($row);
        respond(200, ['summary' => $summary, 'users' => $byUser, 'recent_tasks' => $recent]);
    }
}
