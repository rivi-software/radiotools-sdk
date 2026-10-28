// Customer API contract version 1.
// Radio-station shapes only: published reads, the public socket, preview, and playback ingest.
// Studio administration contracts are intentionally absent.
import { z } from "zod";

export const LISTENER_CONTRACT_VERSION = 1 as const;
export const ListenerContractVersion = z.literal(LISTENER_CONTRACT_VERSION);
export const PUBLIC_SOCKET_PROTOCOL = "radiotools.public.v1" as const;

export const RequestId = z.string().uuid();
export const ErrorCode = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "MODULE_DISABLED",
  "METHOD_NOT_ALLOWED",
  "REVISION_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
]);
export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: RequestId,
    issues: z
      .array(
        z.object({
          path: z.string(),
          message: z.string(),
          /** Stable reason for a known refusal (for example `slug.taken`), for localized copy. */
          code: z.string().max(64).optional(),
          /** A value the request could use instead (for example a free slug). */
          suggestion: z.string().max(200).optional(),
          /** Seconds until a refusal that waiting fixes may succeed. */
          retryAfter: z.number().int().min(1).max(86_400).optional(),
        }),
      )
      .optional(),
  }),
});
export const IngestErrorResponse = z.object({ error: z.string() });

export const Timezone = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    if (/^[+-]/.test(value)) return false;
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone");

const href = z.string().startsWith("/api/");

/** Public links must be https: they are rendered on listener sites and in apps. */
const HttpsUrl = z.url({ protocol: /^https$/, hostname: z.regexes.domain }).max(500);

export const STATION_SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "x",
  "tiktok",
  "youtube",
  "linkedin",
  "mastodon",
  "bluesky",
  "whatsapp",
  "other",
] as const;

export const StationSocialLink = z
  .object({ network: z.enum(STATION_SOCIAL_NETWORKS), url: HttpsUrl })
  .strict();

export const StationAddress = z
  .object({
    street: z.string().max(120).nullable(),
    postalCode: z.string().max(20).nullable(),
    city: z.string().max(120).nullable(),
    country: z.string().max(120).nullable(),
  })
  .strict();

export const PublicStationProfile = z
  .object({
    /** One line under the station name. */
    tagline: z.string().max(160).nullable(),
    description: z.string().max(2000).nullable(),
    /** How listeners tune in, for example "FM 105.3 · DAB+ 8A". */
    frequencyLabel: z.string().max(80).nullable(),
    websiteUrl: HttpsUrl.nullable(),
    streamUrl: HttpsUrl.nullable(),
    contactEmail: z.email().max(254).nullable(),
    phone: z.string().max(40).nullable(),
    address: StationAddress.nullable(),
    social: z.array(StationSocialLink).max(12),
  })
  .strict();

/** `station.resources.realtime`: the WebSocket that carries the station's public feed. */
export const PublicRealtimeDescriptor = z.object({
  url: z.url(),
  channel: z.string().min(1),
});

export const PublicStation = z.object({
  contractVersion: ListenerContractVersion,
  id: z.string().min(1).max(80),
  slug: z.string().min(3).max(63),
  name: z.string().min(1).max(120),
  timezone: Timezone,
  publishingLanguage: z.string().min(2).max(35),
  /** Present once the station has saved a profile. */
  profile: PublicStationProfile.optional(),
  resources: z.object({
    schemas: href,
    content: href.nullable(),
    schedule: href.nullable(),
    /** The shows with their regular slots. */
    shows: href.nullable(),
    /** @deprecated Always null: the API removed the `programs` alias of `shows`. Use `shows`. */
    programs: href.nullable().optional(),
    broadcast: href.nullable(),
    nowPlaying: href.nullable(),
    trackHistory: href.nullable(),
    /**
     * Published recordings of aired broadcasts; null while the station has its schedule or its
     * media library switched off. A station document from before on-demand reads as null.
     */
    onDemand: href.nullable().default(null),
    /** The public feed WebSocket; null while the station is offline or realtime is switched off. */
    realtime: PublicRealtimeDescriptor.nullable(),
    weather: href.nullable(),
    traffic: href.nullable(),
    media: href,
  }),
  /**
   * Delivery hints. The API has deprecated `cache`; both strings are read as any non-empty value so
   * a station document that sends another caching policy still parses.
   */
  delivery: z.object({
    cache: z.string().min(1),
    conditional: z.string().min(1),
    pollIntervalSeconds: z.number().int().positive(),
  }),
});

