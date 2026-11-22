<?php
declare(strict_types=1);

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function request_body(): array
{
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) respond(400, ['error' => 'Request body must be valid JSON.']);
    return $body;
}

function csrf_token(): string
{
    if (!isset($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function require_csrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($provided) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $provided)) {
        respond(419, ['error' => 'Your session token expired. Refresh and try again.']);
    }
}

function current_user(): ?array
{
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

function require_user(): array
{
    $user = current_user();
    if ($user === null) respond(401, ['error' => 'Sign in to continue.']);
    return $user;
}

function require_admin(): array
{
    $user = require_user();
    if ($user['role'] !== 'admin') respond(403, ['error' => 'Administrator access is required.']);
    return $user;
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function route_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = preg_replace('#^/api#', '', $path) ?: '/';
    return rtrim($path, '/') ?: '/';
}

function validate_task(array $data, bool $partial = false): array
{
    $errors = [];
    if (!$partial || array_key_exists('title', $data)) {
        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '' || text_length($title) > 200) $errors['title'] = 'Title is required and must be at most 200 characters.';
    }
    if (array_key_exists('description', $data) && (!is_string($data['description']) || text_length($data['description']) > 10000)) {
        $errors['description'] = 'Description must be text of at most 10,000 characters.';
    }
    if ((!$partial || array_key_exists('status', $data)) && !in_array($data['status'] ?? 'todo', ['todo', 'in-progress', 'done'], true)) {
        $errors['status'] = 'Choose todo, in-progress, or done.';
    }
    if ((!$partial || array_key_exists('priority', $data)) && !in_array($data['priority'] ?? 'medium', ['low', 'medium', 'high'], true)) {
        $errors['priority'] = 'Choose low, medium, or high.';
    }
    if (array_key_exists('due_date', $data) && $data['due_date'] !== null && $data['due_date'] !== '') {
        $date = is_string($data['due_date']) ? DateTime::createFromFormat('!Y-m-d', $data['due_date']) : false;
        if (!$date || $date->format('Y-m-d') !== $data['due_date']) $errors['due_date'] = 'Due date must use YYYY-MM-DD.';
    }
    return $errors;
}

function task_payload(array $data): array
{
    return [
        'title' => trim((string) $data['title']),
        'description' => trim((string) ($data['description'] ?? '')) ?: null,
        'status' => $data['status'] ?? 'todo',
        'priority' => $data['priority'] ?? 'medium',
        'due_date' => ($data['due_date'] ?? '') === '' ? null : ($data['due_date'] ?? null),
    ];
}
