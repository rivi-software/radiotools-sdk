import { expect, test } from "bun:test";
import { createStationClient } from "../src/client";
import { asContentType } from "../src/content-types";
import { createEtagCache } from "../src/http";
import { stationClientOptionsFromEnv } from "../src/env";
import { readPreviewHandoff } from "../src/preview";
import { PUBLIC_SOCKET_PROTOCOL, sdkSchemas } from "../src/schemas";
import { subscribePublicFeed } from "../src/realtime";

const stationBody = {
  contractVersion: 1,
  id: "station-a",
  slug: "station-a",
  name: "Station A",
  timezone: "Europe/Amsterdam",
  publishingLanguage: "en",
  resources: {
    schemas: "/api/v1/stations/station-a/schemas",
    content: "/api/v1/stations/station-a/content",
    schedule: "/api/v1/stations/station-a/schedule",
    shows: "/api/v1/stations/station-a/shows",
    programs: "/api/v1/stations/station-a/programs",
    broadcast: "/api/v1/stations/station-a/broadcast/current",
    nowPlaying: "/api/v1/stations/station-a/now-playing",
    trackHistory: "/api/v1/stations/station-a/track-history",
    realtime: {
      url: "wss://radio.example/api/v1/realtime/stations/station-a/feed",
      channel: "databases.station.tables.public_station_feed.rows",
    },
    weather: null,
    traffic: null,
    media: "/api/media/public/station-a",
  },
  delivery: { cache: "no-store", conditional: "etag", pollIntervalSeconds: 30 },
};

const nowPlayingBody = {
  contractVersion: 1,
  stationId: "station-a",
  timezone: "Europe/Amsterdam",
  track: {
    artist: "Artist",
    title: "Song",
    album: null,
    durationSeconds: 240,
    artworkUrl: "https://i.scdn.co/image/example-cover",
    isPlaying: true,
    observedAt: "2026-10-04T10:00:00.000Z",
    receivedAt: "2026-10-04T10:00:01.000Z",
  },
  elapsedSeconds: 10,
  endsAt: "2026-10-04T10:04:00.000Z",
  freshness: {
    status: "fresh",
    thresholdSeconds: 180,
    ageSeconds: 10,
    observedAt: "2026-10-04T10:00:00.000Z",
    receivedAt: "2026-10-04T10:00:01.000Z",
  },
};

test("public GET uses no-store and conditional ETag", async () => {
  const etag = `"${"a".repeat(64)}"`;
  let secondRequestEtag: string | undefined;
  const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fixture-api-token");
    expect(init?.cache).toBe("no-store");
    expect(init?.credentials).toBe("omit");
    const url = String(input);
    if (url.endsWith("/stations/station-a")) {
      if (init?.headers && new Headers(init.headers).get("if-none-match") === etag) {
        secondRequestEtag = etag;
        return new Response(null, { status: 304, headers: { etag } });
      }
      return new Response(JSON.stringify(stationBody), {
        status: 200,
        headers: { etag, "cache-control": "no-store" },
      });
    }
    return new Response(
      JSON.stringify({
        error: {
          code: "NOT_FOUND",
          message: "x",
          requestId: "00000000-0000-4000-8000-000000000001",
        },
      }),
      { status: 404 },
    );
  };

  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: fetchMock as typeof fetch,
    etagCache: createEtagCache(),
  });
  const first = await client.getStation();
  expect(first.slug).toBe("station-a");
  expect(await client.recommendedPollIntervalMs()).toBe(30_000);
  const second = await client.getStation();
  expect(second.slug).toBe("station-a");
  expect(secondRequestEtag).toBe(etag);
});

test("getNowPlaying returns track artworkUrl", async () => {
  const fetchMock = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/stations/station-a")) return Response.json(stationBody);
    if (url.endsWith("/now-playing")) return Response.json(nowPlayingBody);
    throw new Error(`unexpected url ${url}`);
  };
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: fetchMock as typeof fetch,
  });
  const nowPlaying = await client.getNowPlaying();
  expect(nowPlaying.track?.artworkUrl).toBe("https://i.scdn.co/image/example-cover");
});