const FIELD_KINDS = [
  "text",
  "rich_text",
  "number",
  "boolean",
  "datetime",
  "choices",
  "media",
  "content",
  "group",
] as const;

const SchemaKey = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]{0,47}$/,
    "Use lowercase letters, digits and underscores; start with a letter.",
  )
  .refine(
    (key) =>
      ![
        "constructor",
        "prototype",
        "__proto__",
        "id",
        "station_id",
        "revision",
        "schema_version",
        "created_at",
        "updated_at",
      ].includes(key),
    "Reserved identifier.",
  );

const JsonValue = z.json();

export type DeliveryField = {
  key: string;
  label: string;
  kind: (typeof FIELD_KINDS)[number];
  required: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  choices?: { key: string; label: string }[];
  /** A choices field that stores several keys (`string[]`); `maxItems` caps the selection. */
  multiple?: boolean;
  targetType?: string;
  maxItems?: number;
  fields?: DeliveryField[];
};

function deliveryField(depth: number): z.ZodType<DeliveryField> {
  return z
    .object({
      key: SchemaKey,
      label: z.string(),
      kind: z.enum(FIELD_KINDS),
      required: z.boolean(),
      maxLength: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      choices: z.array(z.object({ key: SchemaKey, label: z.string() })).optional(),
      multiple: z.boolean().optional(),
      targetType: SchemaKey.optional(),
      maxItems: z.number().optional(),
      fields:
        depth < 3
          ? z.array(deliveryField(depth + 1)).optional()
          : z
              .array(
                z
                  .object({
                    key: SchemaKey,
                    label: z.string(),
                    kind: z.enum(FIELD_KINDS),
                    required: z.boolean(),
                  })
                  .strict(),
              )
              .max(0)
              .optional(),
    })
    .strict();
}

export const PublicSchema = z.object({
  key: SchemaKey,
  label: z.string(),
  version: z.number().int().positive(),
  archived: z.boolean(),
  fields: z.array(deliveryField(1)),
});
export const PublicSchemaList = z.object({
  contractVersion: ListenerContractVersion,
  types: z.array(PublicSchema).max(100),
});

