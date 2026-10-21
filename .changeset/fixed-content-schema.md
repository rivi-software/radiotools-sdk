---
"@rivi-software/radiotools-contract": minor
"@rivi-software/radiotools-sdk": minor
"@rivi-software/radiotools-sdk-generator": minor
---

Follow the fixed RadioTools content schema. Every station has the same four content types, `news`, `presenters`, `shows` and `pages`, and `getContent`, `getContentBySlug` and `iterateContent` now return their records typed (`SdkPublishedNews`, `SdkPublishedPresenter`, `SdkPublishedShow`, `SdkPublishedPage`); any other type keeps `SdkPublishedRecord`, and `asContentType(record, type)` narrows a record whose type is only known at runtime. Programs are now shows: `getShows` reads `resources.shows` (REST and GraphQL), and `getPrograms` is deprecated. The station document parses `resources.shows`, which every server since RadioTools 1.11.0 sends. The Python client now implements the listener reads, with typed records for the four default types.
