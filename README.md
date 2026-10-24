<img src="assets/icon.svg" width="64" height="64" alt="">

# RadioTools SDK monorepo

Customer SDKs for **radio stations** using the RadioTools listener API (contract v1). Studio administration routes are out of scope.

The TypeScript client is hand-written and complete (REST, GraphQL, WebSocket, ETag caching, retries, playback ingest). Everything else is generated from a single contract package, so every language and framework exposes the same surface.

Licensed under the [MIT License](LICENSE).

## Quick start

```bash
npm install @rivi-software/radiotools-sdk
```

```ts
import { createStationClientFromEnv } from "@rivi-software/radiotools-sdk";

const client = createStationClientFromEnv();
const nowPlaying = await client.getNowPlaying();
console.log(nowPlaying.track?.title);
```

See [Credentials](#credentials) for the environment variables. Using a framework? Pick the binding below: [React](packages/sdk-react), [Vue](packages/sdk-vue), [Svelte](packages/sdk-svelte) or [Next.js](packages/sdk-next).

## How it fits together

```
contract (manifest + GraphQL schema)
   └─ generator ─┬─ sdk-react / vue / svelte / next   (wrap the TypeScript client)
                 ├─ sdk-python / go / dotnet / ruby / php / kotlin / swift   (REST stubs)
                 └─ openapi.json                       (from Zod schemas)
```

Only the TypeScript package has GraphQL, WebSocket, ETag and retry support. The Python client implements the REST listener reads with typed records for the four default content types; the other language SDKs are minimal REST stubs.

## Packages

| Package | Description |
| --- | --- |
| [`@rivi-software/radiotools-contract`](packages/contract) | API manifest and GraphQL schema — source of truth for generators |
| [`@rivi-software/radiotools-sdk-generator`](packages/generator) | CLI to emit framework SDKs from the contract |
| [`@rivi-software/radiotools-sdk`](packages/sdk-typescript) | Full TypeScript client (REST, GraphQL, WebSocket, ETag, retries) |
| [`@rivi-software/radiotools-sdk-react`](packages/sdk-react) | React hooks (generated; wraps `@rivi-software/radiotools-sdk`) |
| [`@rivi-software/radiotools-sdk-vue`](packages/sdk-vue) | Vue composables (generated) |
| [`@rivi-software/radiotools-sdk-svelte`](packages/sdk-svelte) | Svelte stores (generated) |
| [`@rivi-software/radiotools-sdk-next`](packages/sdk-next) | Next.js App Router server helpers (generated) |
| [`radiotools-sdk`](packages/sdk-python) | Python `httpx` client (generated) |
| [`github.com/rivi-software/radiotools-sdk/packages/sdk-go`](packages/sdk-go) | Go `net/http` stubs (generated) |
| [`RadioTools.Sdk`](packages/sdk-dotnet) | .NET `HttpClient` stubs (generated) |
| [`radiotools_sdk`](packages/sdk-ruby) | Ruby `Net::HTTP` stubs (generated) |
| [`radiotools/sdk`](packages/sdk-php) | PHP curl stubs (generated) |
| [`openapi.json`](packages/openapi) | OpenAPI 3.1 + JSON Schema from Zod `sdkSchemas` (generated) |
| [`sdk-kotlin`](packages/sdk-kotlin) | Kotlin/Android OkHttp stubs (generated) |
| [`RadioToolsSDK`](packages/sdk-swift) | Swift URLSession stubs (generated) |

## Development

```bash
bun install              # also builds every npm package
bun run generate
bun run build
bun run check
bun test
bun run check:packages   # pack each npm package and import it from plain Node
```

The npm packages publish compiled JavaScript and type declarations from `dist/`, and the workspace packages resolve each other through `dist/` as well. After changing a package, run `bun run build` before typechecking the packages that depend on it. Relative imports in the TypeScript sources end in `.js`, as Node's ESM resolution requires.

## Publish to npm

Publishable packages (fixed version group): `@rivi-software/radiotools-contract`, `@rivi-software/radiotools-sdk`, `@rivi-software/radiotools-sdk-react`, `@rivi-software/radiotools-sdk-vue`, `@rivi-software/radiotools-sdk-svelte`, `@rivi-software/radiotools-sdk-next`, `@rivi-software/radiotools-sdk-generator`.

### GitHub setup

1. Create an npm access token with **publish** rights to the `@rivi-software` scope.
2. Add repository secret **`NPM_TOKEN`** ([Settings → Secrets → Actions](https://github.com/RIVI-Software/radiotools-sdk/settings/secrets/actions)).
3. Enable **npm provenance** for the org (recommended; workflows request `id-token: write`).

Packages publish as **`public`** on npm (MIT license).

### Automated release (Changesets)

On every push to `main`, [`.github/workflows/release-npm.yml`](.github/workflows/release-npm.yml) either opens a **Version packages** PR or publishes when that PR is merged:

```bash
bunx changeset          # describe the change
# merge the version PR from CI
# CI runs generate → build → test → npm publish
```

### Manual publish

**From your machine** (no npm provenance — that needs GitHub Actions):

```bash
npm login   # or export NODE_AUTH_TOKEN=...
bash scripts/publish-npm-ordered.sh
```

**From GitHub Actions** — [`.github/workflows/publish-npm-manual.yml`](.github/workflows/publish-npm-manual.yml) sets `GITHUB_ACTIONS=true`, so the script adds `--provenance`. Start with **dry run** enabled to validate tarballs.

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pull requests and `main`: `generate`, build, typecheck, tests, and `check:packages`, which packs each npm package, installs the tarballs into an empty project and imports them from plain Node.

CI and the `prepare` jobs in both npm workflows use **`depot-ubuntu-24.04`** (x64, 2 vCPU, 8 GB RAM). These SDK jobs are small: the successful CI run [38193029375](https://github.com/rivi-software/radiotools-sdk/actions/runs/38193029375) completed its job in 19 seconds, including a 9-second typecheck, on GitHub's previous runner. Two CPUs are the initial cost-conscious choice; this is a baseline, not a measured Depot speedup. Ubuntu 24.04 and x64 keep the OS and native tool architecture consistent.

The npm workflows generate, build, typecheck, test and run `check:packages` on Depot, then transfer prepared packages as a one-day artifact to their final `release` or `publish` job on **GitHub-hosted `ubuntu-24.04`**. The archive excludes `node_modules` and preserves file permissions. Only a successful preparation job permits publishing. The final jobs retain their npm authentication and OIDC permissions: [npm trusted publishing currently requires GitHub-hosted runners](https://docs.npmjs.com/trusted-publishers/). The automated release uses the prepared files directly rather than repeating generation and verification; local `bun run release-packages` still performs all checks.

Before merging, an organization owner must [connect Depot's GitHub App](https://depot.dev/docs/github-actions/quickstart) to `rivi-software/radiotools-sdk` and approve repository access. For a public repository, its Actions runner group must also allow public repositories. Without this setup, Depot jobs remain queued. Runner labels are registered in [`.github/actionlint.yaml`](.github/actionlint.yaml) for workflow linting. GitHub-managed default CodeQL and Dependabot workflows are outside these repository workflow files.

Tune each job using several comparable runs of the same commit: record queue time, execution time, peak CPU/memory and billed minutes in Depot. The [4 CPU / 16 GB runner costs twice the base runner rate](https://depot.dev/docs/github-actions/runner-types); choose it only if measured latency or memory needs justify the extra cost. A cost-neutral CPU upgrade needs at least a 50% reduction in execution time. No larger, Arm, macOS or Windows worker is needed for the current workloads.

Generate one target:

```bash
bun run --filter @rivi-software/radiotools-sdk-generator generate --target python
bun run --filter @rivi-software/radiotools-sdk-generator generate --target react
bun run --filter @rivi-software/radiotools-sdk-generator generate --target vue
bun run --filter @rivi-software/radiotools-sdk-generator generate --target openapi
# go, csharp, ruby, php, svelte — same pattern
```

List generator targets:

```bash
bun run --filter @rivi-software/radiotools-sdk-generator list-targets
```

## Adding a new SDK target

1. Extend [`packages/contract/src/manifest.ts`](packages/contract/src/manifest.ts) if the public surface changed.
2. Add a target module under [`packages/generator/src/targets/`](packages/generator/src/targets/) and register it in [`packages/generator/src/engine.ts`](packages/generator/src/engine.ts).
3. Add a `packages/sdk-<name>/` package for the emitted code and wire `bun run generate`.

## TypeScript SDK (`@rivi-software/radiotools-sdk`)

See [`packages/sdk-typescript`](packages/sdk-typescript).

### Credentials

Create keys in RadioTools under **Settings → API credentials**.

| Use | Credential | Scope |
| --- | --- | --- |
| Website, app, or player backend | Station key | `listener:read` |
| Encoder or automation | Integration key named `playback` | `ingest:write` |

Store them as `RADIOTOOLS_API_TOKEN` and `RADIOTOOLS_INGEST_TOKEN`. Pass the raw `rtm_…` value. The SDK adds the `Bearer ` prefix.

Also set `RADIOTOOLS_BASE_URL` and `RADIOTOOLS_STATION_SLUG`.

```ts
import { createStationClient, createStationClientFromEnv } from "@rivi-software/radiotools-sdk";

const client = createStationClientFromEnv();
```

Examples for content filters and slugs, realtime, draft preview and playback ingest are in [`packages/sdk-typescript/README.md`](packages/sdk-typescript/README.md).
