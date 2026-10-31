<p align="center">
  <a href="https://docs.rivi.software/radiotools/api-reference/sdks">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/radiotools-wordmark-on-dark.svg">
      <img src="assets/radiotools-wordmark.svg" alt="RadioTools" width="280">
    </picture>
  </a>
</p>

<p align="center">
  Official SDKs for the RadioTools listener API, from <a href="https://rivi.software">RIVI Software</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rivi-software/radiotools-sdk"><img src="https://img.shields.io/npm/v/@rivi-software/radiotools-sdk?label=npm&color=0b6b3a" alt="npm version"></a>
  <a href="https://github.com/rivi-software/radiotools-sdk/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/rivi-software/radiotools-sdk/ci.yml?branch=main&label=CI" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0b6b3a" alt="MIT License"></a>
</p>

<p align="center">
  <a href="https://docs.rivi.software/radiotools/api-reference/sdks">Documentation</a>
  ·
  <a href="https://docs.rivi.software/radiotools/api-reference/sdks/typescript">TypeScript guide</a>
  ·
  <a href="https://support.rivi.software">Support</a>
  ·
  <a href="https://rivi.software">rivi.software</a>
</p>

<br>

[RadioTools](https://radiotools.rivi.software) is RIVI Software's workspace for radio stations. Stations use it to plan broadcasts, run rundowns, publish content and keep studio information up to date. These SDKs wrap its **listener API**, so your station website, app or encoder automation can use that data without building requests, following resource links or parsing responses by hand.

With the SDKs you can:

- read published content (news, presenters, shows, pages and any custom types), the schedule, shows, the current broadcast, now playing, track history and on-demand recordings
- show the weather and traffic the station publishes
- follow changes in real time over a WebSocket feed
- preview drafts on the station website
- report what your encoder or automation is playing (playback ingest)

All SDKs target **listener contract v1** and cover station-facing routes only. Studio administration and listener messages are out of scope.

## Quick start

```bash
npm install @rivi-software/radiotools-sdk
```

```ts
import { createStationClientFromEnv } from "@rivi-software/radiotools-sdk";

const client = createStationClientFromEnv();

const station = await client.getStation();
const nowPlaying = await client.getNowPlaying();
console.log(`${station.name}: ${nowPlaying.track?.title ?? "nothing on air"}`);
```

Set the [environment variables](#credentials) first, or pass the same values to `createStationClient`. The [TypeScript guide](https://docs.rivi.software/radiotools/api-reference/sdks/typescript) covers pagination, realtime updates, caching, errors and playback ingest.

## Choose an SDK

| You are building | Start with |
| --- | --- |
| A JavaScript or TypeScript backend for a listener site | [`@rivi-software/radiotools-sdk`](packages/sdk-typescript) |
| A Next.js site | [`@rivi-software/radiotools-sdk-next`](packages/sdk-next) |
| React, Vue or Svelte code that runs where the station key is safe, such as server rendering | The [React](packages/sdk-react), [Vue](packages/sdk-vue) or [Svelte](packages/sdk-svelte) binding |
| A static site, mobile app or smart-speaker skill for a station that allows anonymous reads | The TypeScript SDK or a framework binding, in the browser or on the device, without a key ([Anonymous reads](#anonymous-reads)) |
| An encoder or automation that reports now-playing tracks | `client.reportPlayback` in the TypeScript SDK, or `report_playback` and its equivalents in the [other languages](#other-languages) |
| A backend in another language | A [language starter](#other-languages), or a client generated from the [OpenAPI document](#other-ways-in) |

## Packages

### TypeScript and JavaScript

Published to npm and released together under one version number.

| Package | What it is |
| --- | --- |
| [`@rivi-software/radiotools-sdk`](packages/sdk-typescript) | The complete client: REST, GraphQL, realtime feed, ETag caching, retries and playback ingest |
| [`@rivi-software/radiotools-sdk-react`](packages/sdk-react) | React hooks |
| [`@rivi-software/radiotools-sdk-vue`](packages/sdk-vue) | Vue composables |
| [`@rivi-software/radiotools-sdk-svelte`](packages/sdk-svelte) | Svelte stores |
| [`@rivi-software/radiotools-sdk-next`](packages/sdk-next) | Next.js App Router server helpers (Next.js 14.2 or newer) |

The framework bindings wrap the TypeScript client. Install them together with it:

```bash
npm install @rivi-software/radiotools-sdk-react @rivi-software/radiotools-sdk
```

### Other languages

Starter REST clients, generated from the same contract. They cover authentication, the station document, weather, traffic and playback ingest, and return JSON as the language's native dictionary or map. The Python client also implements the other listener reads, and the Kotlin and Swift clients also read now playing.

| Language | Package | Built on | Install |
| --- | --- | --- | --- |
| Python | [`radiotools-sdk`](packages/sdk-python) | `httpx`, Python 3.11 or newer | Copy or vendor the folder |
| Go | [`github.com/rivi-software/radiotools-sdk/packages/sdk-go`](packages/sdk-go) | `net/http`, Go 1.22 or newer | `go get github.com/rivi-software/radiotools-sdk/packages/sdk-go` |
| .NET | [`RadioTools.Sdk`](packages/sdk-dotnet) | `HttpClient`, .NET 8 | Copy or vendor the folder |
| Ruby | [`radiotools_sdk`](packages/sdk-ruby) | `Net::HTTP` | Copy or vendor the folder |
| PHP | [`radiotools/sdk`](packages/sdk-php) | curl, PHP 8.2 or newer | Copy or vendor the folder |
| Kotlin | [`com.radiotools.sdk`](packages/sdk-kotlin) | OkHttp and kotlinx.serialization, JVM 17 (Android and JVM) | Copy or vendor the folder |
| Swift | [`RadioToolsSDK`](packages/sdk-swift) | `URLSession` with async/await, Swift 6, iOS 16 or macOS 13 | Swift Package Manager, by this repository's URL |

None of these are published to PyPI, NuGet, RubyGems, Packagist or Maven Central. See [Other languages](https://docs.rivi.software/radiotools/api-reference/sdks/other-languages) for a per-language method table and examples.

### Contract and tooling

| Package | What it is |
| --- | --- |
| [`@rivi-software/radiotools-contract`](packages/contract) | API manifest and GraphQL schema, the source of truth for the generator |
| [`@rivi-software/radiotools-sdk-generator`](packages/generator) | CLI that emits the framework bindings, language starters and OpenAPI document from the contract |
| [`openapi.json`](packages/openapi) | OpenAPI 3.1 and JSON Schema, generated from the Zod `sdkSchemas` |

## Feature support

| Capability | TypeScript | Other languages |
| --- | --- | --- |
| Published content, schedule, on-demand recordings, now playing, weather and traffic | Yes | Starter methods; some need extension |
| GraphQL transport | Yes | No |
| Realtime feed | Yes | No |
| ETag conditional reads | Yes | No |
| Automatic retries on `429` and `503` | Yes | No |
| Response validation | Yes (Zod) | No |
| Playback ingest | Yes | Yes |

The framework bindings wrap the station, current broadcast, now playing, the first page of on-demand recordings, weather and traffic. They take a client you create, so its transport, caching and retries apply to their reads too. For anything else, call the client directly.

## Credentials

Create keys in RadioTools under **Settings › Credentials**. See [Integrations](https://support.rivi.software/integrations) in the help center and [Authentication](https://docs.rivi.software/radiotools/api-reference/authentication) in the API reference.

| Use | Credential | Scope | Environment variable |
| --- | --- | --- | --- |
| Website, app or player backend | Station key, or none for a station that allows anonymous reads | `listener:read` | `RADIOTOOLS_API_TOKEN` |
| Encoder or automation | Integration credential for **Observed playback** | `ingest:write` | `RADIOTOOLS_INGEST_TOKEN` |

| Variable | Required | Purpose |
| --- | --- | --- |
| `RADIOTOOLS_BASE_URL` | Yes | RadioTools origin, for example `https://radiotools.rivi.software` |
| `RADIOTOOLS_STATION_SLUG` | Yes | The station to read from |
| `RADIOTOOLS_API_TOKEN` | For reads, unless the station allows anonymous reads | Station key with `listener:read` |
| `RADIOTOOLS_INGEST_TOKEN` | For playback ingest | Integration credential with `ingest:write` |

Pass the raw `rtm_…` value. The SDK adds the `Bearer ` prefix. The TypeScript SDK and the Python, Go, .NET, Ruby and PHP starters read these variables. The Kotlin and Swift starters take the values as arguments.

> [!IMPORTANT]
> Keep both keys on your server. Browser code should talk to your own backend, never to RadioTools with a station key. The realtime feed needs no key, so a browser can follow it directly.

### Anonymous reads

A station that switches on **Allow anonymous reads** (**Settings › Listener APIs**) needs no station key for its listener reads. Leave `RADIOTOOLS_API_TOKEN` unset and the SDK reads without one, from a server, a browser or an app. Anyone who knows the station slug can then read the same published data. Playback ingest still needs the ingest key. See [Anonymous reads](packages/sdk-typescript/README.md#anonymous-reads) in the TypeScript SDK.

## Versioning

The npm packages share one version number and are released together. Before 1.0, a minor release can change behavior or remove a method, so read the [changelog](packages/sdk-typescript/CHANGELOG.md) before you upgrade:

- Releases up to 0.8.1 refuse the traffic of a station whose traffic covers Belgium, Luxembourg or Germany, and keep showing a schedule or now playing that the realtime feed removed. Upgrade to 0.9.0 or later.
- Reading a station without a token, for anonymous reads, needs 0.8.0 or later.
- Releases up to 0.6.0 refuse a `nonstop` broadcast, and weather or traffic from a source other than Open-Meteo or ANWB. The API has sent these since 28 October 2026, so upgrade to 0.7.0 or later.

The starters for other languages carry versions of their own. The listener contract is versioned separately through `contractVersion`. See [Errors and versioning](https://docs.rivi.software/radiotools/api-reference/errors-and-versioning).

## Other ways in

- Download the [OpenAPI 3.1 document](https://docs.rivi.software/radiotools/openapi.json) to generate a client in any language, or to import into API tools. The same document is in [`packages/openapi`](packages/openapi).
- Use [GraphQL](https://docs.rivi.software/radiotools/api-reference/graphql) directly with any GraphQL client. The schema is in [`packages/contract/graphql`](packages/contract/graphql).

## Help and contributing

- **Questions about your account or station:** create a ticket at [support.rivi.software](https://support.rivi.software) or email [support@rivi.software](mailto:support@rivi.software).
- **Bugs, missing features and mistakes in the docs:** [open an issue](https://github.com/rivi-software/radiotools-sdk/issues/new). Issues are public, so never include your keys.
- **Security vulnerabilities:** report them privately, never in an issue. See the [Security policy](SECURITY.md).
- **Pull requests:** we don't accept them. RIVI Software maintains this repository. See [Contributing](CONTRIBUTING.md).
- **Conduct:** everyone who takes part in this project must follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

The rest of this README is for the RIVI Software maintainers of this repository.

## How it fits together

The TypeScript client is hand-written and complete (REST, GraphQL, WebSocket, ETag caching, retries, playback ingest). Everything else is generated from a single contract package, so every language and framework exposes the same surface.

```
contract (manifest + GraphQL schema)
   └─ generator ─┬─ sdk-react / vue / svelte / next   (wrap the TypeScript client)
                 ├─ sdk-python / go / dotnet / ruby / php / kotlin / swift   (REST stubs)
                 └─ openapi.json                       (from Zod schemas)
```

Only the TypeScript package has GraphQL, WebSocket, ETag and retry support. The Python client implements the REST listener reads with typed records for the four default content types; the other language SDKs are minimal REST stubs.

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

## Publish to npm

Publishable packages (fixed version group): `@rivi-software/radiotools-contract`, `@rivi-software/radiotools-sdk`, `@rivi-software/radiotools-sdk-react`, `@rivi-software/radiotools-sdk-vue`, `@rivi-software/radiotools-sdk-svelte`, `@rivi-software/radiotools-sdk-next`, `@rivi-software/radiotools-sdk-generator`.

### GitHub setup

1. Create an npm access token with **publish** rights to the `@rivi-software` scope.
2. Add repository secret **`NPM_TOKEN`** ([Settings → Secrets → Actions](https://github.com/rivi-software/radiotools-sdk/settings/secrets/actions)).
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

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 RIVI Software.

<br>

<p align="center">
  <a href="https://rivi.software">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/rivi-mark-on-dark.svg">
      <img src="assets/rivi-mark.svg" alt="RIVI Software" width="36" height="36">
    </picture>
  </a>
</p>

<p align="center">
  <sub>RadioTools is made by <a href="https://rivi.software">RIVI Software</a>.</sub>
</p>
