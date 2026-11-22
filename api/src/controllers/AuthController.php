<?php
declare(strict_types=1);

final class AuthController
{
    public function me(): never
    {
        respond(200, ['user' => current_user(), 'csrf_token' => csrf_token()]);
    }

    public function register(): never
    {
        require_csrf();
        $body = request_body();
        $name = trim((string) ($body['name'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = $body['password'] ?? null;
        $errors = [];
        if ($name === '' || text_length($name) > 120) $errors['name'] = 'Name is required and must be at most 120 characters.';
        if (!is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) $errors['email'] = 'Enter a valid email address.';
        if (!is_string($password) || strlen($password) < 10 || strlen($password) > 72) $errors['password'] = 'Password must be between 10 and 72 characters.';
        if ($errors) respond(422, ['error' => 'Please correct the highlighted fields.', 'fields' => $errors]);

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->query("SELECT id FROM roles WHERE name = 'admin' FOR UPDATE")->fetchColumn();
            $hasAdmin = (int) $pdo->query("SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin'")->fetchColumn() > 0;
            $role = $hasAdmin ? 'user' : 'admin';
            $statement = $pdo->prepare('INSERT INTO users (role_id, name, email, password_hash) SELECT id, ?, ?, ? FROM roles WHERE name = ?');
            $statement->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $role]);
            $id = (int) $pdo->lastInsertId();
            $pdo->commit();
        } catch (PDOException $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($error->getCode() === '23000') respond(409, ['error' => 'An account with that email already exists.']);
            throw $error;
        }

        session_regenerate_id(true);
        $_SESSION['user'] = ['id' => $id, 'name' => $name, 'email' => $email, 'role' => $role];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        respond(201, ['user' => $_SESSION['user'], 'csrf_token' => $_SESSION['csrf_token']]);
    }

    public function login(): never
    {
        require_csrf();
        $body = request_body();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = $body['password'] ?? null;
        if (!is_string($password) || $email === '') respond(422, ['error' => 'Email and password are required.']);
        $statement = db()->prepare('SELECT u.id, u.name, u.email, u.password_hash, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ? LIMIT 1');
        $statement->execute([$email]);
        $user = $statement->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) respond(401, ['error' => 'Email or password is incorrect.']);
        session_regenerate_id(true);
        unset($user['password_hash']);
        $user['id'] = (int) $user['id'];
        $_SESSION['user'] = $user;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        respond(200, ['user' => $user, 'csrf_token' => $_SESSION['csrf_token']]);
    }

    public function logout(): never
    {
        require_csrf();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => $params['httponly'], 'samesite' => 'Lax']);
        }
        session_destroy();
        respond(200, ['message' => 'Signed out.']);
    }
}
