import type { PublicJsonRequestOptions } from "./http.js";
import { postJson, RadioToolsApiError } from "./http.js";
import { type SdkPublishedCollection, type SdkPublishedRecord, sdkSchemas } from "./schemas.js";

export type GraphqlRequestOptions = PublicJsonRequestOptions & {
  previewGrant?: string;
};

type GraphqlError = { message: string; extensions?: { code?: string } };

type GraphqlEnvelope<T> = {
  data?: T;
  errors?: GraphqlError[];
};

function graphqlError(errors: GraphqlError[]): Error {
  const code = errors[0]?.extensions?.code ?? "INTERNAL_ERROR";
  return Object.assign(new Error(errors[0]?.message ?? "GraphQL error"), {
    name: "RadioToolsGraphqlError",
    code,
    errors,
  });
}

export async function graphqlRequest<TData>(
  endpoint: string,
  query: string,
  variables: Record<string, unknown> | undefined,
  options: GraphqlRequestOptions = {},
): Promise<TData> {
  const headers: Record<string, string> = {};
  if (options.apiToken) headers.authorization = `Bearer ${options.apiToken}`;
  if (options.previewGrant) headers["x-preview-grant"] = options.previewGrant;
  const body = await postJson<GraphqlEnvelope<TData>>(
    endpoint,
    { query, variables },
    { parse: (value) => value as GraphqlEnvelope<TData> },
    {
      fetch: options.fetch,
      headers,
      cache: options.cache ?? "no-store",
      credentials: options.credentials ?? "omit",
      retries: options.retries,
      // When no selected field answered, the API sends the errors with the most severe one's status.
      errorFor: (value) => {
        const errors = (value as GraphqlEnvelope<TData> | null)?.errors;
        return Array.isArray(errors) && errors.length ? graphqlError(errors) : null;
      },
    },
  );
  if (body.errors?.length) throw graphqlError(body.errors);
  if (!body.data) throw new Error("GraphQL response missing data");
  return body.data;
}

export function isGraphqlUnavailable(error: unknown): boolean {
  if (error instanceof RadioToolsApiError) return error.status === 404;
  return error instanceof Error && error.message.includes("(404)");
}

const broadcastFields = `
  id
  title
  startsAt
  endsAt
  timezone
  localDate
  resolution
  status
  cancellationReason
  repeatOfId
  nature
  program { id title profileId }
  presenters { id title }
`;

const mediaFields = `
  assetId
  versionId
  kind
  url
  credits
  mime
  alt
  width
  height
  duration
  variants { thumb display card square }
`;

const recordFields = `
  contractVersion
  id
  publicationId
  revision
  type
  schemaVersion
  publishedAt
  firstPublishedAt
  values
  document
  media { ${mediaFields} }
  related { programIds }
`;

export const stationQuery = /* GraphQL */ `
  query SdkStation {
    station {
      contractVersion
      id
      slug
      name
      timezone
      publishingLanguage
      profile {
        tagline
        description
        frequencyLabel
        websiteUrl
        streamUrl
        contactEmail
        phone
        address { street postalCode city country }
        social { network url }
      }
      resources {
        schemas
        content
        schedule
        shows
        broadcast
        nowPlaying
        trackHistory
        onDemand
        realtime { url channel }
        weather
        traffic
        media
      }
      delivery { cache conditional pollIntervalSeconds }
    }
  }
`;

export const schemasQuery = /* GraphQL */ `
  query SdkSchemas {
    schemas { key label version archived fields }
  }
`;

export const contentQuery = /* GraphQL */ `
  query SdkContent(
    $type: String!
    $cursor: ID
    $limit: Int
    $sort: ContentSort
    $direction: SortDirection
    $filter: [ContentFilter!]
  ) {
    content(
      type: $type
      cursor: $cursor
      limit: $limit
      sort: $sort
      direction: $direction
      filter: $filter
    ) {
      nextCursor
      records { ${recordFields} }
    }
  }
`;

export const contentRecordQuery = /* GraphQL */ `
  query SdkContentRecord($id: ID!) {
    contentRecord(id: $id) { ${recordFields} }
  }
`;

export const contentBySlugQuery = /* GraphQL */ `
  query SdkContentBySlug($type: String!, $slug: String!) {
    contentBySlug(type: $type, slug: $slug) { ${recordFields} }
  }
`;

export const nowPlayingQuery = /* GraphQL */ `
  query SdkNowPlaying {
    nowPlaying {
      contractVersion
      stationId
      timezone
      track {
        artist
        title
        album
        durationSeconds
        artworkUrl
        isPlaying
        observedAt
        receivedAt
      }
      elapsedSeconds
      endsAt
      freshness { status thresholdSeconds ageSeconds observedAt receivedAt }
    }
  }
`;

export const trackHistoryQuery = /* GraphQL */ `
  query SdkTrackHistory($cursor: String, $limit: Int) {
    trackHistory(cursor: $cursor, limit: $limit) {
      contractVersion
      stationId
      items {
        id
        artist
        title
        album
        durationSeconds
        artworkUrl
        isPlaying
        observedAt
        receivedAt
      }
      nextCursor
    }
  }
`;