/** Links are limited to web pages and mail addresses; renderers should re-check before use. */
export function isSafeHref(href: string): boolean {
  if (href.length > 2000 || /[\s<>"`\\]/.test(href)) return false;
  if (/^mailto:[^@/?#]+@[^@/?#]+(\?.*)?$/i.test(href)) return true;
  if (!/^https:\/\//i.test(href)) return false;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
const SpanLink = z
  .object({
    href: z
      .string()
      .max(2000)
      .refine(isSafeHref, "Links must use https: or mailto:.")
      .describe("Absolute https: URL or mailto: address."),
    title: z.string().max(300).optional(),
  })
  .strict();
const Span = z
  .object({
    text: z.string().max(20000),
    marks: z
      .array(z.enum(["bold", "italic", "underline", "strike"]))
      .max(4)
      .optional(),
    link: SpanLink.optional(),
  })
  .strict();
const inline = z.array(Span).max(1000);
const EditorialBlock = z.discriminatedUnion("type", [
  z.object({ id: z.uuid(), type: z.literal("text"), content: inline }).strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("heading"),
      level: z.number().int().min(1).max(3),
      content: inline,
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("quote"),
      content: inline,
      attribution: z.string().max(300),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("list"),
      ordered: z.boolean(),
      items: z.array(inline).min(1).max(50),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("image"),
      assetId: z.uuid(),
      alt: z.string().max(1000),
      caption: z.string().max(1000),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("gallery"),
      images: z
        .array(z.object({ assetId: z.uuid(), alt: z.string().max(1000) }).strict())
        .min(1)
        .max(20),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("audio"),
      assetId: z.uuid(),
      caption: z.string().max(1000),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("video"),
      assetId: z.uuid(),
      caption: z.string().max(1000),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("embed"),
      provider: z.enum(["youtube", "vimeo"]),
      externalId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
      title: z.string().min(1).max(300),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      type: z.literal("related"),
      recordIds: z.array(z.uuid()).min(1).max(20),
    })
    .strict(),
]);
export const EditorialDocument = z
  .object({
    version: z.literal(1),
    mode: z.enum(["document", "blocks"]),
    blocks: z.array(EditorialBlock).max(100),
  })
  .strict()
  .superRefine((doc, ctx) => {
    if (new Set(doc.blocks.map((block) => block.id)).size !== doc.blocks.length) {
      ctx.addIssue({ code: "custom", message: "Block IDs must be unique.", path: ["blocks"] });
    }
    if (new TextEncoder().encode(JSON.stringify(doc)).byteLength > 128 * 1024) {
      ctx.addIssue({ code: "custom", message: "Document exceeds 128 KiB." });
    }
  });

/**
 * WebP renditions of a published image; `null` when the version has none. `card` (16:9) and
 * `square` are cropped around the image's focal point.
 */
export const PublicMediaVariants = z.object({
  thumb: z.string().nullable(),
  display: z.string().nullable(),
  card: z.string().nullable().default(null),
  square: z.string().nullable().default(null),
});
/**
 * A media reference frozen into a publication. `url` is the original; `variants` are smaller
 * renditions for `srcset`. Older payloads lack `alt`, dimensions and variants, so they default.
 */
export const PublicMedia = z.object({
  assetId: z.uuid(),
  versionId: z.uuid(),
  kind: z.enum(["image", "audio", "video"]),
  url: z.string(),
  credits: z.string(),
  mime: z.string(),
  alt: z.string().default(""),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  duration: z.number().nullable().default(null),
  variants: PublicMediaVariants.default({ thumb: null, display: null, card: null, square: null }),
});
export const PublishedRecord = z.object({
  contractVersion: ListenerContractVersion,
  id: z.uuid(),
  publicationId: z.uuid(),
  revision: z.number().int().positive(),
  type: SchemaKey,
  schemaVersion: z.number().int().positive(),
  /** When this live version was published. */
  publishedAt: z.string(),
  /** When the record first went public; corrections do not move it. */
  firstPublishedAt: z.string().optional(),
  values: z.record(z.string(), JsonValue),
  document: EditorialDocument,
  media: z.array(PublicMedia).max(100),
  /**
   * Planning links of a published `shows` or `presenters` record: the shows it is the profile of,
   * or presents. Matches `program.id` in the public schedule and `id` in the shows.
   */
  related: z.object({ programIds: z.array(z.uuid()).max(50) }).optional(),
});
export const PublishedCollection = z.object({
  contractVersion: ListenerContractVersion,
  type: SchemaKey,
  records: z.array(PublishedRecord).max(50),
  /** Opaque keyset cursor; pass it back as `cursor` for the next page. */
  nextCursor: z.string().max(400).nullable(),
  page: z.object({
    limit: z.number().int().min(1).max(50),
    nextCursor: z.string().max(400).nullable(),
  }),
});
/** Rich text in a field such as a presenter's bio: paragraphs and headings, or text blocks. */
export const RichText = z.union([
  z
    .object({
      version: z.literal(1),
      blocks: z
        .array(
          z.discriminatedUnion("type", [
            z.object({ type: z.literal("paragraph"), text: z.string().max(20000) }).strict(),
            z
              .object({
                type: z.literal("heading"),
                level: z.number().int().min(1).max(3),
                text: z.string().max(20000),
              })
              .strict(),
          ]),
        )
        .max(100),
    })
    .strict(),
  z
    .object({
      version: z.literal(2),
      blocks: z
        .array(z.union([EditorialBlock.options[0], EditorialBlock.options[1], EditorialBlock.options[2]]))
        .max(100),
    })
    .strict(),
]);

/*
 * The four content types every station has, with fields fixed in RadioTools: their records have
 * typed `values`. `title` and `slug` are always set; any other field is absent until the record
 * sets it. A record published before its station moved onto the fixed schema may carry other keys
 * until it is republished, so the values objects accept extra JSON keys. A catalog type (`events`,
 * `notices`) or a custom type keeps the generic `PublishedRecord`.
 */
const operationalValues = {
  title: z.string(),
  slug: z.string(),
  /** A media asset id: the record's `media` entry with this `assetId`. */
  featured_image: z.uuid().optional(),
};
export const PublishedNewsValues = z
  .object({
    ...operationalValues,
    /** At most 300 characters. */
    summary: z.string().optional(),
    /** A choice key; the station manages the options, so read the labels from the schemas. */
    category: z.string().optional(),
    source: z.string().optional(),
  })
  .catchall(JsonValue);
export const PublishedPresenterValues = z
  .object({
    ...operationalValues,
    /** The presenter's name. */
    title: z.string(),
    bio: RichText.optional(),
    role: z.string().optional(),
  })
  .catchall(JsonValue);
export const PublishedShowValues = z
  .object({
    ...operationalValues,
    description: RichText.optional(),
    /** Up to 10 rows, each naming a published `presenters` record by id. */
    presenters: z.array(z.object({ presenter: z.uuid().optional() }).catchall(JsonValue)).optional(),
    website: z.string().optional(),
  })
  .catchall(JsonValue);
export const PublishedPageValues = z
  .object({
    ...operationalValues,
    /** At most 300 characters; also the page's meta description. */
    summary: z.string().optional(),
  })
  .catchall(JsonValue);
export const PublishedNews = PublishedRecord.extend({
  type: z.literal("news"),
  values: PublishedNewsValues,
});
export const PublishedPresenter = PublishedRecord.extend({
  type: z.literal("presenters"),
  values: PublishedPresenterValues,
});
export const PublishedShow = PublishedRecord.extend({
  type: z.literal("shows"),
  values: PublishedShowValues,
});
export const PublishedPage = PublishedRecord.extend({
  type: z.literal("pages"),
  values: PublishedPageValues,
});
export const PublishedNewsCollection = PublishedCollection.extend({
  type: z.literal("news"),
  records: z.array(PublishedNews).max(50),
});
export const PublishedPresenterCollection = PublishedCollection.extend({
  type: z.literal("presenters"),
  records: z.array(PublishedPresenter).max(50),
});
export const PublishedShowCollection = PublishedCollection.extend({
  type: z.literal("shows"),
  records: z.array(PublishedShow).max(50),
});
export const PublishedPageCollection = PublishedCollection.extend({
  type: z.literal("pages"),
  records: z.array(PublishedPage).max(50),
});

export const PreviewInput = z
  .object({
    stationId: z.string().min(1).max(80),
    recordId: z.uuid(),
    revision: z.number().int().positive(),
    audience: z.string().min(1).max(100),
  })
  .strict();
export const RevisionPreview = z.object({
  media: z.array(PublicMedia).max(100),
  id: z.uuid(),
  revision: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  values: z.record(z.string(), JsonValue),
  document: EditorialDocument,
});

const LocalDate = z.iso.date();
/**
 * How a broadcast reaches air: `live` is presented by its team, `nonstop` is automation playing
 * music, `prerecorded` a finished recording, and `repeat` replays the broadcast `repeatOfId` names.
 */
export const BroadcastNature = z.enum(["live", "nonstop", "prerecorded", "repeat"]);
/** What kind of show it is; its broadcasts take the type as their `nature` unless set apart. */
export const ShowType = z.enum(["live", "nonstop", "prerecorded"]);
export const PublicBroadcast = z.object({
  id: z.uuid(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  timezone: Timezone,
  localDate: LocalDate,
  resolution: z.string(),
  status: z.enum(["scheduled", "cancelled", "live", "completed"]),
  cancellationReason: z.string(),
  repeatOfId: z.uuid().nullable(),
  /** `nonstop`, `prerecorded` or `repeat` lets a listener app label the slot; `live` otherwise. */
  nature: BroadcastNature.default("live"),
  program: z.object({ id: z.uuid(), title: z.string(), profileId: z.uuid().nullable() }),
  presenters: z.array(z.object({ id: z.uuid(), title: z.string() })),
});
export const PublicSchedule = z.object({
  contractVersion: ListenerContractVersion,
  timezone: Timezone,
  broadcasts: z.array(PublicBroadcast),
  truncated: z.boolean(),
});
const PublicPresenter = z.object({ id: z.uuid(), title: z.string() });
/**
 * A programme's regular slot: `weekday` is 0 = Sunday … 6 = Saturday, `startTime` is wall time in
 * `timezone`. `fromDate`/`throughDate` bound the rule currently in force.
 */
export const PublicProgramSlot = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(1).max(1440),
  timezone: Timezone,
  intervalWeeks: z.number().int().min(1).max(8),
  fromDate: LocalDate,
  throughDate: LocalDate,
  presenters: z.array(PublicPresenter),
});
export const PublicProgram = z.object({
  id: z.uuid(),
  title: z.string(),
  profileId: z.uuid().nullable(),
  /** `nonstop` or `prerecorded` lets a listener app label the show; `live` otherwise. */
  type: ShowType.default("live"),
  /** Published presenter profiles of the programme and of its slots in the window. */
  presenters: z.array(PublicPresenter),
  /** Regular slots whose rule overlaps the requested window, Monday first. */
  slots: z.array(PublicProgramSlot).max(100),
});
/** The shows on air in a window, with their regular slots and presenters. */
export const PublicShows = z.object({
  contractVersion: ListenerContractVersion,
  timezone: Timezone,
  fromDate: LocalDate,
  throughDate: LocalDate,
  shows: z.array(PublicProgram).max(500),
  truncated: z.boolean(),
});
export const PublicCurrentBroadcast = z.object({
  contractVersion: ListenerContractVersion,
  timezone: Timezone,
  asOf: z.iso.datetime(),
  broadcast: PublicBroadcast.nullable(),
});

/** A published recording: the broadcast as the public schedule showed it, and its audio. */
export const PublicOnDemandBroadcast = z.object({
  id: z.uuid(),
  title: z.string(),
  /** What the recording is about, set by whoever attached it; empty when nobody did. */
  description: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  timezone: Timezone,
  localDate: LocalDate,
  nature: BroadcastNature,
  program: z.object({ id: z.uuid(), title: z.string(), profileId: z.uuid().nullable() }),
  presenters: z.array(PublicPresenter),
  audio: z.object({
    /** Anonymous and byte-range capable, on the same origin as `resources.media`. */
    url: z.string(),
    mime: z.string(),
    /** Bytes. */
    size: z.number().int().nonnegative(),
    durationSeconds: z.number().nonnegative().nullable(),
  }),
});
/** One page of a station's published recordings, newest broadcast first. */
export const PublicOnDemand = z.object({
  contractVersion: ListenerContractVersion,
  timezone: Timezone,
  items: z.array(PublicOnDemandBroadcast).max(50),
  /** Opaque cursor; pass it back as `cursor` for the next page. */
  nextCursor: z.string().nullable(),
});

export const PlaybackArtworkUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "artworkUrl must be an https URL");

const playbackDuration = z.number().int().min(0).max(86400).nullable();

/** Wire JSON for `POST /api/v1/integrations/playback`. */
export const PlaybackObservationIngestBody = z
  .object({
    eventId: z.string().trim().min(1).max(100).optional(),
    observedAt: z.number().int().min(0).max(8_640_000_000_000_000).optional(),
    artist: z.string().trim().min(1).max(500).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    streamTitle: z.string().trim().min(1).max(1001).optional(),
    album: z.string().trim().min(1).max(500).optional(),
    sourceTrackId: z.string().trim().min(1).max(120).optional(),
    artworkUrl: PlaybackArtworkUrl.optional(),
    durationSeconds: playbackDuration.optional(),
    duration: playbackDuration.optional(),
    isPlaying: z.boolean().default(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasArtist = value.artist !== undefined;
    const hasTitle = value.title !== undefined;
    if (hasArtist !== hasTitle) {
      ctx.addIssue({
        code: "custom",
        message: "artist and title must be supplied together",
        path: hasArtist ? ["title"] : ["artist"],
      });
    }
    if (!hasArtist && value.streamTitle === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Provide artist and title or streamTitle",
        path: ["streamTitle"],
      });
    }
    if (hasArtist && value.streamTitle !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Use either artist and title or streamTitle",
        path: ["streamTitle"],
      });
    }
    if (
      value.duration !== undefined &&
      value.durationSeconds !== undefined &&
      value.duration !== value.durationSeconds
    ) {
      ctx.addIssue({
        code: "custom",
        message: "duration and durationSeconds must match when both are set",
        path: ["duration"],
      });
    }
  });

