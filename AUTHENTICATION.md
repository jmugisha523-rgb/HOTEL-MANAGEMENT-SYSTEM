# Authentication and authorization

Before starting the API, run `db/auth-migration.sql` once against the
`hotel_management_system` database. Back up the database first. The migration
adds roles, departments, active status, and a unique username constraint; it
also makes the legacy `names` and `email` fields optional.

Set `JWT_SECRET` to a long, random secret before starting `npm start`. Tokens
use HS256 and expire after one hour. The optional `WORKING_HOURS_START` and
`WORKING_HOURS_END` settings default to 9 and 17, and `AUTH_TIME_ZONE` defaults
to `UTC`. Set `AUTH_ALLOWED_IPS` to a comma-separated list of exact client IPs
to enable `/users/custom-access`; that endpoint returns `503` until the list is
configured.

## Endpoints

- `POST /users/register` creates a regular user. Send `username`, `password`
  (at least 8 characters), and `department`; `names` and `email` are optional.
- `POST /users/login` accepts `username` and `password` and returns a JWT.
- `POST /users/admin/register` creates any supported role and requires an
  administrator bearer token. Public registration cannot assign privileged
  roles.
- `GET /users/getoneuser/:id` allows the owner or an administrator.
- `GET /users/getallusers` allows administrators and managers.
- `PUT /users/user/:id` and `DELETE /users/user/:id` are administrator-only.
- `GET /users/department/:department/resources` demonstrates department
  attribute checks.
- `GET /users/custom-access` demonstrates role, IP, and working-hours rules.

Protected endpoints expect an `Authorization: Bearer <token>` header. Account
status and current role/department are checked against MySQL on each request.
