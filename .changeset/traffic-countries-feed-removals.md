---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

Read traffic from every traffic country, and clear a schedule, on-air state or now playing that the realtime feed removed.

A station's traffic can now cover the Netherlands, Belgium, Luxembourg or Germany, and come from TomTom or HERE on the station's own key. The realtime feed now removes a station's now-playing row when it switches its now-playing API off, and its schedule and on-air rows when it switches its schedule API off.

**Fixed**

- `getTraffic` no longer throws for a station whose traffic covers Belgium, Luxembourg or Germany. Watched roads have `{country}:{road}` ids (`nl:a12`, `be:e40`, `de:a3`), and the OpenAPI document says so.
- `subscribe` and `subscribePublicFeed` report a removed schedule, on-air or now-playing row as `null` to `onSchedule`, `onAir` or `onNowPlaying`. Before, the SDK dropped the removal and an app kept showing the old schedule or track.
- A (re)connect whose snapshot has no schedule, on-air or now-playing row reports that kind as `null` once the snapshot ends. The SDK sends one `ping` when the socket opens, and the feed's `pong` follows the snapshot's last row.
- The feed's reconnect backoff resets once a snapshot arrives, not when the socket opens, so a feed that keeps refusing connections is retried with a growing delay.

**Changed**

- `onSchedule` and `onNowPlaying` take `null` as well as data, as `onAir` already did. TypeScript callers that read the data without checking for `null` need a `?.` or a check.
