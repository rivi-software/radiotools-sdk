---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

Read a broadcast's, show slot's or on-demand item's end the way a schedule shows it.

The listener API added `endTime` to broadcasts, show slots and on-demand items, over REST and GraphQL: the end as `HH:MM` in the item's `timezone`. A show that ends at midnight reads `23:59`, not `00:00`. `endsAt` stays the exact end.

**Added**

- `endTime` on what `getSchedule`, `getCurrentBroadcast`, `getShows` (each slot), `getOnDemand` and `iterateOnDemand` return, and on the realtime feed's schedule. The GraphQL queries select it.
- `endTime` in the GraphQL schema and the OpenAPI document.

**Changed**

- `endTime` is required. Code that builds these types itself, such as a test fixture typed as `SdkPublicSchedule`, `SdkPublicProgramSlot` or `SdkPublicOnDemandBroadcast`, needs to set it.
