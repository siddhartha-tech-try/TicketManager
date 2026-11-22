<?php
declare(strict_types=1);

require_once __DIR__ . '/src/bootstrap.php';
require_once __DIR__ . '/src/controllers/AuthController.php';
require_once __DIR__ . '/src/controllers/TaskController.php';
require_once __DIR__ . '/src/controllers/AdminController.php';

$auth = new AuthController();
$tasks = new TaskController();
$admin = new AdminController();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = route_path();

try {
    if ($path === '/auth/me' && $method === 'GET') $auth->me();
    if ($path === '/auth/register' && $method === 'POST') $auth->register();
    if ($path === '/auth/login' && $method === 'POST') $auth->login();
    if ($path === '/auth/logout' && $method === 'POST') $auth->logout();

    if ($path === '/tasks' && $method === 'GET') $tasks->index();
    if ($path === '/tasks' && $method === 'POST') $tasks->create();
    if (preg_match('#^/tasks/(\d+)$#', $path, $matches) && in_array($method, ['PATCH', 'DELETE'], true)) {
        $tasks->update((int) $matches[1]);
    }

    if ($path === '/admin/users' && $method === 'GET') $admin->users();
    if ($path === '/admin/users' && $method === 'POST') $admin->createUser();
    if ($path === '/admin/analytics' && $method === 'GET') $admin->analytics();

    respond(404, ['error' => 'Endpoint not found.']);
} catch (Throwable $error) {
    error_log((string) $error);
    respond(500, ['error' => 'Something went wrong. Check the server configuration and try again.']);
}
