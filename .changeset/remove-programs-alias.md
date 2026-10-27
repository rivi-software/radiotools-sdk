---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

The SDKs follow the listener API's removal of `programs` and its GraphQL error statuses.

**Removed**

- `getPrograms`, `SdkPublicPrograms` and `sdkSchemas.PublicPrograms`, the contract's `getPrograms` method, the Python client's `get_programs` and the OpenAPI `GET …/programs` operation. The API removed the `programs` alias of shows, so `getPrograms` could only fail. Use `getShows`, which returns the same shows.

**Changed**

- `resources.programs` in the station document is optional and deprecated: the API sends it as `null`, and the SDK no longer needs it, so a station document without it parses. The GraphQL station query no longer selects it.

**Fixed**

- A GraphQL request in which no selected field answered throws a `RadioToolsGraphqlError` with the error's `code`, as a `200` response with errors already did. The API answers such a request with the most severe error's status, for example `400` for `VALIDATION_ERROR`, which the SDK reported as a bare "RadioTools request failed (400)". With `transport: "auto"`, a GraphQL `NOT_FOUND` for one field no longer falls back to REST; only a missing GraphQL route does.