export const scheduleQuery = /* GraphQL */ `
  query SdkSchedule($fromDate: String!, $throughDate: String!) {
    schedule(fromDate: $fromDate, throughDate: $throughDate) {
      contractVersion
      timezone
      truncated
      broadcasts { ${broadcastFields} }
    }
  }
`;

const showFields = /* GraphQL */ `
  id
  title
  profileId
  type
  presenters { id title }
  slots {
    weekday
    startTime
    durationMinutes
    timezone
    intervalWeeks
    fromDate
    throughDate
    presenters { id title }
  }
`;

export const showsQuery = /* GraphQL */ `
  query SdkShows($fromDate: String!, $throughDate: String!) {
    shows(fromDate: $fromDate, throughDate: $throughDate) {
      contractVersion
      timezone
      fromDate
      throughDate
      truncated
      shows { ${showFields} }
    }
  }
`;

export const currentBroadcastQuery = /* GraphQL */ `
  query SdkCurrentBroadcast {
    currentBroadcast {
      contractVersion
      timezone
      asOf
      broadcast { ${broadcastFields} }
    }
  }
`;

export const onDemandQuery = /* GraphQL */ `
  query SdkOnDemand($programId: ID, $cursor: String, $limit: Int) {
    onDemand(programId: $programId, cursor: $cursor, limit: $limit) {
      contractVersion
      timezone
      nextCursor
      items {
        id
        title
        description
        startsAt
        endsAt
        timezone
        localDate
        nature
        program { id title profileId }
        presenters { id title }
        audio { url mime size durationSeconds }
      }
    }
  }
`;

export const weatherQuery = /* GraphQL */ `
  query SdkWeather {
    weather { stationId timezone snapshots }
  }
`;

export const trafficQuery = /* GraphQL */ `
  query SdkTraffic {
    traffic { stationId snapshot }
  }
`;

export const previewMutation = /* GraphQL */ `
  mutation SdkPreview($input: PreviewInput!) {
    previewEditorial(input: $input) {
      id
      revision
      schemaVersion
      values
      document
      media { ${mediaFields} }
    }
  }
`;

/** GraphQL returns `null` for fields the REST contract omits; drop them before parsing. */
function omitNull(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return value;
  const { [key]: field, ...rest } = value as Record<string, unknown>;
  return field == null ? rest : value;
}

export function parseGraphqlStation(data: { station: unknown }) {
  return sdkSchemas.PublicStation.parse(omitNull(data.station, "profile"));
}

export function parseGraphqlRecord<T = SdkPublishedRecord>(
  record: unknown,
  schema: { parse: (data: unknown) => T } = sdkSchemas.PublishedRecord as never,
): T {
  return schema.parse(omitNull(record, "related"));
}

export function parseGraphqlSchemas(data: { schemas: unknown[] }) {
  return sdkSchemas.PublicSchemaList.parse({ contractVersion: 1, types: data.schemas });
}

export function parseGraphqlContent<T = SdkPublishedCollection>(
  type: string,
  data: { content: { records: unknown[]; nextCursor: string | null } },
  limit: number,
  schema: { parse: (data: unknown) => T } = sdkSchemas.PublishedCollection as never,
): T {
  const nextCursor = data.content.nextCursor;
  return schema.parse({
    contractVersion: 1,
    type,
    records: data.content.records.map((record) => omitNull(record, "related")),
    nextCursor,
    page: { limit, nextCursor },
  });
}

export function parseGraphqlSchedule(data: { schedule: unknown }) {
  return sdkSchemas.PublicSchedule.parse(data.schedule);
}

export function parseGraphqlShows(data: { shows: unknown }) {
  return sdkSchemas.PublicShows.parse(data.shows);
}

export function parseGraphqlCurrentBroadcast(data: { currentBroadcast: unknown }) {
  return sdkSchemas.PublicCurrentBroadcast.parse(data.currentBroadcast);
}

export function parseGraphqlNowPlaying(data: { nowPlaying: unknown }) {
  return sdkSchemas.PublicNowPlaying.parse(data.nowPlaying);
}

export function parseGraphqlTrackHistory(data: { trackHistory: unknown }) {
  return sdkSchemas.PublicTrackHistory.parse(data.trackHistory);
}

export function parseGraphqlOnDemand(data: { onDemand: unknown }) {
  return sdkSchemas.PublicOnDemand.parse(data.onDemand);
}

export function parseGraphqlWeather(data: { weather: unknown }) {
  if (data.weather == null) return null;
  return sdkSchemas.WeatherPublic.parse({ contractVersion: 1, ...(data.weather as object) });
}

export function parseGraphqlTraffic(data: { traffic: unknown }) {
  if (data.traffic == null) return null;
  return sdkSchemas.TrafficPublic.parse({ contractVersion: 1, ...(data.traffic as object) });
}

export function parseGraphqlPreview(data: { previewEditorial: unknown }) {
  return sdkSchemas.RevisionPreview.parse(data.previewEditorial);
}
