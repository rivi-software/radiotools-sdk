---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-react": minor
"@rivi-software/radiotools-sdk-vue": minor
"@rivi-software/radiotools-sdk-svelte": minor
"@rivi-software/radiotools-sdk-next": minor
"@rivi-software/radiotools-sdk-generator": minor
---

Follow the listener API's on-demand recordings, show types and station-chosen weather and traffic sources.

**Added**

- `getOnDemand({ programId?, cursor?, limit? })` and `iterateOnDemand` read the published recordings of aired broadcasts from `station.resources.onDemand`, over REST and GraphQL. Each item is the broadcast as the schedule shows it, plus `description` and `audio` (an anonymous, byte-range capable URL, its `mime`, `size` and `durationSeconds`). `getOnDemand` answers `null` when the station offers none, without a second request, as `getWeather` and `getTraffic` do. `SdkPublicOnDemand`, `SdkPublicOnDemandBroadcast` and `sdkSchemas.PublicOnDemand` are exported. The Python client has `get_on_demand`; the React, Vue, Svelte and Next.js bindings have `useGetOnDemand`, `createGetOnDemandStore`, `fetchGetOnDemand` and `jsonResponseOnDemand`; the OpenAPI document lists `GET …/on-demand`; the GraphQL schema has the `onDemand` query with its `OnDemand`, `OnDemandBroadcast` and `OnDemandAudio` types and `StationResources.onDemand`.
- Shows have a `type`: `live`, `nonstop` or `prerecorded` (`SdkShowType`). A show without one, from an older payload, reads as `live`.

**Fixed**

- A broadcast whose `nature` is `nonstop` (automation playing music) parses. The API added `nonstop` next to `live`, `prerecorded` and `repeat`, so a schedule, current broadcast or realtime schedule event that held one failed validation. `SdkBroadcastNature` is exported.
- Weather and traffic from a source the station chose parse. `snapshots[].source` and `snapshot.source` were the literals `"open-meteo"` and `"anwb"`; they are now any non-empty string, so a station on OpenWeatherMap (`"openweathermap"`), NDW (`"ndw"`) or its own feed (`"station"`) no longer fails every weather or traffic read, and a source a later RadioTools release adds needs no SDK release. OpenWeatherMap asks for a visible credit, "Weather data provided by OpenWeather".
