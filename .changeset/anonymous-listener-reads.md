---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

Read a station that allows anonymous reads without a token.

A station can now switch on **Allow anonymous reads** under **Settings › Listener APIs**. Its listener REST and GraphQL reads then answer without an `Authorization` header, so a static site, a mobile app or a smart-speaker skill can call the API directly.

**Changed**

- `apiToken` is optional. `createStationClient` no longer throws when neither `apiToken` nor `ingestToken` is given, and listener reads and `subscribe` no longer throw "Listener API token (listener:read) is required": without a token they go out with no `Authorization` header. A station that has not switched anonymous reads on answers them with `401 UNAUTHENTICATED` (`RadioToolsApiError`), so the error now comes from the API instead of the client. A token you do pass is always sent and checked.
- `createStationClientFromEnv` and `stationClientOptionsFromEnv` need only `RADIOTOOLS_BASE_URL` and `RADIOTOOLS_STATION_SLUG`; both tokens are optional.
- GraphQL preview (`previewEditorial` with `transport: "graphql"`) no longer requires `apiToken`; it sends the grant in `X-Preview-Grant` and the token only when there is one.
- The Python, Go, Ruby, PHP, .NET, Kotlin and Swift clients build without a token and send listener reads without `Authorization` when they have none. Playback ingest still requires the ingest token in every client.
- The OpenAPI document lists listener reads with the station key or no security (`[{ bearerListener: [] }, {}]`), and their `401` as a token that is missing on a station that requires one, or invalid, expired, revoked, wrong-scope or cross-station. `RADIOTOOLS_API_TOKEN` no longer claims the realtime socket needs it; the socket was already anonymous.
