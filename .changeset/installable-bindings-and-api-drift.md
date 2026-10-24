---
"@rivi-software/radiotools-contract": patch
"@rivi-software/radiotools-sdk": patch
"@rivi-software/radiotools-sdk-react": patch
"@rivi-software/radiotools-sdk-vue": patch
"@rivi-software/radiotools-sdk-svelte": patch
"@rivi-software/radiotools-sdk-next": patch
"@rivi-software/radiotools-sdk-generator": patch
---

Make the framework bindings installable and correct where the SDKs drifted from the listener API.

**Fixed**

- The React, Vue, Svelte and Next.js bindings and the generator install from npm again. Every release since 0.2.0 declared the core SDK (and, for the generator, the contract) as `workspace:*`, which npm cannot install; they now use a normal version range.
- The React hooks (`useGetStation`, `useGetNowPlaying` and the others) fetch once when they mount instead of fetching again after every render, and a slow earlier response no longer overwrites a newer one. A new `client` passed to a hook starts a new fetch.
- `getSchedule`, `getShows` and `getPrograms` accept windows of up to 42 inclusive days, as the API does (was 31).
- `getStation`, and every read that starts from the station document, no longer fails when `delivery.cache` or `delivery.conditional` is a value other than `no-store` or `etag`. Both are typed as `string` now; the API has deprecated `delivery.cache`.
- Starter clients outside npm: the Kotlin client returns `null` from `getWeather` and `getTraffic` when the station does not publish them, and its request errors name the URL. The Go module path is now `github.com/rivi-software/radiotools-sdk/packages/sdk-go`, so `go get` resolves it. `Package.swift` is at the repository root, so Swift Package Manager can add the repository by URL.
