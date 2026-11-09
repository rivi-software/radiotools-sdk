# @rivi-software/radiotools-sdk-vue

## 0.9.0

### Minor Changes

- 1180618: Read a broadcast's, show slot's or on-demand item's end the way a schedule shows it.

  The listener API added `endTime` to broadcasts, show slots and on-demand items, over REST and GraphQL: the end as `HH:MM` in the item's `timezone`. A show that ends at midnight reads `23:59`, not `00:00`. `endsAt` stays the exact end.

  **Added**

  - `endTime` on what `getSchedule`, `getCurrentBroadcast`, `getShows` (each slot), `getOnDemand` and `iterateOnDemand` return, and on the realtime feed's schedule. The GraphQL queries select it.
  - `endTime` in the GraphQL schema and the OpenAPI document.

  **Changed**

  - `endTime` is required. Code that builds these types itself, such as a test fixture typed as `SdkPublicSchedule`, `SdkPublicProgramSlot` or `SdkPublicOnDemandBroadcast`, needs to set it.

- f107230: Read traffic from every traffic country, and clear a schedule, on-air state or now playing that the realtime feed removed.

  A station's traffic can now cover the Netherlands, Belgium, Luxembourg or Germany, and come from TomTom or HERE on the station's own key. The realtime feed now removes a station's now-playing row when it switches its now-playing API off, and its schedule and on-air rows when it switches its schedule API off.

  **Fixed**

  - `getTraffic` no longer throws for a station whose traffic covers Belgium, Luxembourg or Germany. Watched roads have `{country}:{road}` ids (`nl:a12`, `be:e40`, `de:a3`), and the OpenAPI document says so.
  - `subscribe` and `subscribePublicFeed` report a removed schedule, on-air or now-playing row as `null` to `onSchedule`, `onAir` or `onNowPlaying`. Before, the SDK dropped the removal and an app kept showing the old schedule or track.
  - A (re)connect whose snapshot has no schedule, on-air or now-playing row reports that kind as `null` once the snapshot ends. The SDK sends one `ping` when the socket opens, and the feed's `pong` follows the snapshot's last row.
  - The feed's reconnect backoff resets once a snapshot arrives, not when the socket opens, so a feed that keeps refusing connections is retried with a growing delay.

  **Changed**

  - `onSchedule` and `onNowPlaying` take `null` as well as data, as `onAir` already did. TypeScript callers that read the data without checking for `null` need a `?.` or a check.

### Patch Changes

- Updated dependencies [1180618]
- Updated dependencies [f107230]
  - @rivi-software/radiotools-sdk@0.9.0

## 0.8.1

### Patch Changes

- 027938c: Depend on `zod` 4.6.7.

  **Fixed**

  - `@rivi-software/radiotools-sdk` and `@rivi-software/radiotools-sdk-generator` pinned `zod` 4.6.5, which can exhaust memory while validating oversized constrained collections ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)). They now pin 4.6.7.

- Updated dependencies [027938c]
  - @rivi-software/radiotools-sdk@0.8.1

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

### Patch Changes

- Updated dependencies [5bce5f9]
  - @rivi-software/radiotools-sdk@0.8.0

## 0.7.0

### Minor Changes

