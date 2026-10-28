/** Canonical listener SDK surface — used by @rivi-software/radiotools-sdk-generator targets. */

export const LISTENER_CONTRACT_VERSION = 1 as const;
export const PUBLIC_SOCKET_PROTOCOL = "radiotools.public.v1" as const;

export type AuthScope = "listener:read" | "ingest:write";

export type SdkEnvVar = {
  name: string;
  required: boolean;
  description: string;
};

export type SdkClientMethod = {
  name: string;
  scope: AuthScope | "either";
  description: string;
  graphqlField?: string;
  /** Still served, with a successor; removed in a later release. */
  deprecated?: boolean;
  rest?: {
    method: "GET" | "POST";
    pathPattern: string;
    resourceKey?: string;
  };
};

export type SdkManifest = {
  contractVersion: typeof LISTENER_CONTRACT_VERSION;
  socketProtocol: typeof PUBLIC_SOCKET_PROTOCOL;
  packageNames: {
    typescript: "@rivi-software/radiotools-sdk";
    python: "radiotools_sdk";
    react: "@rivi-software/radiotools-sdk-react";
    vue: "@rivi-software/radiotools-sdk-vue";
    svelte: "@rivi-software/radiotools-sdk-svelte";
    go: "github.com/radiotools/radiotools-sdk-go";
    csharp: "RadioTools.Sdk";
    ruby: "radiotools_sdk";
    php: "radiotools/sdk";
    openapi: "@rivi-software/radiotools-openapi";
    kotlin: "com.radiotools.sdk";
    swift: "RadioToolsSDK";
    next: "@rivi-software/radiotools-sdk-next";
  };
  env: SdkEnvVar[];
  clientMethods: SdkClientMethod[];
  integrations: {
    playback: {
      method: "POST";
      path: "/api/v1/integrations/playback";
      scope: "ingest:write";
    };
  };
};