test("disabled traffic and weather do not make a second request", async () => {
  const urls: string[] = [];
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async (input) => {
      urls.push(String(input));
      return Response.json(stationBody);
    },
  });
  expect(await client.getWeather()).toBeNull();
  expect(await client.getTraffic()).toBeNull();
  expect(urls).toEqual(["https://radio.example/api/v1/stations/station-a"]);
});

test("getTraffic reads the station traffic resource", async () => {
  const traffic = {
    contractVersion: 1,
    stationId: "station-a",
    snapshot: {
      source: "anwb",
      watch: { roads: [{ id: "nl:a12", code: "A12", name: "A12" }] },
      freshness: {
        status: "fresh",
        thresholdSeconds: 300,
        ageSeconds: 10,
        fetchedAt: "2026-10-04T10:00:00.000Z",
        observedAt: "2026-10-04T10:00:00.000Z",
        lastError: null,
      },
      incidents: [],
      totals: { incidentCount: 0, jamDistanceMeters: 0, delaySeconds: 0 },
    },
  };
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async (input) => {
      const url = String(input);
      if (url.endsWith("/stations/station-a")) {
        return Response.json({
          ...stationBody,
          resources: { ...stationBody.resources, traffic: "/api/v1/stations/station-a/traffic" },
        });
      }
      if (url.endsWith("/traffic")) return Response.json(traffic);
      throw new Error(`unexpected url ${url}`);
    },
  });
  expect((await client.getTraffic())?.snapshot.watch.roads[0]?.code).toBe("A12");
});

test("schedule windows stay within 31 inclusive days", async () => {
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async () => {
      throw new Error("invalid windows must not be requested");
    },
  });
  await expect(
    client.getSchedule({ fromDate: "2026-10-01", throughDate: "2026-11-01" }),
  ).rejects.toThrow(/31 inclusive days/);
});

const feedChannel = "databases.station.tables.public_station_feed.rows";
const scheduleEvent = {
  protocol: PUBLIC_SOCKET_PROTOCOL,
  type: "schedule",
  stationId: "station-a",
  data: {
    contractVersion: 1,
    timezone: "Europe/Amsterdam",
    broadcasts: [],
    truncated: false,
  },
};

class MockSocket {
  static instances: MockSocket[] = [];
  url = "";
  closed = false;
  listeners: Record<string, ((event: { data: string }) => void)[]> = {};
  constructor(url: string) {
    this.url = url;
    MockSocket.instances.push(this);
  }
  addEventListener(type: string, listener: (event: { data: string }) => void) {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }
  close() {
    this.closed = true;
  }
  fire(type: string, data = "") {
    for (const listener of this.listeners[type] ?? []) listener({ data });
  }
  row(action: "create" | "update" | "delete", payload: Record<string, unknown>) {
    this.fire(
      "message",
      JSON.stringify({
        type: "event",
        data: {
          events: [`${feedChannel}.${payload.kind}/${payload.entry}.${action}`],
          channels: [feedChannel],
          timestamp: "2026-10-12T10:00:00.000Z",
          payload,
        },
      }),
    );
  }
}