export const PlaybackObservationResult = z.object({
  accepted: z.boolean(),
  outcome: z.enum([
    "no-live-broadcast",
    "on-air-not-following-rundown",
    "not-playing",
    "rejected",
    "recorded",
    "matched",
    "uncertain",
    "ignored",
  ]),
});

const PlaybackFreshnessStatus = z.enum(["fresh", "stale", "empty"]);
const PublicPlaybackTrack = z
  .object({
    artist: z.string(),
    title: z.string(),
    album: z.string().nullable(),
    durationSeconds: z.number().int().nonnegative().nullable(),
    artworkUrl: PlaybackArtworkUrl.optional(),
    isPlaying: z.boolean(),
    observedAt: z.string().datetime(),
    receivedAt: z.string().datetime(),
  })
  .strict();
const PlaybackFreshness = z
  .object({
    status: PlaybackFreshnessStatus,
    thresholdSeconds: z.number().int().positive(),
    ageSeconds: z.number().int().nonnegative().nullable(),
    observedAt: z.string().datetime().nullable(),
    receivedAt: z.string().datetime().nullable(),
  })
  .strict();
export const PublicNowPlaying = z
  .object({
    contractVersion: ListenerContractVersion,
    stationId: z.string(),
    timezone: Timezone,
    track: PublicPlaybackTrack.nullable(),
    elapsedSeconds: z.number().int().nonnegative().nullable(),
    endsAt: z.string().datetime().nullable(),
    freshness: PlaybackFreshness,
  })
  .strict();