export const listenerSdkManifest: SdkManifest = {
  contractVersion: LISTENER_CONTRACT_VERSION,
  socketProtocol: PUBLIC_SOCKET_PROTOCOL,
  packageNames: {
    typescript: "@rivi-software/radiotools-sdk",
    python: "radiotools_sdk",
    react: "@rivi-software/radiotools-sdk-react",
    vue: "@rivi-software/radiotools-sdk-vue",
    svelte: "@rivi-software/radiotools-sdk-svelte",
    go: "github.com/radiotools/radiotools-sdk-go",
    csharp: "RadioTools.Sdk",
    ruby: "radiotools_sdk",
    php: "radiotools/sdk",
    openapi: "@rivi-software/radiotools-openapi",
    kotlin: "com.radiotools.sdk",
    swift: "RadioToolsSDK",
    next: "@rivi-software/radiotools-sdk-next",
  },
  env: [
    {
      name: "RADIOTOOLS_BASE_URL",
      required: true,
      description: "RadioTools origin (no trailing slash).",
    },
    {
      name: "RADIOTOOLS_STATION_SLUG",
      required: true,
      description: "Station slug for published reads and default playback ingest.",
    },
    {
      name: "RADIOTOOLS_API_TOKEN",
      required: false,
      description:
        "Station key with listener:read for published JSON and GraphQL. Leave it unset for a station that allows anonymous reads (Settings › Listener APIs).",
    },
    {
      name: "RADIOTOOLS_INGEST_TOKEN",
      required: false,
      description: "Integration key named playback with ingest:write for encoder observations.",
    },
  ],
  clientMethods: [
    {
      name: "getStation",
      scope: "listener:read",
      description: "Published station metadata and resource hrefs.",
      graphqlField: "station",
      rest: { method: "GET", pathPattern: "/api/v1/stations/{stationSlug}" },
    },
    {
      name: "getSchemas",
      scope: "listener:read",
      description: "Content type definitions: news, presenters, shows, pages and any type RIVI added.",
      graphqlField: "schemas",
      rest: { method: "GET", pathPattern: "{resources.schemas}", resourceKey: "schemas" },
    },
    {
      name: "getContent",
      scope: "listener:read",
      description: "Paginated published records of one type, newest first; typed for news, presenters, shows and pages.",
      graphqlField: "content",
      rest: { method: "GET", pathPattern: "{resources.content}", resourceKey: "content" },
    },
    {
      name: "getContentRecord",
      scope: "listener:read",
      description: "One published content record by id.",
      graphqlField: "contentRecord",
      rest: { method: "GET", pathPattern: "{resources.content}/{id}", resourceKey: "content" },
    },
    {
      name: "getContentBySlug",
      scope: "listener:read",
      description: "One published content record by type and slug; former slugs also resolve.",
      graphqlField: "contentBySlug",
      rest: {
        method: "GET",
        pathPattern: "{resources.content}/{type}/by-slug/{slug}",
        resourceKey: "content",
      },
    },
    {
      name: "getSchedule",
      scope: "listener:read",
      description: "Broadcast schedule for a date window (1–42 inclusive days).",
      graphqlField: "schedule",
      rest: { method: "GET", pathPattern: "{resources.schedule}", resourceKey: "schedule" },
    },
    {
      name: "getShows",
      scope: "listener:read",
      description: "Shows on air in a date window (1–42 inclusive days), with their regular slots.",
      graphqlField: "shows",
      rest: { method: "GET", pathPattern: "{resources.shows}", resourceKey: "shows" },
    },
    {
      name: "getCurrentBroadcast",
      scope: "listener:read",
      description: "Current on-air broadcast state.",
      graphqlField: "currentBroadcast",
      rest: { method: "GET", pathPattern: "{resources.broadcast}", resourceKey: "broadcast" },
    },
    {
      name: "getOnDemand",
      scope: "listener:read",
      description:
        "Paginated published recordings of aired broadcasts, newest first; null when the station offers none.",
      graphqlField: "onDemand",
      rest: { method: "GET", pathPattern: "{resources.onDemand}", resourceKey: "onDemand" },
    },
    {
      name: "getNowPlaying",
      scope: "listener:read",
      description: "Now playing track and freshness.",
      graphqlField: "nowPlaying",
      rest: { method: "GET", pathPattern: "{resources.nowPlaying}", resourceKey: "nowPlaying" },
    },
    {
      name: "getTrackHistory",
      scope: "listener:read",
      description: "Paginated recently played tracks.",
      graphqlField: "trackHistory",
      rest: {
        method: "GET",
        pathPattern: "{resources.trackHistory}",
        resourceKey: "trackHistory",
      },
    },
    {
      name: "getWeather",
      scope: "listener:read",
      description: "Weather snapshot when enabled; otherwise null without a second request.",
      graphqlField: "weather",
      rest: { method: "GET", pathPattern: "{resources.weather}", resourceKey: "weather" },
    },
    {
      name: "getTraffic",
      scope: "listener:read",
      description: "Traffic snapshot when enabled; otherwise null without a second request.",
      graphqlField: "traffic",
      rest: { method: "GET", pathPattern: "{resources.traffic}", resourceKey: "traffic" },
    },
    {
      name: "recommendedPollIntervalMs",
      scope: "listener:read",
      description: "Suggested poll interval from station.delivery.pollIntervalSeconds.",
    },
    {
      name: "previewEditorial",
      scope: "listener:read",
      description: "Preview unpublished editorial with a grant (not from query strings).",
      graphqlField: "previewEditorial",
    },
    {
      name: "reportPlayback",
      scope: "ingest:write",
      description: "Send one encoder playback observation.",
      rest: { method: "POST", pathPattern: "/api/v1/integrations/playback" },
    },
    {
      name: "subscribe",
      scope: "listener:read",
      description: "Anonymous public feed WebSocket from station.resources.realtime; reconnects.",
    },
  ],
  integrations: {
    playback: {
      method: "POST",
      path: "/api/v1/integrations/playback",
      scope: "ingest:write",
    },
  },
};
