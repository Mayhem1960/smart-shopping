# Smart Shopping

Expo / React Native app for barcode scanning, pantry tracking, and auto-generated
shopping lists. Originally built on Replit; now developed locally.

## Repo shape

This is a **pnpm workspace monorepo**, not a single app.

| Path | What it is | Status |
| --- | --- | --- |
| `artifacts/mobile` | **The Expo app. This is the product.** | Active |
| `artifacts/api-server` | Express 5 API server | Skeleton — only a `/health` route |
| `artifacts/mockup-sandbox` | Vite + Tailwind design playground | Scratch space, not shipped |
| `lib/db` | Postgres schema via Drizzle ORM | Scaffolding, not used by the app |
| `lib/api-spec` | OpenAPI spec + Orval codegen config | Scaffolding |
| `lib/api-zod` | Zod schemas generated from the spec | Scaffolding |
| `lib/api-client-react` | Generated React Query hooks | Scaffolding |
| `scripts` | Workspace utility scripts | — |
| `attached_assets` | Screenshots and reference images from design chats | Not app assets |

**Important:** the mobile app does not talk to `api-server` or `lib/db` today. All
state is persisted on-device with AsyncStorage. Treat the backend packages as
unfinished groundwork; don't assume a request flows through them.

## Mobile app layout (`artifacts/mobile`)

Routing is **expo-router** (file-based), with typed routes enabled.

```
app/
  _layout.tsx          root layout
  (tabs)/
    _layout.tsx        tab bar
    index.tsx          home
    scan.tsx           barcode scanning
    pantry.tsx         pantry inventory
    list.tsx           shopping list
  product/[id].tsx     product detail
  transfer.tsx         data transfer / backup screen
  +not-found.tsx
components/            presentational components + modals
context/               ShoppingContext, PromotionsContext — app-wide state
hooks/                 useColors
lib/
  storage.ts           AsyncStorage read/write — source of truth for persistence
  predictions.ts       restock prediction logic
  productLookup.ts     barcode -> product resolution
  promotions.ts        nearby store promotions
  backup.ts            export/import
```

State lives in the two React contexts, backed by `lib/storage.ts`. If you change
the shape of a stored object, handle migration of existing on-device data —
users will have old JSON in AsyncStorage under `@smartshopping/*` keys.

## Running it

Always use **pnpm**. The root `preinstall` hook fails deliberately on npm/yarn.

```bash
pnpm install                      # from repo root
cd artifacts/mobile
npx expo start                    # dev server
```

Do **not** use `pnpm dev` in `artifacts/mobile` — that script sets
`EXPO_PACKAGER_PROXY_URL`, `REPLIT_EXPO_DEV_DOMAIN` and `REPL_ID`, which only
exist inside Replit. Off-platform it will not connect correctly.

Other commands:

```bash
pnpm run typecheck                # whole workspace (root)
pnpm --filter @workspace/mobile run typecheck
pnpm run build                    # typecheck + build all packages
```

Run typecheck before considering a change done. There is no test suite yet.

## Building / releasing

EAS config is `artifacts/mobile/eas.json`; run EAS commands **from that
directory**, not the repo root.

```bash
cd artifacts/mobile
eas build --platform android --profile preview      # APK
eas build --platform android --profile production   # AAB
```

Expo config: `artifacts/mobile/app.json` (owner `mayhem1960`, slug `mobile`,
Android package `com.smartshopping.app`). The root `app.json` is an empty
Replit stub — ignore it, and don't edit it expecting an effect.

## Gotchas

- **pnpm only.** npm and yarn are blocked by the root preinstall script.
- **Platform overrides.** `pnpm-workspace.yaml` contains an `overrides` block
  that excludes every non-linux-x64 native binary (esbuild, rollup,
  lightningcss, `@tailwindcss/oxide`, ngrok) because Replit runs linux-x64.
  On macOS or Windows these need to be removed or installs will break.
- **`minimumReleaseAge: 1440`** blocks npm versions published in the last 24h.
  This is an intentional supply-chain guard. Do not disable it. Use
  `minimumReleaseAgeExclude` if a specific package is genuinely urgent.
- **Catalog versions.** `react`, `react-dom`, `zod`, `@tanstack/react-query` and
  others resolve via `catalog:` in `pnpm-workspace.yaml`. Change the version
  there, not in individual package.json files. `react` is pinned to 19.1.0
  because Expo requires that exact version.
- **React Compiler is enabled** (`experiments.reactCompiler`). Avoid patterns
  that violate the rules of hooks; the compiler will complain.
- **New Architecture is on** (`newArchEnabled: true`). Check any new native
  dependency for Fabric/TurboModule support before adding it.
- `replit.md`, `.replit`, `.replitignore` are Replit platform files. Harmless,
  but not a source of truth for anything.

## Environment

Nothing is required to run the mobile app — no `.env`, no database.

`DATABASE_URL` (Postgres) is only needed if you start working on `lib/db` or
`artifacts/api-server`. No secrets are committed to this repo; keep it that way.

## Conventions

- TypeScript throughout, strict. No `any` without a comment explaining why.
- Follow the existing component style in `components/` — StyleSheet objects at
  the bottom of the file, colours via the `useColors` hook rather than literals.
- Keep business logic in `lib/`, not inside screen components.
- Work on a branch and open a PR rather than committing to `main`.