const PublicHistoryEntry = PublicPlaybackTrack.extend({
  id: z.string().min(1).max(80),
});
export const PublicTrackHistory = z
  .object({
    contractVersion: ListenerContractVersion,
    stationId: z.string(),
    items: z.array(PublicHistoryEntry),
    nextCursor: z.string().max(512).nullable(),
  })
  .strict();

const WeatherConditionCode = z.enum([
  "Clear",
  "MostlyClear",
  "PartlyCloudy",
  "Cloudy",
  "Fog",
  "Drizzle",
  "FreezingDrizzle",
  "Rain",
  "HeavyRain",
  "FreezingRain",
  "Snow",
  "HeavySnow",
  "Flurries",
  "Showers",
  "SnowShowers",
  "Thunderstorm",
  "SevereThunderstorm",
]);
const WeatherRegionId = z.string().regex(/^[a-z]{2}:[a-z0-9][a-z0-9_-]{0,62}$/);
const WeatherCoverageArea = z
  .object({
    id: WeatherRegionId,
    name: z.string(),
    countryCode: z.string().regex(/^[a-z]{2}$/),
    countryName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: Timezone,
  })
  .strict();
const WeatherCurrent = z
  .object({
    asOf: z.string().datetime(),
    conditionCode: WeatherConditionCode,
    daylight: z.boolean(),
    precipitation: z.number(),
    temperature: z.number(),
    temperatureApparent: z.number(),
    uvIndex: z.number(),
    windDirection: z.number(),
    windGust: z.number(),
    windSpeed: z.number(),
  })
  .strict();
