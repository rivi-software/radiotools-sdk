---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

The GraphQL schema in `@rivi-software/radiotools-contract` matches the listener API again.

**Changed**

- Every query field except `station` is nullable: `schemas`, `content`, `contentRecord`, `contentBySlug`, `schedule`, `shows`, `currentBroadcast`, `nowPlaying` and `trackHistory`, as `weather` and `traffic` already were. A field that fails answers `null` with its error, and the fields beside it keep their data. Types you generate from `@rivi-software/radiotools-contract/graphql` change: regenerate them and handle a `null` query field.
- The `programs` query and its `Programs`, `ProgramSummary` and `ProgramSlot` types are gone from the schema, as they are from the API. `resources.programs` stays, deprecated and always `null`. `delivery.cache` carries its deprecation.

The SDK's methods are unchanged: each sends one query field and throws on its error, as before.
