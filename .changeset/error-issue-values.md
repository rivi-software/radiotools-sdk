---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

Read the values a refused request's issue names, so you can word it in your own language.

The API's error contract added `values` to each of an error's `issues`: what the issue's `code` names, as data rather than words (for example `{ type: "song", field: "mood" }`). Before, the SDK dropped it. No listener route sends it yet.

**Added**

- `values` on each of `RadioToolsApiError`'s `issues`, and in `SdkErrorResponse` and the OpenAPI document.
