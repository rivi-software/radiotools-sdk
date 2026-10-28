# @rivi-software/radiotools-sdk-react

React hooks for the RadioTools listener API, wrapping [`@rivi-software/radiotools-sdk`](../sdk-typescript). Generated from `@rivi-software/radiotools-contract`; do not edit `src/hooks.generated.ts` by hand.

## Install

```bash
npm install @rivi-software/radiotools-sdk-react @rivi-software/radiotools-sdk
```

Requires React 18 or newer.

## Usage

```tsx
import { createStationClient } from "@rivi-software/radiotools-sdk";
import { useGetNowPlaying } from "@rivi-software/radiotools-sdk-react";

const client = createStationClient({ baseUrl, stationSlug });

export function NowPlaying() {
  const { data, error, loading, refresh } = useGetNowPlaying(client);
  if (loading) return <p>Loading…</p>;
  if (error) return <p>{error.message}</p>;
  return <p>{data?.track?.title}</p>;
}
```

Create the client once, outside components or in a memo, so the hooks keep a stable reference.

Without `apiToken` the client reads anonymously, which works for a station that allows anonymous reads (**Settings › Listener APIs**). For a station that requires a token, keep it on your server and read through it there; never bundle the token in browser code.

## Hooks

`useGetStation`, `useGetCurrentBroadcast`, `useGetNowPlaying`, `useGetOnDemand`, `useGetWeather`, `useGetTraffic`, `useRecommendedPollInterval`. Each returns `{ data, error, loading, refresh }`.

For anything else, call the client directly.