const WeatherHour = z
  .object({
    forecastStart: z.string().datetime(),
    conditionCode: WeatherConditionCode,
    daylight: z.boolean(),
    precipitation: z.number(),
    precipitationChance: z.number().min(0).max(1),
    temperature: z.number(),
    temperatureApparent: z.number(),
    windDirection: z.number(),
    windGust: z.number(),
    windSpeed: z.number(),
  })
  .strict();
const WeatherDay = z
  .object({
    forecastStart: z.string().datetime(),
    conditionCode: WeatherConditionCode,
    precipitationAmount: z.number(),
    precipitationChance: z.number().min(0).max(1),
    sunriseTime: z.string().datetime(),
    sunsetTime: z.string().datetime(),
    temperatureMax: z.number(),
    temperatureMin: z.number(),
    uvIndex: z.number(),
    windDirection: z.number(),
    windGust: z.number(),
    windSpeed: z.number(),
  })
  .strict();
const WeatherFreshness = z
  .object({
    status: z.enum(["fresh", "stale", "unavailable", "empty"]),
    thresholdSeconds: z.number().int().positive(),
    ageSeconds: z.number().int().nonnegative().nullable(),
    fetchedAt: z.string().datetime().nullable(),
    observedAt: z.string().datetime().nullable(),
    lastError: z.string().nullable(),
  })
  .strict();
