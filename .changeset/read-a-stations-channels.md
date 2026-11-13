---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

Read one channel of a station that runs more than one.

A station can run more than one channel, each with its own schedule, stream and now playing. The listener API lists them in the station document and reads one with `channel`. Without `channel`, every read answers the main channel exactly as before.

**Added**

- `channels` on what `getStation` returns: the channels listeners see, the main channel first (its `slug` is `main` and its `id` the station's), each with its local `editions`. A station document from before channels reads as none.
- A `channel` option on `createStationClient`, and on `getSchedule`, `getShows`, `getCurrentBroadcast`, `getNowPlaying`, `getTrackHistory`, `iterateTrackHistory`, `getOnDemand`, `iterateOnDemand` and `subscribe`, where a call's own overrides the client's. A read that names a channel answers its broadcasts, slots, tracks, recordings and now playing with `channelId`, over REST and GraphQL. `subscribe` then follows that channel's `channel-schedule`, `channel-on-air` and `channel-now-playing` rows, and reports a channel listeners can't see to `onError`.
- The `ChannelOption`, `SdkPublicStationChannel` and `SdkPublicStationEdition` types; `channels`, the `channel` argument and `channelId` in the GraphQL schema and the OpenAPI document.

Needs the RadioTools release that adds channels to the listener API: before it, the station query over GraphQL refuses the `channels` field.