test("public feed rows dispatch events, tombstones and ignore other stations", () => {
  expect(sdkSchemas.PublicSocketEvent.parse(scheduleEvent).type).toBe("schedule");
  MockSocket.instances = [];
  let scheduleCount = 0;
  const removed: string[] = [];
  const subscription = subscribePublicFeed({
    realtime: { url: stationBody.resources.realtime.url, channel: feedChannel },
    stationId: "station-a",
    handlers: {
      onSchedule: () => scheduleCount++,
      onContent: (recordId, data) => {
        if (data === null) removed.push(recordId);
      },
    },
    createSocket: (url) => new MockSocket(url) as unknown as WebSocket,
  });
  const socket = MockSocket.instances[0];
  if (!socket) throw new Error("socket was not created");
  expect(socket.url).toBe(stationBody.resources.realtime.url);

  const row = { station_id: "station-a", kind: "schedule", entry: "current" };
  socket.row("create", { ...row, data_json: JSON.stringify(scheduleEvent) });
  socket.row("update", { ...row, station_id: "station-b", data_json: JSON.stringify(scheduleEvent) });
  socket.row("update", {
    ...row,
    data_json: JSON.stringify({ ...scheduleEvent, type: "preview", data: {} }),
  });
  socket.fire("message", "pong");
  socket.row("delete", {
    station_id: "station-a",
    kind: "content",
    entry: "00000000-0000-4000-8000-000000000003",
  });
  expect(scheduleCount).toBe(1);
  expect(removed).toEqual(["00000000-0000-4000-8000-000000000003"]);

  subscription.close();
  expect(socket.closed).toBe(true);
});

test("public feed reconnects after the socket closes", async () => {
  MockSocket.instances = [];
  const subscription = subscribePublicFeed({
    realtime: { url: "ws://localhost:5173/api/v1/realtime/stations/station-a/feed", channel: feedChannel },
    stationId: "station-a",
    handlers: {},
    createSocket: (url) => new MockSocket(url) as unknown as WebSocket,
  });
  const original = setTimeout;
  const delays: number[] = [];
  globalThis.setTimeout = ((handler: () => void, delay?: number) => {
    delays.push(delay ?? 0);
    handler();
    return 0;
  }) as typeof setTimeout;
  try {
    MockSocket.instances[0]?.fire("close");
  } finally {
    globalThis.setTimeout = original;
  }
  expect(delays).toEqual([1_000]);
  expect(MockSocket.instances).toHaveLength(2);
  subscription.close();
  MockSocket.instances[1]?.fire("close");
  expect(MockSocket.instances).toHaveLength(2);
});

test("public feed refuses an insecure socket URL", () => {
  expect(() =>
    subscribePublicFeed({
      realtime: { url: "ws://radio.example/api/v1/realtime/stations/station-a/feed", channel: feedChannel },
      stationId: "station-a",
      handlers: {},
      createSocket: () => {
        throw new Error("must not connect");
      },
    }),
  ).toThrow(/secure URL/);
});

test("subscribe opens the station's realtime feed without sending the token", async () => {
  MockSocket.instances = [];
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async () => Response.json(stationBody),
    createSocket: (url) => new MockSocket(url) as unknown as WebSocket,
  });
  let scheduleCount = 0;
  const subscription = client.subscribe({ onSchedule: () => scheduleCount++ });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const socket = MockSocket.instances[0];
  if (!socket) throw new Error("socket was not created");
  expect(socket.url.includes("token")).toBe(false);
  socket.row("create", {
    station_id: "station-a",
    kind: "schedule",
    entry: "current",
    data_json: JSON.stringify(scheduleEvent),
  });
  expect(scheduleCount).toBe(1);
  subscription.close();
});

test("subscribe reports a station without realtime", async () => {
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async () =>
      Response.json({ ...stationBody, resources: { ...stationBody.resources, realtime: null } }),
  });
  const error = await new Promise<unknown>((resolve) => {
    client.subscribe({ onError: resolve });
  });
  expect(String(error)).toMatch(/realtime is unavailable/);
});

const recordBody = {
  contractVersion: 1,
  id: "00000000-0000-4000-8000-000000000010",
  publicationId: "00000000-0000-4000-8000-000000000011",
  revision: 2,
  type: "news",
  schemaVersion: 1,
  publishedAt: "2026-10-10T10:00:00.000Z",
  firstPublishedAt: "2026-10-09T10:00:00.000Z",
  values: { title: "Storm Eunice", slug: "storm-eunice" },
  document: { version: 1, mode: "document", blocks: [] },
  media: [
    {
      assetId: "00000000-0000-4000-8000-000000000012",
      versionId: "00000000-0000-4000-8000-000000000013",
      kind: "image",
      url: "/api/media/public/station-a/00000000-0000-4000-8000-000000000013",
      credits: "",
      mime: "image/jpeg",
    },
  ],
};

