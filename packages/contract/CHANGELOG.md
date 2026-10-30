# @rivi-software/radiotools-contract

## 0.8.1

### Patch Changes

- 027938c: Depend on `zod` 4.6.7.

  **Fixed**

  - `@rivi-software/radiotools-sdk` and `@rivi-software/radiotools-sdk-generator` pinned `zod` 4.6.5, which can exhaust memory while validating oversized constrained collections ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)). They now pin 4.6.7.

## 0.8.0

### Minor Changes

- 5bce5f9: Read a station that allows anonymous reads without a token.

  A station can now switch on **Allow anonymous reads** under **Settings › Listener APIs**. Its listener REST and GraphQL reads then answer without an `Authorization` header, so a static site, a mobile app or a smart-speaker skill can call the API directly.

  **Changed**

  - `apiToken` is optional. `createStationClient` no longer throws when neither `apiToken` nor `ingestToken` is given, and listener reads and `subscribe` no longer throw "Listener API token (listener:read) is required": without a token they go out with no `Authorization` header. A station that has not switched anonymous reads on answers them with `401 UNAUTHENTICATED` (`RadioToolsApiError`), so the error now comes from the API instead of the client. A token you do pass is always sent and checked.
  - `createStationClientFromEnv` and `stationClientOptionsFromEnv` need only `RADIOTOOLS_BASE_URL` and `RADIOTOOLS_STATION_SLUG`; both tokens are optional.
  - GraphQL preview (`previewEditorial` with `transport: "graphql"`) no longer requires `apiToken`; it sends the grant in `X-Preview-Grant` and the token only when there is one.
  - The Python, Go, Ruby, PHP, .NET, Kotlin and Swift clients build without a token and send listener reads without `Authorization` when they have none. Playback ingest still requires the ingest token in every client.
  - The OpenAPI document lists listener reads with the station key or no security (`[{ bearerListener: [] }, {}]`), and their `401` as a token that is missing on a station that requires one, or invalid, expired, revoked, wrong-scope or cross-station. `RADIOTOOLS_API_TOKEN` no longer claims the realtime socket needs it; the socket was already anonymous.

## 0.7.0

### Minor Changes

- e20443d: Follow the listener API's on-demand recordings, show types and station-chosen weather and traffic sources.

  **Added**

  - `getOnDemand({ programId?, cursor?, limit? })` and `iterateOnDemand` read the published recordings of aired broadcasts from `station.resources.onDemand`, over REST and GraphQL. Each item is the broadcast as the schedule shows it, plus `description` and `audio` (an anonymous, byte-range capable URL, its `mime`, `size` and `durationSeconds`). `getOnDemand` answers `null` when the station offers none, without a second request, as `getWeather` and `getTraffic` do. `SdkPublicOnDemand`, `SdkPublicOnDemandBroadcast` and `sdkSchemas.PublicOnDemand` are exported. The Python client has `get_on_demand`; the React, Vue, Svelte and Next.js bindings have `useGetOnDemand`, `createGetOnDemandStore`, `fetchGetOnDemand` and `jsonResponseOnDemand`; the OpenAPI document lists `GET …/on-demand`; the GraphQL schema has the `onDemand` query with its `OnDemand`, `OnDemandBroadcast` and `OnDemandAudio` types and `StationResources.onDemand`.
  - Shows have a `type`: `live`, `nonstop` or `prerecorded` (`SdkShowType`). A show without one, from an older payload, reads as `live`.

  **Fixed**

  - A broadcast whose `nature` is `nonstop` (automation playing music) parses. The API added `nonstop` next to `live`, `prerecorded` and `repeat`, so a schedule, current broadcast or realtime schedule event that held one failed validation. `SdkBroadcastNature` is exported.
  - Weather and traffic from a source the station chose parse. `snapshots[].source` and `snapshot.source` were the literals `"open-meteo"` and `"anwb"`; they are now any non-empty string, so a station on OpenWeatherMap (`"openweathermap"`), NDW (`"ndw"`) or its own feed (`"station"`) no longer fails every weather or traffic read, and a source a later RadioTools release adds needs no SDK release. OpenWeatherMap asks for a visible credit, "Weather data provided by OpenWeather".

## 0.6.0

### Minor Changes

- 81360f5: The SDKs follow the listener API's removal of `programs` and its GraphQL error statuses.

  **Removed**

  - `getPrograms`, `SdkPublicPrograms` and `sdkSchemas.PublicPrograms`, the contract's `getPrograms` method, the Python client's `get_programs` and the OpenAPI `GET …/programs` operation. The API removed the `programs` alias of shows, so `getPrograms` could only fail. Use `getShows`, which returns the same shows.

  **Changed**

  - `resources.programs` in the station document is optional and deprecated: the API sends it as `null`, and the SDK no longer needs it, so a station document without it parses. The GraphQL station query no longer selects it.

  **Fixed**

  - A GraphQL request in which no selected field answered throws a `RadioToolsGraphqlError` with the error's `code`, as a `200` response with errors already did. The API answers such a request with the most severe error's status, for example `400` for `VALIDATION_ERROR`, which the SDK reported as a bare "RadioTools request failed (400)". With `transport: "auto"`, a GraphQL `NOT_FOUND` for one field no longer falls back to REST; only a missing GraphQL route does.

## 0.5.0

### Minor Changes

