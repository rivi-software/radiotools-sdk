# @rivi-software/radiotools-sdk

TypeScript client for the RadioTools listener API: published station content, schedule, now playing, weather and traffic, realtime updates, and playback ingest. Includes ETag caching and retries.

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
| `RADIOTOOLS_API_TOKEN` | Station key (`listener:read`) |
| `RADIOTOOLS_INGEST_TOKEN` | Integration key named `playback` (`ingest:write`) |

Pass the raw `rtm_…` token; the SDK adds the `Bearer ` prefix.

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

`getStation`, `getSchemas`, `getContent`, `getContentRecord`, `getContentBySlug`, `iterateContent`, `getSchedule`, `getShows`, `getPrograms` (deprecated alias of `getShows`), `getCurrentBroadcast`, `getNowPlaying`, `getTrackHistory`, `iterateTrackHistory`, `getWeather`, `getTraffic`, `recommendedPollIntervalMs`, `previewEditorial`, `reportPlayback`, `subscribe`.

Schedule windows are `YYYY-MM-DD` dates covering 1 to 31 inclusive days. Programmes include their presenters and regular `slots` (weekday, start time, duration); broadcasts carry a `nature` of `live`, `prerecorded` or `repeat`. `station.profile` holds the tagline, frequency label, links and contact details once the station has saved them.

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

Because the feed needs no token, a browser can follow it directly: read the station on your server and hand `station.resources.realtime` and `station.id` to `subscribePublicFeed({ realtime, stationId, handlers })`.

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
