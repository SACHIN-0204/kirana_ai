# Authentication

## Roles
| Role  | Can do |
|-------|--------|
| admin | Everything: add/edit/delete sales, products & stock, manage users, view forecasts |
| staff | Read-only: dashboard, forecasts, reorder report, category summary |

## Setup
1. Backend `.env` (see `backend/.env.example`): set `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
2. `cd backend && npm install && npm start` — on first start (empty users collection) the admin is created.
   Docker: copy `.env.example` to `.env` next to `docker-compose.yml`, then `docker compose up --build`.
3. Log in at `/login`, then add more users under **Users**. Change the bootstrap password right away.

## API
- `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/change-password`
- `GET/POST/PUT/DELETE /api/users` (admin)
- `PUT/DELETE /api/sales/:id`, `PUT/DELETE /api/products/:id` (admin)
- All other `/api/*` routes require `Authorization: Bearer <token>`; writes need admin.

## Production notes
- Use HTTPS and a long random `JWT_SECRET`; tokens expire after 8h (`JWT_EXPIRES_IN`).
- Token is kept in localStorage (simple SPA approach). If you need stronger XSS protection, move to httpOnly cookies.
- Render deploy: add `JWT_SECRET`, `ADMIN_*`, `FRONTEND_URL` env vars to the backend service.
