# @rivi-software/radiotools-sdk-generator

## 0.5.0

### Minor Changes

- 04a2477: The GraphQL schema in `@rivi-software/radiotools-contract` matches the listener API again.

  **Changed**

  - Every query field except `station` is nullable: `schemas`, `content`, `contentRecord`, `contentBySlug`, `schedule`, `shows`, `currentBroadcast`, `nowPlaying` and `trackHistory`, as `weather` and `traffic` already were. A field that fails answers `null` with its error, and the fields beside it keep their data. Types you generate from `@rivi-software/radiotools-contract/graphql` change: regenerate them and handle a `null` query field.
  - The `programs` query and its `Programs`, `ProgramSummary` and `ProgramSlot` types are gone from the schema, as they are from the API. `resources.programs` stays, deprecated and always `null`. `delivery.cache` carries its deprecation.

  The SDK's methods are unchanged: each sends one query field and throws on its error, as before.

### Patch Changes

- Updated dependencies [04a2477]
  - @rivi-software/radiotools-contract@0.5.0
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
  - @rivi-software/radiotools-contract@0.4.1
  - @rivi-software/radiotools-sdk@0.4.1

## 0.4.0

### Minor Changes

- 5247f4b: Follow the fixed RadioTools content schema. Every station has the same four content types, `news`, `presenters`, `shows` and `pages`, and `getContent`, `getContentBySlug` and `iterateContent` now return their records typed (`SdkPublishedNews`, `SdkPublishedPresenter`, `SdkPublishedShow`, `SdkPublishedPage`); any other type keeps `SdkPublishedRecord`, and `asContentType(record, type)` narrows a record whose type is only known at runtime. Programs are now shows: `getShows` reads `resources.shows` (REST and GraphQL), and `getPrograms` is deprecated. The station document parses `resources.shows`, which every server since RadioTools 1.11.0 sends. The Python client now implements the listener reads, with typed records for the four default types.

### Patch Changes

- Updated dependencies [5247f4b]
  - @rivi-software/radiotools-contract@0.4.0
  - @rivi-software/radiotools-sdk@0.4.0

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

### Patch Changes

- Updated dependencies [ea21861]
  - @rivi-software/radiotools-contract@0.3.0
  - @rivi-software/radiotools-sdk@0.3.0

## 0.2.2

### Patch Changes

- Add package READMEs with install and usage instructions.
- Updated dependencies
  - @rivi-software/radiotools-contract@0.2.2
  - @rivi-software/radiotools-sdk@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [103b633]
  - @rivi-software/radiotools-sdk@0.2.1
  - @rivi-software/radiotools-contract@0.2.1
