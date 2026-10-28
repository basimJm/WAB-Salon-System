# Deploying the admin panel (Cloudflare Pages, Netlify or Vercel)

The panel is a static site (`dist/<variant>/`). The host must serve the files, send the security headers and answer every path with `index.html`. `scripts/write-hosting.ts` writes those files from the same public values the build used, so the Content-Security-Policy always names the real API and socket origins.

## Public values (never secrets)

| Name | Where | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | build | API base URL, `https://…` (required for prod) |
| `VITE_SOCKET_URL` | build | Socket.IO origin, `https://…` (required for prod) |
| `VITE_DATA_SOURCE` | build | `remote` (default everywhere except dev-debug) or `mock` (dev-debug only) |
| `CSP_CONNECT_EXTRA` | build machine | comma list of extra `https://` origins the browser may call, e.g. the storage host presigned uploads go to |

## Cloudflare Pages (recommended: free, global CDN, fast)

Cloudflare reads the same `_headers` and `_redirects` files that `scripts/write-hosting.ts` writes, so the security headers and the single-page routing work unchanged.

**With Git (builds on every push):** Workers & Pages -> Create -> Pages -> Connect to Git -> repository `WAB-Salon-System`.

| Setting | Value |
|---|---|
| Production branch | `main` (or `admin` until it is merged) |
| Root directory | `WAB-Admin-Dashboard` |
| Build command | `npm ci && npm run build:prod-release && node scripts/write-hosting.ts prod-release --target cloudflare` |
| Build output directory | `dist/prod-release` |
| Node version | 22 (`.node-version` is committed) |

Environment variables (Settings -> Variables and Secrets, plain text, Production): `VITE_API_BASE_URL` and `VITE_SOCKET_URL` (both `https://app-server-dev.onrender.com` for now). Optional: `VITE_DEFAULT_LANGUAGE`, `CSP_CONNECT_EXTRA`. Without them the values in `.env.prod` are used. Preview deployments (other branches) can use the build command with `build:dev-release` and `dev-release`.

**Without Git (one command, about a minute):**

```bash
cd WAB-Admin-Dashboard
npm ci
npm run build:prod-release && node scripts/write-hosting.ts prod-release --target cloudflare
npx wrangler login                                                        # once, opens the browser
npx wrangler pages deploy dist/prod-release --project-name <project-name> # first time it offers to create the project
```

The panel is then at `https://<project-name>.pages.dev`. Add that origin to the server's `CORS_ALLOWED_ORIGINS`.

## Netlify (config is committed: `netlify.toml`)

1. New site from Git, repository `WAB-Salon-System`, **Base directory** `WAB-Admin-Dashboard`. The build command and publish folder come from `netlify.toml`.
2. Site settings → Environment variables: `VITE_API_BASE_URL`, `VITE_SOCKET_URL` (and `CSP_CONNECT_EXTRA` if needed) for the production context.
3. Production branch: `main` (builds `prod-release`). Deploy previews and branch deploys build `dev-release`, which calls the **dev API**. The committed `.env.dev` / `.env.prod` hold the base URLs (both `https://app-server-dev.onrender.com` for now); change them, or set the environment variables in the site settings (they win). Only `npm run dev` (dev-debug) uses the built-in mock data.
4. Add the custom domain in Domain management; HTTPS is automatic. The headers include HSTS.

## Vercel

1. Import the repository, **Root Directory** `WAB-Admin-Dashboard`, framework preset *Other*.
2. Build command: `npm ci && npm run build:prod-release && node scripts/write-hosting.ts prod-release --target vercel --out dist/prod-release`; output directory `dist/prod-release`; Node 22.
3. Set the same environment variables.

## Checks before the first prod deploy

- `npm run verify` and the four variant builds pass (`sh scripts/gate.sh`).
- Open the deployed site: the login page renders, the browser console shows no `Content Security Policy` errors, and `/about` shows the prod variant and the live API source.
- Headers: `curl -sI https://<domain>/ | grep -iE "content-security|strict-transport|x-content-type|x-frame"`.
- Rollback: redeploy the previous successful deploy from the host's deploy list.

## What the headers are

`scripts/lib/hosting.ts` is the single source (tested in `tests/hosting.test.ts`): CSP (self only, plus API, socket https+wss and the extras; no framing; fonts may be `data:` because the build inlines small fonts), HSTS (2 years), `nosniff`, `X-Frame-Options: DENY`, referrer, permissions and opener policies, immutable cache for `/assets/*`, no cache for `index.html`.

## Fast free deploy (Netlify CLI, about two minutes)

```bash
cd WAB-Admin-Dashboard
npm ci
npm run build:prod-release && node scripts/write-hosting.ts prod-release     # reads .env.prod
npx netlify-cli login                                                          # once, opens the browser
npx netlify-cli deploy --prod --dir dist/prod-release --site <site-name>       # first time: add --create-site <site-name>
```

Dev copy (second site or the same site's draft deploy): `npm run build:dev-release && node scripts/write-hosting.ts dev-release && npx netlify-cli deploy --dir dist/dev-release` (add `--prod` on a separate dev site).

Render's free server sleeps after idle time: the first request after a pause can take up to a minute; the panel shows its loading state until then. The server's `CORS_ALLOWED_ORIGINS` must include the deployed panel origin (`https://<site-name>.netlify.app`).
