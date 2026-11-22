# Daymark Task Manager

Full-stack implementation of the first three **core practical tasks** in the supplied assessment: task CRUD, session authentication and role-based access, plus schema and query design. The application uses PHP 8.1+, MySQL 8+, and React.

## Run locally

### 1. Create the database

Import the schema with a local MySQL account:

```sh
Get-Content -Raw .\database\schema.sql | mysql.exe -u root -p
```

The script creates `task_manager`, roles, users, and tasks. The first self-registration becomes the initial administrator when no admin exists; later self-registrations receive the `user` role. Admins can create users and choose their role from the People page.

### 2. Start the PHP API

Set the database variables in your shell (or configure the equivalent in your PHP server environment):

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_NAME = 'task_manager'
$env:DB_USER = 'root'
$env:DB_PASSWORD = 'your-local-password'
$env:APP_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173'
php -d session.save_path="$env:TEMP" -S 127.0.0.1:8000 -t api api/index.php
```

`APP_ORIGIN` must list the React origin(s), comma-separated. In production, set it to the deployed frontend origin and serve the API over HTTPS. Session cookies are HttpOnly, SameSite=Lax, and Secure when PHP detects HTTPS; the default idle lifetime is one hour.

### 3. Start React

```powershell
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. If the API is hosted elsewhere, set `VITE_API_URL` to its `/api` base URL (for example `https://api.example.com/api`) before starting Vite. The sign-in and sidebar workspace photos load from the Unsplash CDN and need an internet connection; the app remains usable if those images are unavailable.

## Make an administrator

When the database has no administrator, the first self-registration receives the admin role; later self-registrations receive the regular user role. To promote an existing account manually, use a trusted database connection:

```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'admin@example.com';
```

Sign out and back in after promotion so the new role is loaded into the session. Admins can list and manage all tasks; regular users only see and manage tasks they own. The admin task list includes each task owner's name and email.

## API summary

All request and response bodies are JSON. Authenticated task routes require the PHP session cookie. Mutating routes require the `X-CSRF-Token` returned by `GET /api/auth/me`, login, or registration.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/auth/me` | Current user (or `null`) and CSRF token |
| POST | `/api/auth/register` | Register and sign in; creates the first admin if none exists, otherwise a regular user |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Invalidate the session |
| GET | `/api/tasks?status=todo&page=1&per_page=10&user_id=2` | List visible tasks, optionally filtered and paginated; admins may filter by assignee |
| POST | `/api/tasks` | Create a task for the signed-in user, or assign it to a selected user as admin |
| PATCH | `/api/tasks/{id}` | Update task fields; owners and admins only, admins may reassign |
| DELETE | `/api/tasks/{id}` | Delete a task; owners and admins only |
| GET | `/api/admin/users` | List users and their task counts (admin only) |
| POST | `/api/admin/users` | Create a user or administrator (admin only) |
| GET | `/api/admin/analytics` | Workspace totals, status breakdown, workload, recent assignments (admin only) |

The API returns 401 when task routes are called without a session, 403 when a regular user targets another user's task, 404 for a missing task, and 422 for invalid input. Registration returns 409 for a duplicate email. Pagination is capped at 50 records per page.

## Data model and query choices (Task 3)

`database/schema.sql` is the canonical DDL. `roles.name` and `users.email` are unique. Every user references one role; each task references its owner, with foreign keys preserving referential integrity. Deleting a user cascades to their tasks. Status and priority are constrained to the supported values by MySQL enums; title, email, role, and owner are required. Passwords are stored only as PHP `password_hash()` output.

Indexes follow the live access patterns in the list endpoint:

1. **A user's tasks by status, newest first:**

   ```sql
   SELECT id, title, description, status, priority, due_date, created_at
   FROM tasks
   WHERE user_id = ? AND status = ?
   ORDER BY created_at DESC, id DESC
   LIMIT ? OFFSET ?;
   ```

   `idx_tasks_user_status_created (user_id, status, created_at, id)` begins with both equality filters, then supports the requested ordering and a stable tie-breaker. The owner-only list uses the leftmost prefix `(user_id, created_at, id)` from `idx_tasks_user_created`.

2. **Admin list with owner details, optionally by status:**

   ```sql
   SELECT t.id, t.title, t.status, t.priority, t.due_date,
          u.name AS owner_name, u.email AS owner_email
   FROM tasks AS t
   JOIN users AS u ON u.id = t.user_id
   WHERE t.status = ?
   ORDER BY t.created_at DESC, t.id DESC
   LIMIT ? OFFSET ?;
   ```

   `idx_tasks_status_created (status, created_at, id)` supports a status-filtered admin scan; the primary key on `users.id` makes owner lookups indexed. Without a status filter, `idx_tasks_created (created_at, id)` supports the global task ordering and owner details are joined by primary key.

3. **Total rows for the current list** (used to calculate the pagination controls):

   ```sql
   SELECT COUNT(*)
   FROM tasks AS t
   WHERE t.user_id = ? AND t.status = ?;
   ```

   The API applies the same visibility and status filters to this count as to the page query. The `(user_id, status)` prefix in `idx_tasks_user_status_created` supports a user's filtered count; an admin's status-only count uses `idx_tasks_status_created`.

For an environment-specific plan, run `EXPLAIN` before the corresponding `SELECT` after importing the schema. The selected index can vary with row counts and MySQL statistics; the composite key order is chosen to match equality filters followed by sort columns. The list endpoint runs a separate `COUNT(*)` with the same filters so the UI can show page totals.

## Scope

- **Completed:** Tasks 1–3 (CRUD, auth/RBAC, schema/indexes and optimized query notes), plus admin user creation, task assignment by user, a team directory, and basic workspace analytics.
- **Not attempted:** optional Tasks 4–7 (Docker, Node/PostgreSQL port, cloud deployment, and AI feature).
- **Time spent:** more than 8 hours.
