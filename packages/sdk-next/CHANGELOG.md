# @rivi-software/radiotools-sdk-next

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