- 04a2477: The GraphQL schema in `@rivi-software/radiotools-contract` matches the listener API again.

  **Changed**

  - Every query field except `station` is nullable: `schemas`, `content`, `contentRecord`, `contentBySlug`, `schedule`, `shows`, `currentBroadcast`, `nowPlaying` and `trackHistory`, as `weather` and `traffic` already were. A field that fails answers `null` with its error, and the fields beside it keep their data. Types you generate from `@rivi-software/radiotools-contract/graphql` change: regenerate them and handle a `null` query field.
  - The `programs` query and its `Programs`, `ProgramSummary` and `ProgramSlot` types are gone from the schema, as they are from the API. `resources.programs` stays, deprecated and always `null`. `delivery.cache` carries its deprecation.

  The SDK's methods are unchanged: each sends one query field and throws on its error, as before.

## 0.4.1

### Patch Changes

- d48c84f: Make the framework bindings installable and correct where the SDKs drifted from the listener API.

  **Fixed**

  - The React, Vue, Svelte and Next.js bindings and the generator install from npm again. Every release since 0.2.0 declared the core SDK (and, for the generator, the contract) as `workspace:*`, which npm cannot install; they now use a normal version range.
  - The React hooks (`useGetStation`, `useGetNowPlaying` and the others) fetch once when they mount instead of fetching again after every render, and a slow earlier response no longer overwrites a newer one. A new `client` passed to a hook starts a new fetch.
  - `getSchedule`, `getShows` and `getPrograms` accept windows of up to 42 inclusive days, as the API does (was 31).
  - `getStation`, and every read that starts from the station document, no longer fails when `delivery.cache` or `delivery.conditional` is a value other than `no-store` or `etag`. Both are typed as `string` now; the API has deprecated `delivery.cache`.
  - Starter clients outside npm: the Kotlin client returns `null` from `getWeather` and `getTraffic` when the station does not publish them, and its request errors name the URL. The Go module path is now `github.com/rivi-software/radiotools-sdk/packages/sdk-go`, so `go get` resolves it. `Package.swift` is at the repository root, so Swift Package Manager can add the repository by URL.

- c937617: Publish every npm package as built JavaScript with type declarations.

  **Fixed**

  - The core SDK, the contract and the React, Vue, Svelte and Next.js bindings shipped their TypeScript source, which Node.js cannot load from `node_modules`. A server-side Node script could not import them, and a Next.js app needed `transpilePackages`. They now ship ES modules and `.d.ts` files in `dist/`, so Node.js imports them directly and Next.js needs no extra configuration.
  - The generator's published build did not run: its relative imports had no file extension, and `dist/cli.js` started with two shebang lines. `radiotools-sdk-generate` and importing `@rivi-software/radiotools-sdk-generator` now work in Node.js.

## 0.4.0

### Minor Changes

- 5247f4b: Follow the fixed RadioTools content schema. Every station has the same four content types, `news`, `presenters`, `shows` and `pages`, and `getContent`, `getContentBySlug` and `iterateContent` now return their records typed (`SdkPublishedNews`, `SdkPublishedPresenter`, `SdkPublishedShow`, `SdkPublishedPage`); any other type keeps `SdkPublishedRecord`, and `asContentType(record, type)` narrows a record whose type is only known at runtime. Programs are now shows: `getShows` reads `resources.shows` (REST and GraphQL), and `getPrograms` is deprecated. The station document parses `resources.shows`, which every server since RadioTools 1.11.0 sends. The Python client now implements the listener reads, with typed records for the four default types.

## 0.3.0

### Minor Changes

- ea21861: Sync with the current RadioTools listener API.

  **Breaking**

  - `station.resources.socket` is replaced by `station.resources.realtime` (`{ url, channel }`, or `null` when realtime is off). `subscribe` now follows the station's anonymous public feed WebSocket: it starts from the current state, reconnects with backoff, and no longer sends the listener token or needs an authenticated socket adapter. `createSocket` takes only the URL, and the `window` argument is gone (the feed covers today through seven days later).
  - `subscribePublicSocket` is replaced by `subscribePublicFeed({ realtime, stationId, handlers })`, which also works in browsers. `PublicSocketHandlers` and `PublicSocketSubscription` remain as deprecated aliases.
  - Content cursors (`nextCursor`) are opaque strings instead of UUIDs.

  **Added**

  - `getContent` takes `sort` (`publishedAt` | `updatedAt`), `direction` and structured filters (`eq`, `contains`, `anyOf`); filters now also work over GraphQL.
  - `getContentBySlug(type, slug)`; former slugs resolve to the current record.
  - `readPreviewHandoff` reads the draft preview form that Studio's "Open on website" posts.
  - Schemas: station `profile`; record `firstPublishedAt` and `related.programIds`; media `alt`, dimensions and `variants` (`thumb`, `display`, `card`, `square`); programme `presenters` and `slots`; broadcast `nature`; traffic incident `cause` and `closure`; multi-select choice fields (`multiple`); inline links and list blocks in editorial documents; the `MODULE_DISABLED` error code and richer error issues.
  - `publicMediaUrl` accepts the `card` and `square` variants.

  **Fixed**

  - Station, content, schema and traffic responses from the current API no longer fail validation.
  - The generated OpenAPI document lists `getContent` (it was overwritten by `getContentRecord`) and uses the real `now-playing`, `track-history` and `broadcast/current` paths.

## 0.2.2

### Patch Changes

- Add package READMEs with install and usage instructions.

## 0.2.1
