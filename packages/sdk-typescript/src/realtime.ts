import {
  PUBLIC_SOCKET_PROTOCOL,
  type SdkPublicNowPlaying,
  type SdkPublicOnAir,
  type SdkPublicRealtimeDescriptor,
  type SdkPublicSchedule,
  type SdkPublicSocketEvent,
  type SdkPublishedRecord,
  sdkSchemas,
} from "./schemas";

export type PublicFeedHandlers = {
  onSchedule?: (data: SdkPublicSchedule) => void;
  onAir?: (data: SdkPublicOnAir | null) => void;
  onNowPlaying?: (data: SdkPublicNowPlaying) => void;
  /** `data` is `null` when the record was unpublished. */
  onContent?: (recordId: string, data: SdkPublishedRecord | null) => void;
  onError?: (error: unknown) => void;
};

export type SubscribePublicFeedOptions = {
  /** `station.resources.realtime`. */
  realtime: SdkPublicRealtimeDescriptor;
  /** `station.id`; rows for any other station are ignored. */
  stationId: string;
  handlers: PublicFeedHandlers;
  /** WebSocket factory for runtimes without a global `WebSocket`. */
  createSocket?: (url: string) => WebSocket;
};

export type PublicFeedSubscription = {
  close: () => void;
};

/** @deprecated Use `PublicFeedHandlers`. */
export type PublicSocketHandlers = PublicFeedHandlers;
/** @deprecated Use `PublicFeedSubscription`. */
export type PublicSocketSubscription = PublicFeedSubscription;

type FeedRow = {
  station_id?: unknown;
  kind?: unknown;
  entry?: unknown;
  data_json?: unknown;
};

type FeedFrame = {
  type?: string;
  data?: { events?: string[]; channels?: string[]; payload?: FeedRow };
};

const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000];
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The feed must use `wss:`; plain `ws:` is allowed only for a loopback host. */
export function secureFeedUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol === "wss:") return url.href;
  if (url.protocol === "ws:" && LOOPBACK_HOSTS.has(url.hostname)) return url.href;
  throw new Error(`The public feed socket must use a secure URL: ${value}`);
}

function parseFeedEvent(raw: unknown): SdkPublicSocketEvent | null {
  let json: unknown = raw;
  if (typeof raw === "string") {
    try {
      json = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = sdkSchemas.PublicSocketEvent.safeParse(json);
  if (!parsed.success || parsed.data.protocol !== PUBLIC_SOCKET_PROTOCOL) return null;
  return parsed.data;
}

function dispatchFeedEvent(message: SdkPublicSocketEvent, handlers: PublicFeedHandlers) {
  switch (message.type) {
    case "schedule":
      handlers.onSchedule?.(message.data);
      return;
    case "on-air":
      handlers.onAir?.(message.data);
      return;
    case "now-playing":
      handlers.onNowPlaying?.(message.data);
      return;
    case "content":
      handlers.onContent?.(message.recordId, message.data);
      return;
    case "preview":
      return;
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
}

/**
 * Follow a station's public feed: schedule, on-air state, now playing and published content.
 * The socket is anonymous, so this also works from a browser. Each (re)connect starts with the
 * station's current rows, and the connection reconnects with backoff until `close()`.
 */
export function subscribePublicFeed(options: SubscribePublicFeedOptions): PublicFeedSubscription {
  const { realtime, stationId, handlers } = options;
  const url = secureFeedUrl(realtime.url);
  let closed = false;
  let socket: WebSocket | null = null;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const handleRow = (row: FeedRow, deleted: boolean) => {
    if (row.station_id !== stationId) return;
    if (deleted) {
      if (row.kind === "content" && typeof row.entry === "string") {
        handlers.onContent?.(row.entry, null);
      }
      return;
    }
    const message = parseFeedEvent(row.data_json);
    if (message) dispatchFeedEvent(message, handlers);
  };

  const open = () => {
    if (closed) return;
    try {
      socket = options.createSocket ? options.createSocket(url) : new WebSocket(url);
    } catch (error) {
      handlers.onError?.(error);
      return;
    }
    socket.addEventListener("open", () => {
      attempt = 0;
    });
    socket.addEventListener("message", (event) => {
      const data = typeof event.data === "string" ? event.data : String(event.data);
      if (data === "pong") return;
      let frame: FeedFrame;
      try {
        frame = JSON.parse(data);
      } catch {
        return;
      }
      if (frame.type === "error") {
        handlers.onError?.(frame.data);
        return;
      }
      if (frame.type !== "event" || !frame.data?.payload) return;
      if (frame.data.channels && !frame.data.channels.includes(realtime.channel)) return;
      const deleted = (frame.data.events ?? []).some((name) => name.endsWith(".delete"));
      handleRow(frame.data.payload, deleted);
    });
    socket.addEventListener("error", (error) => {
      handlers.onError?.(error);
    });
    socket.addEventListener("close", () => {
      socket = null;
      if (closed) return;
      const delay = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];
      attempt += 1;
      retry = setTimeout(open, delay);
    });
  };
  open();

  return {
    close: () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
    },
  };
}