/**
 * Who forecast a snapshot: `open-meteo` (RadioTools' data or the station's own key),
 * `openweathermap` (the station's key) or `station` (the station's own feed). Any other source a
 * later RadioTools release adds parses too. OpenWeatherMap asks for a visible credit.
 */
const WeatherSource = z.string().min(1);
const WeatherSnapshot = z
  .object({
    source: WeatherSource,
    coverage: WeatherCoverageArea,
    freshness: WeatherFreshness,
    current: WeatherCurrent.nullable(),
    hourly: z.array(WeatherHour),
    daily: z.array(WeatherDay),
  })
  .strict();
export const WeatherPublic = z
  .object({
    contractVersion: ListenerContractVersion,
    stationId: z.string(),
    timezone: Timezone,
    snapshots: z.array(WeatherSnapshot),
  })
  .strict();

const TrafficRoadId = z.string().regex(/^nl:[an](?:[0-9]{1,3}|-all)$/, "Use nl:{road} watch ids");
const TrafficWatchRoad = z
  .object({
    id: TrafficRoadId,
    code: z.string().min(2).max(8),
    name: z.string(),
  })
  .strict();
const TrafficIncident = z
  .object({
    id: z.string(),
    road: z.string(),
    type: z.enum(["jam", "roadworks", "closure", "speed_check"]),
    direction: z.enum([
      "northbound",
      "southbound",
      "eastbound",
      "westbound",
      "both",
      "unknown",
    ]),
    from: z.string(),
    to: z.string(),
    lengthMeters: z.number().int().nonnegative().nullable(),
    delaySeconds: z.number().int().nonnegative().nullable(),
    /** Null when the provider text names no recognised cause. */
    cause: z
      .enum([
        "accident",
        "vehicle_fire",
        "broken_down_vehicle",
        "object_on_road",
        "clearance_work",
        "technical_problem",
        "roadworks",
        "closure",
      ])
      .nullable(),
    /** What is closed, when the provider text says so; null otherwise. */
    closure: z
      .enum(["road", "entry", "exit", "entry_and_exit", "connector", "lane", "heavy_vehicles"])
      .nullable(),
    /** The provider's own text (Dutch). */
    summary: z.string(),
    updatedAt: z.string().datetime(),
  })
  .strict();
/**
 * Who reported the incidents: `anwb` (RadioTools' data), `ndw` (the Netherlands' national road
 * data) or `station` (the station's own feed). Any other source a later RadioTools release adds
 * parses too.
 */