test("getContent sends sort, direction and filters and accepts opaque cursors", async () => {
  const urls: URL[] = [];
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async (input) => {
      const url = new URL(String(input));
      urls.push(url);
      if (url.pathname.endsWith("/stations/station-a")) return Response.json(stationBody);
      return Response.json({
        contractVersion: 1,
        type: "news",
        records: [recordBody],
        nextCursor: "eyJwIjoiMjAyNi0xMC0wOSJ9",
        page: { limit: 5, nextCursor: "eyJwIjoiMjAyNi0xMC0wOSJ9" },
      });
    },
  });
  const page = await client.getContent({
    type: "news",
    limit: 5,
    sort: "updatedAt",
    direction: "asc",
    filter: [
      "category:sport",
      { field: "title", op: "contains", value: "storm" },
      { field: "regions", op: "anyOf", values: ["noord", "zuid"] },
    ],
  });
  expect(page.nextCursor).toBe("eyJwIjoiMjAyNi0xMC0wOSJ9");
  const media = page.records[0]?.media[0];
  expect(media?.alt).toBe("");
  expect(media?.variants).toEqual({ thumb: null, display: null, card: null, square: null });
  const params = urls[1]?.searchParams;
  expect(params?.get("sort")).toBe("updatedAt");
  expect(params?.get("direction")).toBe("asc");
  expect(params?.getAll("filter")).toEqual([
    "category:sport",
    "title.contains:storm",
    "regions.anyOf:noord,zuid",
  ]);
});

test("GraphQL content sends structured filters", async () => {
  const variables: Record<string, unknown>[] = [];
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    transport: "graphql",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { variables?: Record<string, unknown> };
      variables.push(body.variables ?? {});
      if (variables.length === 1) {
        return Response.json({ data: { station: { ...stationBody, profile: null } } });
      }
      return Response.json({
        data: { content: { records: [{ ...recordBody, related: null }], nextCursor: null } },
      });
    },
  });
  const page = await client.getContent({
    type: "news",
    filter: ["regions.anyOf:noord,zuid", "title.contains:storm", "category:sport"],
  });
  expect(page.records[0]?.related).toBeUndefined();
  expect(variables[1]?.filter).toEqual([
    { field: "regions", op: "anyOf", values: ["noord", "zuid"] },
    { field: "title", op: "contains", value: "storm" },
    { field: "category", op: "eq", value: "sport" },
  ]);
});

test("getContentBySlug reads the by-slug resource", async () => {
  const paths: string[] = [];
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async (input) => {
      const url = new URL(String(input));
      paths.push(url.pathname);
      if (url.pathname.endsWith("/stations/station-a")) return Response.json(stationBody);
      return Response.json({
        ...recordBody,
        values: { title: "Storm Eunice", slug: "storm-eunice-update" },
      });
    },
  });
  const record = await client.getContentBySlug("news", "storm eunice");
  expect(record.values.slug).toBe("storm-eunice-update");
  expect(paths[1]).toBe("/api/v1/stations/station-a/content/news/by-slug/storm%20eunice");
});

