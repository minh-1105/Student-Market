# Frontend environments and deployment

## API configuration

The browser reads the API base URL from `NEXT_PUBLIC_API_URL`.

- Local development: `http://localhost:5033/api`
- Staging/production: the HTTPS URL of the deployed API, for example
  `https://api.example.com/api`

Production code never falls back to localhost. When the variable is missing from
a production build it uses the same-origin `/api` path, which should only be used
when the hosting layer has an explicit API rewrite.

Do not put secrets, AWS access keys, JWT signing keys, database credentials, or
other private values in a `NEXT_PUBLIC_*` variable. These values are embedded in
the JavaScript sent to every browser.

## Static export on AWS Amplify Hosting

This application uses `output: "export"`; `npm run build` creates the `out`
directory. `next/image` runs in unoptimized mode because the static host does not
provide the Next.js image optimization server. Source assets must therefore be
compressed before commit.

Files used by Amplify:

| File | Purpose |
|---|---|
| `amplify.yml` | Build spec: Node 22, fails fast if `NEXT_PUBLIC_API_URL` is missing or not HTTPS, `npm ci` → lint → typecheck → build, publishes `out/` |
| `customHttp.yml` | Security headers; immutable cache for `_next/static`, no-cache for `.html`/`.txt` |
| `amplify-rules.json` | Rewrite `/<path>` → `/<path>.html` (status `404-200`, only when no file matches) |

The artifact directory is `out`. If Amplify is connected to the parent monorepo,
set the app root to `student-flea-market-fe`; if it is connected directly to this
frontend repository, leave the app root at the repository root.

### First-time setup

1. Amplify Console → *Create new app* → connect this repository and branch. Amplify
   picks up `amplify.yml`; keep the static hosting platform (do not choose SSR / `WEB_COMPUTE`).
2. *Environment variables*: `NEXT_PUBLIC_API_URL=<ApiBaseUrl of the API stack>/api`.
   The value is baked in at build time, so redeploy after changing it.
3. Apply the rewrite rule. Static export produces `marketplace.html`, not
   `marketplace/index.html`, so without it a direct visit or refresh on `/marketplace` returns 404:

   ```powershell
   aws amplify update-app --app-id <app-id> --region ap-southeast-1 --profile student-market `
     --custom-rules file://amplify-rules.json
   ```

   Or paste the same rule in *Hosting → Rewrites and redirects*.
4. Add the Amplify origin (for example `https://main.<app-id>.amplifyapp.com`) to
   `FrontendOrigins` of **both** AWS stacks (API CORS and S3 CORS), e.g.
   `.\Production\deploy.ps1 -FrontendOrigins "https://main.<app-id>.amplifyapp.com"`.

Set `NEXT_PUBLIC_API_URL` separately in each Amplify environment. A custom domain
should use HTTPS.

## CORS checklist

- Backend CORS must list the exact Amplify and custom-domain origins.
- Do not use `*` together with credentialed requests.
- Production S3 CORS must list the exact frontend origin and allow the method and
  signed headers used by the presigned POST flow.
- Keep LocalStack CORS separate from production S3 CORS.
- Verify login, refresh, logout, network failures, and presigned uploads from the
  deployed origin before promoting staging to production.

## Authentication boundary

The frontend route guard improves navigation only. Every admin API must enforce
authorization on the backend. JavaScript-created access-token and role cookies
have been removed. Moving refresh tokens out of Web Storage requires a coordinated
backend change to issue and rotate a `Secure`, `HttpOnly`, appropriately
`SameSite` cookie; do not attempt that migration only in the frontend.