const TrafficSource = z.string().min(1);
const TrafficSnapshot = z
  .object({
    source: TrafficSource,
    watch: z.object({ roads: z.array(TrafficWatchRoad) }).strict(),
    freshness: z
      .object({
        status: z.enum(["fresh", "stale", "unavailable", "empty"]),
        thresholdSeconds: z.number().int().positive(),
        ageSeconds: z.number().int().nonnegative().nullable(),
        fetchedAt: z.string().datetime().nullable(),
        observedAt: z.string().datetime().nullable(),
        lastError: z.string().nullable(),
      })
      .strict(),
    incidents: z.array(TrafficIncident),
    totals: z
      .object({
        incidentCount: z.number().int().nonnegative(),
        jamDistanceMeters: z.number().int().nonnegative(),
        delaySeconds: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
export const TrafficPublic = z
  .object({
    contractVersion: ListenerContractVersion,
    stationId: z.string(),
    snapshot: TrafficSnapshot,
  })
  .strict();

export const PublicOnAir = z
  .object({
    broadcastId: z.uuid(),
    status: z.enum(["scheduled", "live", "completed"]),
    activeItemId: z.uuid().nullable(),
    observation: z
      .object({
        observedAt: z.number(),
        itemId: z.uuid().nullable(),
        durationSeconds: z.number().nullable(),
        outcome: z.enum(["matched", "uncertain", "ignored"]),
      })
      .strict()
      .nullable(),
  })
  .strict();

const socketEnvelope = {
  protocol: z.literal(PUBLIC_SOCKET_PROTOCOL),
  stationId: z.string().min(1).max(80),
};
export const PublicSocketEvent = z.discriminatedUnion("type", [
  z.object({ ...socketEnvelope, type: z.literal("schedule"), data: PublicSchedule }).strict(),
  z.object({ ...socketEnvelope, type: z.literal("on-air"), data: PublicOnAir.nullable() }).strict(),
  z
    .object({ ...socketEnvelope, type: z.literal("now-playing"), data: PublicNowPlaying })
    .strict(),
  z
    .object({
      ...socketEnvelope,
      type: z.literal("content"),
      recordId: z.uuid(),
      data: PublishedRecord.nullable(),
    })
    .strict(),
  z.object({ ...socketEnvelope, type: z.literal("preview"), data: RevisionPreview }).strict(),
]);

export const sdkSchemas = {
  ErrorResponse,
  IngestErrorResponse,
  PublicStation,
  PublicSchema,
  PublicSchemaList,
  PublishedRecord,
  PublishedCollection,
  PublishedNews,
  PublishedPresenter,
  PublishedShow,
  PublishedPage,
  PublishedNewsCollection,
  PublishedPresenterCollection,
  PublishedShowCollection,
  PublishedPageCollection,
  PublicSchedule,
  PublicShows,
  PublicCurrentBroadcast,
  PublicOnDemand,
  WeatherPublic,
  TrafficPublic,
  PreviewInput,
  RevisionPreview,
  PlaybackObservationIngestBody,
  PlaybackObservationResult,
  PublicNowPlaying,
  PublicTrackHistory,
  PublicOnAir,
  PublicSocketEvent,
} as const;

export type SdkErrorResponse = z.infer<typeof ErrorResponse>;
export type SdkErrorCode = z.infer<typeof ErrorCode>;
export type SdkPublicStation = z.infer<typeof PublicStation>;
export type SdkPublicStationProfile = z.infer<typeof PublicStationProfile>;
export type SdkPublicRealtimeDescriptor = z.infer<typeof PublicRealtimeDescriptor>;
export type SdkPublicSchema = z.infer<typeof PublicSchema>;
export type SdkPublicSchemaList = z.infer<typeof PublicSchemaList>;
export type SdkPublishedRecord = z.infer<typeof PublishedRecord>;
export type SdkPublishedCollection = z.infer<typeof PublishedCollection>;
export type SdkRichText = z.infer<typeof RichText>;
export type SdkPublishedNews = z.infer<typeof PublishedNews>;
export type SdkPublishedPresenter = z.infer<typeof PublishedPresenter>;
export type SdkPublishedShow = z.infer<typeof PublishedShow>;
export type SdkPublishedPage = z.infer<typeof PublishedPage>;
export type SdkPublishedNewsCollection = z.infer<typeof PublishedNewsCollection>;
export type SdkPublishedPresenterCollection = z.infer<typeof PublishedPresenterCollection>;
export type SdkPublishedShowCollection = z.infer<typeof PublishedShowCollection>;
export type SdkPublishedPageCollection = z.infer<typeof PublishedPageCollection>;
export type SdkPublicMedia = z.infer<typeof PublicMedia>;
export type SdkPublicSchedule = z.infer<typeof PublicSchedule>;
export type SdkPublicShows = z.infer<typeof PublicShows>;
export type SdkPublicProgramSlot = z.infer<typeof PublicProgramSlot>;
export type SdkPublicCurrentBroadcast = z.infer<typeof PublicCurrentBroadcast>;
export type SdkBroadcastNature = z.infer<typeof BroadcastNature>;
export type SdkShowType = z.infer<typeof ShowType>;
export type SdkPublicOnDemand = z.infer<typeof PublicOnDemand>;
export type SdkPublicOnDemandBroadcast = z.infer<typeof PublicOnDemandBroadcast>;
export type SdkWeatherPublic = z.infer<typeof WeatherPublic>;
export type SdkTrafficPublic = z.infer<typeof TrafficPublic>;
export type SdkPreviewInput = z.infer<typeof PreviewInput>;
export type SdkRevisionPreview = z.infer<typeof RevisionPreview>;
export type SdkPlaybackObservation = z.input<typeof PlaybackObservationIngestBody>;
export type SdkPlaybackObservationResult = z.infer<typeof PlaybackObservationResult>;
export type SdkPublicNowPlaying = z.infer<typeof PublicNowPlaying>;
export type SdkPublicTrackHistory = z.infer<typeof PublicTrackHistory>;
export type SdkPublicOnAir = z.infer<typeof PublicOnAir>;
export type SdkPublicSocketEvent = z.infer<typeof PublicSocketEvent>;