test("default content types come typed; other types keep the generic record", async () => {
  const anna = {
    ...recordBody,
    id: "00000000-0000-4000-8000-000000000020",
    type: "presenters",
    values: { title: "Anna", slug: "anna", role: "Morning host" },
  };
  const show = {
    ...recordBody,
    id: "00000000-0000-4000-8000-000000000021",
    type: "shows",
    values: { title: "Weekend Ochtend", slug: "weekend-ochtend", presenters: [{ presenter: anna.id }] },
    related: { programIds: ["00000000-0000-4000-8000-000000000022"] },
  };
  const event = { ...recordBody, type: "events", values: { slug: "open-day", venue: "Studio 1" } };
  const page = (type: string, records: unknown[]) => ({
    contractVersion: 1,
    type,
    records,
    nextCursor: null,
    page: { limit: 25, nextCursor: null },
  });
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/stations/station-a")) return Response.json(stationBody);
      if (url.pathname.endsWith(`/content/${anna.id}`)) return Response.json(anna);
      const type = url.searchParams.get("type") ?? "";
      if (type === "shows") return Response.json(page("shows", [show]));
      if (type === "events") return Response.json(page("events", [event]));
      // A news record without its required title does not fit the typed record.
      return Response.json(page("news", [{ ...recordBody, values: { slug: "storm-eunice" } }]));
    },
  });
  const shows = await client.getContent({ type: "shows" });
  const presenterId = shows.records[0]?.values.presenters?.[0]?.presenter;
  expect(presenterId).toBe(anna.id);
  const presenter = asContentType(await client.getContentRecord(anna.id), "presenters");
  expect(presenter?.values.role).toBe("Morning host");
  expect(asContentType(await client.getContentRecord(anna.id), "shows")).toBeNull();
  const events = await client.getContent({ type: "events" });
  expect(events.records[0]?.values.venue).toBe("Studio 1");
  await expect(client.getContent({ type: "news" })).rejects.toThrow();
  for await (const record of client.iterateContent({ type: "shows" }))
    expect(record.values.website).toBeUndefined();
});

test("getShows reads the shows resource; getPrograms still reads its alias", async () => {
  const paths: string[] = [];
  const shows = {
    contractVersion: 1,
    timezone: "Europe/Amsterdam",
    fromDate: "2026-10-21",
    throughDate: "2026-10-27",
    truncated: false,
  };
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    fetch: async (input) => {
      const url = new URL(String(input));
      paths.push(`${url.pathname}${url.search}`);
      if (url.pathname.endsWith("/stations/station-a")) return Response.json(stationBody);
      if (url.pathname.endsWith("/shows")) return Response.json({ ...shows, shows: [] });
      return Response.json({ ...shows, programs: [] });
    },
  });
  const window = { fromDate: "2026-10-21", throughDate: "2026-10-27" };
  expect((await client.getShows(window)).shows).toEqual([]);
  expect((await client.getPrograms(window)).programs).toEqual([]);
  expect(paths.slice(1)).toEqual([
    "/api/v1/stations/station-a/shows?fromDate=2026-10-21&throughDate=2026-10-27",
    "/api/v1/stations/station-a/programs?fromDate=2026-10-21&throughDate=2026-10-27",
  ]);
});

test("GraphQL reads shows and the station's shows link", async () => {
  const queries: string[] = [];
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    transport: "graphql",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      queries.push(body.query);
      if (queries.length === 1)
        return Response.json({ data: { station: { ...stationBody, profile: null } } });
      return Response.json({
        data: {
          shows: {
            contractVersion: 1,
            timezone: "Europe/Amsterdam",
            fromDate: "2026-10-21",
            throughDate: "2026-10-27",
            shows: [],
            truncated: false,
          },
        },
      });
    },
  });
  await client.getShows({ fromDate: "2026-10-21", throughDate: "2026-10-27" });
  expect(queries[0]).toMatch(/\bshows\b/);
  expect(queries[1]).toMatch(/shows\(fromDate/);
});

test("the Python types name the same fields as the typed records", async () => {
  const types = new URL("../../sdk-python/src/radiotools_sdk/types.py", import.meta.url);
  const source = await Bun.file(types).text();
  const fields = (name: string) => {
    const body = source.split(`class ${name}(TypedDict):`)[1]?.split("\n\n\n")[0] ?? "";
    return [...body.matchAll(/^ {4}(\w+):/gm)].map((match) => match[1]).sort();
  };
  for (const [name, schema] of [
    ["NewsValues", sdkSchemas.PublishedNews],
    ["PresenterValues", sdkSchemas.PublishedPresenter],
    ["ShowValues", sdkSchemas.PublishedShow],
    ["PageValues", sdkSchemas.PublishedPage],
  ] as const)
    expect(fields(name)).toEqual(Object.keys(schema.shape.values.shape).sort());
});

