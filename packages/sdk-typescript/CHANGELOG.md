# @rivi-software/radiotools-sdk

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

### Patch Changes

- 103b633: Update development dependencies (react, svelte, vue, @types/bun).