- e20443d: Follow the listener API's on-demand recordings, show types and station-chosen weather and traffic sources.

  **Added**

  - `getOnDemand({ programId?, cursor?, limit? })` and `iterateOnDemand` read the published recordings of aired broadcasts from `station.resources.onDemand`, over REST and GraphQL. Each item is the broadcast as the schedule shows it, plus `description` and `audio` (an anonymous, byte-range capable URL, its `mime`, `size` and `durationSeconds`). `getOnDemand` answers `null` when the station offers none, without a second request, as `getWeather` and `getTraffic` do. `SdkPublicOnDemand`, `SdkPublicOnDemandBroadcast` and `sdkSchemas.PublicOnDemand` are exported. The Python client has `get_on_demand`; the React, Vue, Svelte and Next.js bindings have `useGetOnDemand`, `createGetOnDemandStore`, `fetchGetOnDemand` and `jsonResponseOnDemand`; the OpenAPI document lists `GET …/on-demand`; the GraphQL schema has the `onDemand` query with its `OnDemand`, `OnDemandBroadcast` and `OnDemandAudio` types and `StationResources.onDemand`.
  - Shows have a `type`: `live`, `nonstop` or `prerecorded` (`SdkShowType`). A show without one, from an older payload, reads as `live`.

  **Fixed**

  - A broadcast whose `nature` is `nonstop` (automation playing music) parses. The API added `nonstop` next to `live`, `prerecorded` and `repeat`, so a schedule, current broadcast or realtime schedule event that held one failed validation. `SdkBroadcastNature` is exported.
  - Weather and traffic from a source the station chose parse. `snapshots[].source` and `snapshot.source` were the literals `"open-meteo"` and `"anwb"`; they are now any non-empty string, so a station on OpenWeatherMap (`"openweathermap"`), NDW (`"ndw"`) or its own feed (`"station"`) no longer fails every weather or traffic read, and a source a later RadioTools release adds needs no SDK release. OpenWeatherMap asks for a visible credit, "Weather data provided by OpenWeather".

### Patch Changes

- Updated dependencies [e20443d]
  - @rivi-software/radiotools-sdk@0.7.0

## 0.6.0

### Minor Changes

- 81360f5: The SDKs follow the listener API's removal of `programs` and its GraphQL error statuses.

  **Removed**

  - `getPrograms`, `SdkPublicPrograms` and `sdkSchemas.PublicPrograms`, the contract's `getPrograms` method, the Python client's `get_programs` and the OpenAPI `GET …/programs` operation. The API removed the `programs` alias of shows, so `getPrograms` could only fail. Use `getShows`, which returns the same shows.

  **Changed**

  - `resources.programs` in the station document is optional and deprecated: the API sends it as `null`, and the SDK no longer needs it, so a station document without it parses. The GraphQL station query no longer selects it.

  **Fixed**

  - A GraphQL request in which no selected field answered throws a `RadioToolsGraphqlError` with the error's `code`, as a `200` response with errors already did. The API answers such a request with the most severe error's status, for example `400` for `VALIDATION_ERROR`, which the SDK reported as a bare "RadioTools request failed (400)". With `transport: "auto"`, a GraphQL `NOT_FOUND` for one field no longer falls back to REST; only a missing GraphQL route does.

### Patch Changes

- Updated dependencies [81360f5]
  - @rivi-software/radiotools-sdk@0.6.0

## 0.5.0

### Minor Changes

- 04a2477: The GraphQL schema in `@rivi-software/radiotools-contract` matches the listener API again.

  **Changed**

  - Every query field except `station` is nullable: `schemas`, `content`, `contentRecord`, `contentBySlug`, `schedule`, `shows`, `currentBroadcast`, `nowPlaying` and `trackHistory`, as `weather` and `traffic` already were. A field that fails answers `null` with its error, and the fields beside it keep their data. Types you generate from `@rivi-software/radiotools-contract/graphql` change: regenerate them and handle a `null` query field.
  - The `programs` query and its `Programs`, `ProgramSummary` and `ProgramSlot` types are gone from the schema, as they are from the API. `resources.programs` stays, deprecated and always `null`. `delivery.cache` carries its deprecation.

  The SDK's methods are unchanged: each sends one query field and throws on its error, as before.

### Patch Changes

- Updated dependencies [04a2477]
  - @rivi-software/radiotools-sdk@0.5.0

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

- Updated dependencies [d48c84f]
- Updated dependencies [c937617]
  - @rivi-software/radiotools-sdk@0.4.1

## 0.4.0

### Patch Changes

- Updated dependencies [5247f4b]
  - @rivi-software/radiotools-sdk@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [ea21861]
  - @rivi-software/radiotools-sdk@0.3.0

## 0.2.2

### Patch Changes

- Add package READMEs with install and usage instructions.
- Updated dependencies
  - @rivi-software/radiotools-sdk@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [103b633]
  - @rivi-software/radiotools-sdk@0.2.1
