# @rivi-software/radiotools-sdk

TypeScript client for the RadioTools listener API: published station content, schedule, shows, on-demand recordings, now playing, weather and traffic, realtime updates, and playback ingest. Includes ETag caching and retries.

## Install

```bash
npm install @rivi-software/radiotools-sdk
```

## Configuration

Create keys in RadioTools under **Settings → API credentials**.

| Variable | Purpose |
| --- | --- |
| `RADIOTOOLS_BASE_URL` | API base URL |
| `RADIOTOOLS_STATION_SLUG` | Station to read from |
| `RADIOTOOLS_API_TOKEN` | Station key (`listener:read`); leave it unset for anonymous reads |
| `RADIOTOOLS_INGEST_TOKEN` | Integration key named `playback` (`ingest:write`) |

Pass the raw `rtm_…` token; the SDK adds the `Bearer ` prefix.

### Anonymous reads

A station can switch on **Allow anonymous reads** under **Settings › Listener APIs**. Its listener reads (REST, GraphQL and GraphQL preview) then answer without a token, so a static site, a mobile app or a smart-speaker skill can use the SDK directly, in the browser or on the device. Leave `apiToken` out:

```ts
const client = createStationClient({ baseUrl: "https://api.example.com", stationSlug: "my-station" });
```

Anyone who knows the station slug can then read the same published data. A station that has not switched it on answers each read with `401 UNAUTHENTICATED` (`RadioToolsApiError`). A token you do pass is always checked, even on a station that allows anonymous reads, so a revoked or expired one keeps failing with `401`: remove it rather than keep a stale one. Playback ingest still needs `ingestToken`.

## Usage

```ts
import { createStationClient, createStationClientFromEnv } from "@rivi-software/radiotools-sdk";

const client = createStationClientFromEnv();
// or
const explicit = createStationClient({
  baseUrl: "https://api.example.com",
  stationSlug: "my-station",
  apiToken: process.env.RADIOTOOLS_API_TOKEN,
});

const station = await client.getStation();
const nowPlaying = await client.getNowPlaying();
const schedule = await client.getSchedule({ fromDate: "2026-10-06", throughDate: "2026-10-12" });
```

### Client methods

`getStation`, `getSchemas`, `getContent`, `getContentRecord`, `getContentBySlug`, `iterateContent`, `getSchedule`, `getShows`, `getCurrentBroadcast`, `getNowPlaying`, `getTrackHistory`, `iterateTrackHistory`, `getOnDemand`, `iterateOnDemand`, `getWeather`, `getTraffic`, `recommendedPollIntervalMs`, `previewEditorial`, `reportPlayback`, `subscribe`.

Schedule windows are `YYYY-MM-DD` dates covering 1 to 42 inclusive days. Shows include their presenters and regular `slots` (weekday, start time, duration) and have a `type` of `live`, `nonstop` (automation playing music) or `prerecorded`; broadcasts carry a `nature` of `live`, `nonstop`, `prerecorded` or `repeat`. `station.profile` holds the tagline, frequency label, links and contact details once the station has saved them.

### On-demand recordings

```ts
// Published recordings of aired broadcasts, newest first; null when the station offers none.
const recordings = await client.getOnDemand({ limit: 10 });
for (const item of recordings?.items ?? []) {
  console.log(item.title, item.startsAt, new URL(item.audio.url, baseUrl).href);
}

// One show's recordings: pass the program id from the schedule or the shows.
for await (const item of client.iterateOnDemand({ programId })) {
  console.log(item.localDate, item.description, item.audio.durationSeconds);
}
```

Each item is the broadcast as `getSchedule` shows it (`id`, `title`, `startsAt`, `endsAt`, `nature`, `program`, `presenters`) plus `description` and `audio`: an anonymous, byte-range capable URL on the same origin as `station.resources.media`, with `mime`, `size` and `durationSeconds`. `station.resources.onDemand` is `null` while the station has its schedule or media library switched off.

