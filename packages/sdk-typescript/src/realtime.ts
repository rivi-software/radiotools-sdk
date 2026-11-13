import {
  PUBLIC_SOCKET_PROTOCOL,
  type SdkPublicNowPlaying,
  type SdkPublicOnAir,
  type SdkPublicRealtimeDescriptor,
  type SdkPublicSchedule,
  type SdkPublicSocketEvent,
  type SdkPublishedRecord,
  sdkSchemas,
} from "./schemas.js";

/**
 * `onSchedule`, `onAir` and `onNowPlaying` take `null` when the feed has no row of their kind: it
 * removed it (the station went offline, or switched its realtime feed or that API off), or the
 * snapshot a (re)connect starts with has none. `onAir` also takes `null` while nothing is on air.
 */
export type PublicFeedHandlers = {
  onSchedule?: (data: SdkPublicSchedule | null) => void;
  onAir?: (data: SdkPublicOnAir | null) => void;
  onNowPlaying?: (data: SdkPublicNowPlaying | null) => void;
  /** `data` is `null` when the record was unpublished. */
  onContent?: (recordId: string, data: SdkPublishedRecord | null) => void;
  onError?: (error: unknown) => void;
};

export type SubscribePublicFeedOptions = {
  /** `station.resources.realtime`. */
  realtime: SdkPublicRealtimeDescriptor;
  /** `station.id`; rows for any other station are ignored. */
  stationId: string;
  /**
   * The channel to follow, by its `id` in `station.channels`. Left out, or the station's id, the
   * subscription follows the main channel's rows as before channels; another channel's are its
   * `channel-schedule`, `channel-on-air` and `channel-now-playing` rows, whose `entry` is its id.
   * Published content is the station's and reaches every subscription.
   */
  channelId?: string;
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

/**
 * Hands a frame to its handler: the main channel's kinds while the subscription follows the main
 * channel (`channelId` null), the `channel-*` kinds of the channel it follows otherwise, and
 * published content always.
 */
function dispatchFeedEvent(
  message: SdkPublicSocketEvent,
  handlers: PublicFeedHandlers,
  channelId: string | null,
) {
  switch (message.type) {
    case "schedule":
      if (channelId === null) handlers.onSchedule?.(message.data);
      return;
    case "on-air":
      if (channelId === null) handlers.onAir?.(message.data);
      return;
    case "now-playing":
      if (channelId === null) handlers.onNowPlaying?.(message.data);
      return;
    case "channel-schedule":
      if (message.channelId === channelId) handlers.onSchedule?.(message.data);
      return;
    case "channel-on-air":
      if (message.channelId === channelId) handlers.onAir?.(message.data);
      return;
    case "channel-now-playing":
      if (message.channelId === channelId) handlers.onNowPlaying?.(message.data);
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

/** The kinds the feed keeps one row of (`<kind>/default`). */
const SINGLE_ROW_KINDS = ["schedule", "on-air", "now-playing"] as const;
type SingleRowKind = (typeof SINGLE_ROW_KINDS)[number];

function isSingleRowKind(kind: unknown): kind is SingleRowKind {
  return SINGLE_ROW_KINDS.includes(kind as SingleRowKind);
}

/** Another channel's row kinds, each standing for one of the main channel's. */
const CHANNEL_ROW_KINDS = new Map<unknown, SingleRowKind>([
  ["channel-schedule", "schedule"],
  ["channel-on-air", "on-air"],
  ["channel-now-playing", "now-playing"],
]);

/** Reports that the feed has no row of `kind`. */
function dispatchRemoved(kind: SingleRowKind, handlers: PublicFeedHandlers) {
  switch (kind) {
    case "schedule":
      handlers.onSchedule?.(null);
      return;
    case "on-air":
      handlers.onAir?.(null);
      return;
    case "now-playing":
      handlers.onNowPlaying?.(null);
      return;
  }
}

/**
 * Follow a station's public feed: schedule, on-air state, now playing and published content.
 * The socket is anonymous, so this also works from a browser. Each (re)connect starts with the
 * station's current rows, and the connection reconnects with backoff until `close()`. A removed
 * schedule, on-air or now-playing row reaches its handler as `null`, and so does one the snapshot
 * has no row of, once the snapshot ends.
 */
export function subscribePublicFeed(options: SubscribePublicFeedOptions): PublicFeedSubscription {
  const { realtime, stationId, handlers } = options;
  // The main channel's rows are today's kinds; only another channel has rows of its own.
  const channelId =
    options.channelId && options.channelId !== stationId ? options.channelId : null;
  const url = secureFeedUrl(realtime.url);
  let closed = false;
  let socket: WebSocket | null = null;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;

  /** `snapshot` collects the kinds of the rows a connection's snapshot has, until it ends. */
  const handleRow = (row: FeedRow, deleted: boolean, snapshot: Set<unknown> | null) => {
    if (row.station_id !== stationId) return;
    if (channelId !== null && row.kind !== "content") {
      // Following another channel, only its own rows count, each as the kind it stands for.
      const kind = row.entry === channelId ? CHANNEL_ROW_KINDS.get(row.kind) : undefined;
      if (!kind) return;
      if (deleted) {
        dispatchRemoved(kind, handlers);
        return;
      }
      snapshot?.add(kind);
      const message = parseFeedEvent(row.data_json);
      if (message) dispatchFeedEvent(message, handlers, channelId);
      return;
    }
    if (deleted) {
      if (row.kind === "content" && typeof row.entry === "string") {
        handlers.onContent?.(row.entry, null);
      } else if (isSingleRowKind(row.kind)) {
        dispatchRemoved(row.kind, handlers);
      }
      return;
    }
    snapshot?.add(row.kind);
    const message = parseFeedEvent(row.data_json);
    if (message) dispatchFeedEvent(message, handlers, channelId);
  };

  const open = () => {
    if (closed) return;
    let current: WebSocket;
    try {
      current = options.createSocket ? options.createSocket(url) : new WebSocket(url);
    } catch (error) {
      handlers.onError?.(error);
      return;
    }
    socket = current;
    let snapshot: Set<unknown> | null = new Set();
    current.addEventListener("open", () => {
      // The feed sends its snapshot before the socket opens and answers `ping` on the same
      // socket, so the first `pong` arrives after the snapshot's last row.
      current.send("ping");
    });
    current.addEventListener("message", (event) => {
      const data = typeof event.data === "string" ? event.data : String(event.data);
      if (data === "pong") {
        if (snapshot) {
          for (const kind of SINGLE_ROW_KINDS) {
            if (!snapshot.has(kind)) dispatchRemoved(kind, handlers);
          }
          snapshot = null;
          // Reset the backoff only once a snapshot arrives, so a feed that keeps refusing
          // connections backs off instead of reconnecting every second.
          attempt = 0;
        }
        return;
      }
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
      handleRow(frame.data.payload, deleted, snapshot);
    });
    current.addEventListener("error", (error) => {
      handlers.onError?.(error);
    });
    current.addEventListener("close", () => {
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