test("station profile, programme slots and traffic causes parse", () => {
  const station = sdkSchemas.PublicStation.parse({
    ...stationBody,
    profile: {
      tagline: "De stem van de Liemers",
      description: null,
      frequencyLabel: "FM 105.3",
      websiteUrl: "https://radio.example",
      streamUrl: null,
      contactEmail: "studio@radio.example",
      phone: null,
      address: null,
      social: [{ network: "instagram", url: "https://instagram.com/radio" }],
    },
  });
  expect(station.profile?.social[0]?.network).toBe("instagram");

  const presenter = { id: "00000000-0000-4000-8000-000000000021", title: "Anna" };
  const programs = sdkSchemas.PublicPrograms.parse({
    contractVersion: 1,
    timezone: "Europe/Amsterdam",
    fromDate: "2026-10-12",
    throughDate: "2026-10-18",
    truncated: false,
    programs: [
      {
        id: "00000000-0000-4000-8000-000000000020",
        title: "Morning",
        profileId: null,
        presenters: [presenter],
        slots: [
          {
            weekday: 6,
            startTime: "10:00",
            durationMinutes: 120,
            timezone: "Europe/Amsterdam",
            intervalWeeks: 1,
            fromDate: "2026-01-01",
            throughDate: "2026-12-31",
            presenters: [presenter],
          },
        ],
      },
    ],
  });
  expect(programs.programs[0]?.slots[0]?.startTime).toBe("10:00");

  const incident = sdkSchemas.TrafficPublic.parse({
    contractVersion: 1,
    stationId: "station-a",
    snapshot: {
      source: "anwb",
      watch: { roads: [] },
      freshness: {
        status: "fresh",
        thresholdSeconds: 300,
        ageSeconds: 0,
        fetchedAt: null,
        observedAt: null,
        lastError: null,
      },
      incidents: [
        {
          id: "i-1",
          road: "A12",
          type: "closure",
          direction: "eastbound",
          from: "Arnhem",
          to: "Duiven",
          lengthMeters: null,
          delaySeconds: null,
          cause: "accident",
          closure: "exit",
          summary: "Afrit dicht",
          updatedAt: "2026-10-12T10:00:00.000Z",
        },
      ],
      totals: { incidentCount: 1, jamDistanceMeters: 0, delaySeconds: 0 },
    },
  });
  expect(incident.snapshot.incidents[0]?.cause).toBe("accident");
});

test("readPreviewHandoff reads Studio's form post", () => {
  const form = new FormData();
  form.set("grant", " grant-token ");
  form.set("stationId", "station-a");
  form.set("recordId", "00000000-0000-4000-8000-000000000010");
  form.set("revision", "3");
  form.set("audience", "website");
  expect(readPreviewHandoff(form)).toEqual({
    grant: "grant-token",
    input: {
      stationId: "station-a",
      recordId: "00000000-0000-4000-8000-000000000010",
      revision: 3,
      audience: "website",
    },
  });
  expect(() => readPreviewHandoff({ stationId: "station-a" })).toThrow(/grant/);
});

test("SDK sources do not import application server modules", async () => {
  const glob = new Bun.Glob("src/**/*.ts");
  for await (const entry of glob.scan({ cwd: process.cwd() })) {
    const source = await Bun.file(entry).text();
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = match[1] ?? "";
      expect(spec.includes("/server/")).toBe(false);
      expect(spec.includes("/worker/")).toBe(false);
      expect(spec.startsWith("@/")).toBe(false);
    }
  }
});

