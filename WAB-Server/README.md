# WAB-Server

Backend API for the WAB customer app, merchant app and admin panel. Rules: [`CLAUDE.md`](CLAUDE.md). Task list: [`docs/WAB_Server_Tasks.md`](docs/WAB_Server_Tasks.md).

## Scripts

| Command                                       | What it does                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` / `lint` / `format:check` | Static checks                                                                                                                          |
| `npm test`                                    | Unit and integration tests (no external services needed)                                                                               |
| `npm run build`                               | Compile to `dist/`                                                                                                                     |
| `npm start`                                   | Run the built server (`dist/server.js`)                                                                                                |
| `npm run docs`                                | Regenerate Swagger (`docs/api/openapi.*.json`) and Postman (`docs/api/postman/`) files. Required after every task, see `CLAUDE.md` §11 |

## Local environment

```bash
cp .env.example .env.development      # fill in the application settings
cp docker/compose.env.example .env    # fill in the values docker compose needs
docker compose up -d                  # MongoDB (replica set), Redis, MinIO, Mailpit
npm run build && npm start            # API on the PORT from .env.development
```

- Run the API in a container too: `docker compose --profile app up --build`.
- MongoDB runs as a single-node replica set because bookings use transactions. From the host, connect with `mongodb://127.0.0.1:<MONGO_PORT>/wab?directConnection=true`.
- Mailpit shows captured emails at `http://127.0.0.1:<MAILPIT_UI_PORT>`; MinIO's console is on `MINIO_CONSOLE_PORT`.
- Swagger UI is at `/docs` when `NODE_ENV` is not `production`.
- `.env*` files are never committed.

## External providers

OTP, file storage, push/email, payments and analytics sit behind interfaces in `src/providers`. `OTP_PROVIDER`, `STORAGE_PROVIDER`, `NOTIFIER_PROVIDER`, `PAYMENT_PROVIDER` and `ANALYTICS_PROVIDER` choose `fake` (in-repo stand-in, the default outside production) or `real`. Production must set every provider to `real`; the config check refuses anything else. The real integrations arrive with the `wab-*` packages, until then `real` fails at start-up with a clear error.

## Authentication

Access tokens are HS256 JWTs signed with `JWT_ACCESS_SECRET` (required, at least 32 characters, never committed; set it in `.env.development`). Each token is valid for one namespace only (`customer`, `merchant` or `admin`); a token of another namespace gets `403`. Protect a route with `requireAuth(scope, secret)`.
