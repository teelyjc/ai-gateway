# LiteLLM Wrapper — Next.js Dashboard + LiteLLM Proxy

A custom wrapper around [LiteLLM](https://github.com/BerriAI/litellm) that lets users
self-serve **virtual keys**, and gives admins a dashboard to view **usage**, **models**,
**spend/cost**, and the **base cost model**.

Provider credentials are managed **centrally** by an admin (OpenAI, Anthropic, etc.).
Virtual keys are purely access + spend-limit tokens scoped per user.

---

## Architecture

```
                 ┌─────────────────────────────┐
  Browser  ─────▶│  Next.js App (TypeScript)   │   custom wrapper / dashboard
                 │  - UI (keys, models, usage) │
                 │  - API routes (server)      │
                 └──────────┬──────────┬───────┘
        key mgmt (admin API)│          │ spend reads (SQL)
                            ▼          ▼
                 ┌─────────────────────────────┐
                 │   LiteLLM Proxy (Python)    │   LLM gateway / key enforcement
                 │   /key/* /model/info /spend │
                 └──────────┬──────────────────┘
                            ▼
                 ┌─────────────────────────────┐
                 │   PostgreSQL (shared)       │   LiteLLM_VerificationToken,
                 │        (docker)             │   LiteLLM_SpendLogs, Users, Teams
                 └─────────────────────────────┘
```

- **LiteLLM Proxy** does the real LLM routing, enforces virtual-key budgets/models, and
  writes spend + usage to Postgres. Provider keys are **central** (admin env vars).
- **Next.js** is the custom wrapper: UI + a server-side API layer. It calls the proxy's
  management API for key CRUD, and reads `LiteLLM_SpendLogs` directly from Postgres for
  analytics/charts.
- **Per-user self-service**: each person has a LiteLLM `user_id`; they log in and only
  see/create their own keys (proxy calls scoped by `user_id`; list filtered server-side).
- **Authentication**: Auth.js redirects users to Authentik for username/password, MFA,
  and account policy. The app receives OIDC identity claims and never sees passwords.

---

## Features

- **Authentik authentication** — OIDC Authorization Code + PKCE with encrypted JWT
  sessions. Authentik groups map to app roles; there is no separate local user store.
- **Virtual keys (self-service)** — users create their own keys with allowed models,
  spend limit, and budget duration.
- **Usage dashboard** — token volume, request counts, spend over time.
- **Models catalog** — list of configured models exposed by the proxy.
- **Spend / cost tracking** — per-key and per-model spend pulled from Postgres.
- **Base cost model** — per-model input/output price per 1M tokens and context window,
  sourced from LiteLLM's pricing map.

---

## Components

### 1. Infra (`docker-compose.yml`)

- `postgres` service
- `litellm` service running `litellm --config /app/config.yaml --detailed_debug`
- Volume for `config.yaml`; env file for secrets

### 2. `config.yaml` (LiteLLM proxy)

- `model_list`: models with central provider keys via `os.environ/OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, etc.
- `general_settings`: `master_key`, `database_url`, `store_prompts_in_spend_logs: true`,
  `enable_request_logging: true`
- `litellm_settings`: `telemetry: false`
- `environment_variables` / `.env` hold the actual provider keys + master key (never committed)

### 3. Next.js app (`src/`)

**Pages (App Router)**

- `/login` — redirects to Authentik's hosted username/password login
- `/dashboard` — overview: total spend, active keys, token volume, top models
- `/keys` — create / list / view / revoke virtual keys
- `/models` — catalog of configured models + **base cost model**
- `/usage` — time-series & per-model / per-key spend charts
- `/agents` — client-side configuration generator for OpenCode, Claude Code, and Codex

**API routes (`src/app/api/`)**

- `keys/route.ts` — `POST` create (`/key/generate`), `GET` list (`/key/list` filtered by user)
- `keys/[id]/route.ts` — `GET` info, `POST` update, `DELETE`
- `models/route.ts` — `GET /model/info`
- `usage/summary/route.ts` & `usage/logs/route.ts` — aggregate `LiteLLM_SpendLogs` from Postgres

**Server libs (`src/lib/`)**

- `litellm.ts` — Axios-based typed client for proxy admin API using `LITELLM_MASTER_KEY`
- `db.ts` — Postgres reader (Prisma or `pg`) over litellm tables
- `auth.ts` — Auth.js OIDC provider, JWT session, groups → role mapping
- `cost.ts` — base cost model: bundle / fetch `model_prices_and_context_window.json`
  (input/output $ per 1M tokens, context window) for the Models view

### 4. Virtual key flow (central keys, per-user)

- Create: the server validates alias/models/budget and calls `POST /key/generate` with the
  Authentik username forced as `user_id`.
- List: `GET /key/list` with pagination and `return_full_object=true`; regular users are
  filtered by `user_id`, while Authentik admins can see all keys.
- Revoke: ownership is verified through `GET /key/info` before `POST /key/delete`.
- The generated key secret is returned once, shown in a copy dialog, and never stored in
  browser storage or rendered in the regular key table.
- The LiteLLM master key remains server-only. Because it grants proxy-admin access, the app
  performs its own ownership checks before every destructive operation.

### 5. Usage / spend dashboard

- Read `LiteLLM_SpendLogs` (cols: `api_key`, `user`, `model`, `prompt_tokens`,
  `completion_tokens`, `total_tokens`, `spend`, `startTime`…)
- Aggregations: spend over time (daily), by model, by key — rendered with **Recharts**
- Optionally fall back to proxy `/spend/logs`, `/spend/keys`

### 6. Models & base cost model view

- `GET /model/info` lists configured models
- Base cost: show each model's input/output price per 1M tokens + context window from the
  LiteLLM pricing map (bundled JSON or fetched at build)

### 7. Tech stack

- Next.js 15 (App Router) + TypeScript, Tailwind CSS, shadcn/ui, Recharts
- Prisma (read-only models for litellm tables) or `pg` raw SQL
- **Axios** for all client/server-side data fetching (proxy admin API + internal routes)
- Zod for request validation; Auth.js + Authentik OIDC authentication

### 8. Authentik setup

Create an OAuth2/OpenID Provider and Application in the existing Authentik instance:

- Client type: **Confidential**
- Grant types: `authorization_code`, `refresh_token`
- Redirect URI (local): `http://localhost:3000/api/auth/callback/authentik`
- Redirect URI (production): `https://<app-host>/api/auth/callback/authentik`
- Scopes/property mappings: `openid`, `profile`, `email`
- Issuer: `https://<authentik-host>/application/o/<application-slug>/`

Set `AUTHENTIK_ISSUER`, `AUTHENTIK_CLIENT_ID`, and `AUTHENTIK_CLIENT_SECRET` from that
provider. The default Authentik profile scope includes `preferred_username` and `groups`.
Members of `AUTHENTIK_ADMIN_GROUP` receive the app's `admin` role; everyone else receives
`user`. The Authentik username is also used as LiteLLM's `user_id` for key and usage scope.

### 9. Agent configuration generator

The authenticated `/agents` page generates:

- `opencode.json` with an `@ai-sdk/openai-compatible` LiteLLM provider section
- A Claude Code gateway shell file using `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN`
- `~/.codex/config.toml` with a custom Responses API provider

The virtual key stays in client component memory and is never submitted to an application
API or saved to browser storage. OpenCode and Codex configs reference `LITELLM_API_KEY`;
Claude Code receives its key through the generated environment script.

---

## UI Concept — minimalistic + Tailwind CSS

Clean, content-first interface. No chrome-heavy sidebars or gradients; rely on
whitespace, a restrained type scale, and one accent color.

### Design principles

- **Minimalistic**: neutral background (`zinc`/`slate`), thin borders, generous padding,
  no shadows except subtle elevation on modals. One primary accent (e.g. `indigo`/`emerald`).
- **Tailwind CSS** utility-first: design tokens via `tailwind.config.ts`
  (`colors`, `radius`, `fontFamily`). Dark mode via `class` strategy.
- **shadcn/ui** primitives (Button, Card, Table, Dialog, Input, Badge, Tabs) styled with
  Tailwind + CSS variables — consistent, accessible, unopinionated.
- **Data over decoration**: numbers and tables lead; charts are secondary and flat
  (Recharts with thin gridlines, no 3D).

### Layout

- **App shell**: fixed left navigation with Authentik identity and sign-out controls.
- **Cards**: rounded-2xl, `border border-zinc-200 dark:border-zinc-800`, white/dark surface.
- **Tables**: compact, sticky header, mono font for keys/IDs, right-aligned numerics.

### Key screens

- **/login** — centered card that redirects to Authentik's hosted login flow.
- **/dashboard** — 3–4 stat cards (Total Spend, Active Keys, Tokens, Requests) + a single
  flat spend-over-time line/area chart.
- **/keys** — table of keys (alias, models badge, spend / max_budget progress bar, status,
  expires) + "New Key" dialog (alias, models multi-select, budget, duration).
- **/models** — responsive grid of model cards: name, provider badge, context window,
  input/output $ per 1M tokens (the **base cost model**).
- **/usage** — filter bar (date range, model, key) + stacked charts (spend by day, by model
  donut, by key bar) built with Recharts.

### Visual tokens (Tailwind)

```ts
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    colors: { accent: { DEFAULT: "#6366f1" } }, // indigo
    borderRadius: { xl: "1rem", "2xl": "1.25rem" },
    fontFamily: { mono: ["ui-monospace", "SFMono-Regular", "monospace"] },
  },
}
```

### Component outline (`src/components/`)

- `ui/` — shadcn primitives (button, card, dialog, table, input, badge, tabs, progress)
- `layout/AppShell.tsx`, `layout/TopBar.tsx`, `layout/Nav.tsx`
- `keys/KeyTable.tsx`, `keys/NewKeyDialog.tsx`, `keys/BudgetProgress.tsx`
- `models/ModelCard.tsx`, `models/CostBadge.tsx`
- `usage/SpendChart.tsx`, `usage/FilterBar.tsx`, `usage/BreakdownCharts.tsx`
- `dashboard/StatCard.tsx`

---

## Implementation steps

1. Scaffold repo + `docker-compose.yml` (postgres + litellm) + `config.yaml` + `.env.example`
2. Run proxy, confirm schema auto-migrates to Postgres (`LiteLLM_*`) tables
3. Scaffold Next.js, env vars (`LITELLM_PROXY_URL`, `LITELLM_MASTER_KEY`, `DATABASE_URL`), Prisma schema
4. Build `lib/litellm.ts` + `lib/db.ts`; `/api/keys` CRUD scoped by `user_id`
5. Build Keys UI (create with alias/models/budget; list; revoke)
6. Build Postgres spend reader + usage summary API
7. Build Dashboard overview + Usage charts (Recharts)
8. Build Models catalog + base cost model view
9. Auth.js + Authentik OIDC layer (hosted login → JWT session → `user_id` scoping)
10. README + deploy notes (docker + `next build`)

---

## Environment variables

| Variable               | Used by        | Purpose                                  |
|------------------------|----------------|------------------------------------------|
| `DATABASE_URL`         | proxy, Next.js | Postgres connection string               |
| `LITELLM_MASTER_KEY`   | proxy, Next.js | Admin key for proxy management API       |
| `LITELLM_PROXY_URL`    | Next.js        | Base URL of the LiteLLM proxy            |
| `AUTH_SECRET`          | Next.js        | Auth.js JWT/session encryption secret    |
| `AUTH_URL`             | Next.js        | Public URL of this dashboard             |
| `AUTHENTIK_ISSUER`     | Next.js        | Authentik application OIDC issuer        |
| `AUTHENTIK_CLIENT_ID`  | Next.js        | Authentik confidential client ID         |
| `AUTHENTIK_CLIENT_SECRET` | Next.js     | Authentik confidential client secret     |
| `AUTHENTIK_ADMIN_GROUP` | Next.js       | Authentik group mapped to `admin`        |
| `OPENAI_API_KEY`       | proxy          | Central OpenAI credential                |
| `ANTHROPIC_API_KEY`    | proxy          | Central Anthropic credential             |
| `..._API_KEY`          | proxy          | Other central provider credentials       |