test("ETag caches are isolated by listener token", async () => {
  const etagCache = createEtagCache();
  let revoked = false;
  const calls: { token: string | null; conditional: string | null }[] = [];
  const fetchMock = async (_url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = headers.get("authorization");
    calls.push({ token, conditional: headers.get("if-none-match") });
    if (revoked) {
      return Response.json(
        {
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
            requestId: "00000000-0000-4000-8000-000000000001",
          },
        },
        { status: 401 },
      );
    }
    return Response.json(
      { ...stationBody, name: token },
      { headers: { etag: '"shared-etag"' } },
    );
  };
  const options = {
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    fetch: fetchMock as typeof fetch,
    etagCache,
  };
  const a = createStationClient({ ...options, apiToken: "token-a" });
  const b = createStationClient({ ...options, apiToken: "token-b" });
  expect((await a.getStation()).name).toBe("Bearer token-a");
  expect((await b.getStation()).name).toBe("Bearer token-b");
  expect(calls[1]?.conditional).toBeNull();
  revoked = true;
  await expect(a.getStation()).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  expect(calls[2]?.conditional).toBe('"shared-etag"');
});

test("GraphQL authentication denial does not fall back to REST", async () => {
  const paths: string[] = [];
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-token",
    transport: "auto",
    fetch: async (url, init) => {
      paths.push(new URL(url).pathname);
      expect(init?.credentials).toBe("omit");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fixture-token");
      return Response.json(
        {
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
            requestId: "00000000-0000-4000-8000-000000000001",
          },
        },
        { status: 401 },
      );
    },
  });
  await expect(client.getStation()).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  expect(paths).toEqual(["/api/v1/stations/station-a/graphql"]);
});

test("429 responses retry and then succeed", async () => {
  let calls = 0;
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    apiToken: "fixture-api-token",
    retries: 1,
    fetch: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: "slow down" }), {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return Response.json(stationBody);
    },
  });
  expect((await client.getStation()).slug).toBe("station-a");
  expect(calls).toBe(2);
});

test("reportPlayback uses the ingest token and reuses eventId across retries", async () => {
  const bodies: { eventId?: string }[] = [];
  let calls = 0;
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    ingestToken: "ingest-token",
    retries: 1,
    fetch: async (input, init) => {
      calls += 1;
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/integrations/playback");
      expect(url.searchParams.get("stationSlug")).toBe("station-a");
      expect(url.searchParams.get("stationId")).toBeNull();
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer ingest-token");
      bodies.push(JSON.parse(String(init?.body)) as { eventId?: string });
      if (calls === 1) {
        return new Response(JSON.stringify({ error: "busy" }), {
          status: 503,
          headers: { "retry-after": "0" },
        });
      }
      return Response.json({ accepted: true, outcome: "recorded" });
    },
  });
  const result = await client.reportPlayback({ streamTitle: "Artist - Title", isPlaying: true });
  expect(result).toEqual({ accepted: true, outcome: "recorded" });
  expect(bodies[0]?.eventId).toBe(bodies[1]?.eventId);
  expect(bodies[0]?.eventId?.length).toBeGreaterThan(0);
});

test("listener reads require a listener token", async () => {
  const client = createStationClient({
    baseUrl: "https://radio.example",
    stationSlug: "station-a",
    ingestToken: "ingest-token",
  });
  await expect(client.getStation()).rejects.toThrow(/listener:read/);
});

test("environment options accept either customer credential", () => {
  expect(
    stationClientOptionsFromEnv({
      RADIOTOOLS_BASE_URL: "https://radio.example",
      RADIOTOOLS_STATION_SLUG: "breeze",
      RADIOTOOLS_INGEST_TOKEN: "rtm_ingest",
    }),
  ).toEqual({
    baseUrl: "https://radio.example",
    stationSlug: "breeze",
    ingestToken: "rtm_ingest",
  });
  expect(() => stationClientOptionsFromEnv({})).toThrow(/RADIOTOOLS_BASE_URL/);
});
