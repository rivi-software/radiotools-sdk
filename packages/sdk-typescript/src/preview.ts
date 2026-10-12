import { graphqlRequest, parseGraphqlPreview, previewMutation } from "./graphql";
import type { FetchLike } from "./http";
import { postJson } from "./http";
import { type SdkPreviewInput, type SdkRevisionPreview, sdkSchemas } from "./schemas";

export type PreviewEditorialOptions = {
  baseUrl: string;
  /** Short-lived preview grant. Pass it explicitly. Never read it from the query string. */
  grant: string;
  /** Required for GraphQL preview. REST preview uses only the grant. */
  apiToken?: string;
  input: SdkPreviewInput;
  fetch?: FetchLike;
  /** Listener site origin for browser preview CORS on the HTTP preview route. */
  listenerOrigin?: string;
  transport?: "http" | "graphql";
  stationSlug?: string;
  retries?: number;
};

/**
 * Preview unpublished editorial content with a Bearer grant.
 * Studio session cookies are never sent.
 */
export async function previewEditorial(
  options: PreviewEditorialOptions,
): Promise<SdkRevisionPreview> {
  const grant = options.grant.trim();
  if (!grant) throw new Error("Preview grant is required");

  if (options.transport === "graphql") {
    if (!options.stationSlug) throw new Error("stationSlug is required for GraphQL preview");
    if (!options.apiToken) throw new Error("Listener API token is required for GraphQL preview");
    const endpoint = new URL(
      `/api/v1/stations/${encodeURIComponent(options.stationSlug)}/graphql`,
      options.baseUrl,
    ).href;
    const data = await graphqlRequest<{ previewEditorial: unknown }>(
      endpoint,
      previewMutation,
      { input: options.input },
      {
        fetch: options.fetch,
        apiToken: options.apiToken,
        previewGrant: grant,
        credentials: "omit",
        cache: "no-store",
        retries: options.retries,
      },
    );
    return parseGraphqlPreview(data);
  }

  const url = new URL("/api/v1/preview/editorial", options.baseUrl).href;
  const headers: Record<string, string> = { authorization: `Bearer ${grant}` };
  if (options.listenerOrigin) headers.origin = options.listenerOrigin;

  return postJson(url, options.input, sdkSchemas.RevisionPreview, {
    fetch: options.fetch,
    headers,
    cache: "no-store",
    credentials: "omit",
    retries: options.retries,
  });
}

export type PreviewHandoff = { grant: string; input: SdkPreviewInput };

/**
 * Read the fields Studio's "Open on website" button POSTs to the station site's preview route:
 * `grant`, `stationId`, `recordId`, `revision` and `audience`. Accepts the parsed form body
 * (`await request.formData()`), URL search params or a plain object. Pass the result to
 * `previewEditorial`; the grant covers one revision and audience and expires after 15 minutes.
 */
export function readPreviewHandoff(
  fields: FormData | URLSearchParams | Record<string, unknown>,
): PreviewHandoff {
  const read = (name: string): unknown =>
    fields instanceof FormData || fields instanceof URLSearchParams
      ? fields.get(name)
      : fields[name];
  const grantField = read("grant");
  const grant = typeof grantField === "string" ? grantField.trim() : "";
  if (!grant) throw new Error("Preview handoff is missing the grant");
  const revisionField = read("revision");
  const revision =
    typeof revisionField === "number" ? revisionField : Number.parseInt(String(revisionField), 10);
  const input = sdkSchemas.PreviewInput.parse({
    stationId: read("stationId"),
    recordId: read("recordId"),
    revision,
    audience: read("audience"),
  });
  return { grant, input };
}