### Weather and traffic

`getWeather()` and `getTraffic()` return `null` when the station does not publish them. Each weather snapshot and the traffic snapshot name their `source`: `open-meteo`, `openweathermap` or `station` for weather, `anwb`, `ndw` or `station` for traffic, where `station` is the station's own feed. The SDK accepts any source, so a station can switch providers without an SDK update. OpenWeatherMap asks for a visible credit, "Weather data provided by OpenWeather".

### Content

```ts
// Newest first by first publication (`sort: "publishedAt"`, `direction: "desc"` are the defaults).
const news = await client.getContent({ type: "news", limit: 5 });
const more = await client.getContent({ type: "news", limit: 5, cursor: news.nextCursor ?? undefined });

// Filters on text and choice fields. A string is the REST form.
const sport = await client.getContent({
  type: "news",
  filter: [
    "category:sport",
    { field: "title", op: "contains", value: "storm" },
    { field: "regions", op: "anyOf", values: ["noord", "zuid"] }, // multi-select choices
  ],
});

// A former slug still resolves, so redirect when it differs.
const article = await client.getContentBySlug("news", "storm-eunice");
if (article.values.slug !== "storm-eunice") {
  // 301 to /news/${article.values.slug}
}
```

Cursors are opaque strings. Records carry `firstPublishedAt` (corrections do not move it) next to `publishedAt`, and `shows`/`presenters` records link to planning through `related.programIds`. `news`, `presenters`, `shows` and `pages` records come typed (`SdkPublishedNews` and the others): every station has these four types with the same fields. Any other type returns `SdkPublishedRecord`; `asContentType(record, "shows")` narrows a record whose type is only known at runtime. Each media entry has `alt`, `width`, `height`, `duration` and `variants` (`thumb`, `display`, and the focal crops `card` (16:9) and `square`), each `null` when absent, so sites can build `srcset` and reserve the aspect ratio. `publicMediaUrl(baseUrl, station.resources.media, versionId, "card")` builds the same URLs.

### Realtime

```ts
const subscription = client.subscribe({
  onNowPlaying: (nowPlaying) => console.log(nowPlaying.track?.title),
  onContent: (recordId, record) => {
    // record is null when it was unpublished
  },
});
subscription.close();
```

`subscribe` opens the WebSocket in `station.resources.realtime` (null when the station switched realtime off). The socket is anonymous: it starts with the current schedule, on-air state, now playing and published content, then streams changes and reconnects with backoff until closed. The feed's schedule covers today through seven days later. Pass `createSocket` when the runtime has no global `WebSocket`.

Because the feed needs no token, a browser can follow it directly: read the station on your server and hand `station.resources.realtime` and `station.id` to `subscribePublicFeed({ realtime, stationId, handlers })`. On a station that allows anonymous reads, the browser can call `client.subscribe` itself.

### Draft preview on the station website

When a station sets a draft preview address, Studio's **Open on website** button POSTs a 15-minute grant to that address as form fields. Read it server-side and fetch the draft:

```ts
import { previewEditorial, readPreviewHandoff } from "@rivi-software/radiotools-sdk";

export async function POST(request: Request) {
  const { grant, input } = readPreviewHandoff(await request.formData());
  const draft = await previewEditorial({ baseUrl: process.env.RADIOTOOLS_BASE_URL!, grant, input });
  return renderDraft(draft); // respond with Cache-Control: no-store
}
```

### Playback ingest

Requires `RADIOTOOLS_INGEST_TOKEN`. Use `client.reportPlayback(observation)`.

### Errors

Failed requests throw `RadioToolsApiError`. Response types and Zod schemas (`sdkSchemas`) are exported for validation.

Framework bindings: [React](../sdk-react), [Vue](../sdk-vue), [Svelte](../sdk-svelte), [Next.js](../sdk-next).
