# radiotools-sdk (Python)

Generated from `@rivi-software/radiotools-contract` via `@rivi-software/radiotools-sdk-generator`.

Regenerate after contract changes:

```bash
bun run generate -- --target python
```

This package provides a minimal `httpx` client for the listener reads and playback ingest. Reads follow the resource links of the station document, and a disabled resource raises `LookupError`. Without `api_token` (`RADIOTOOLS_API_TOKEN`) reads go out anonymously, for a station that allows anonymous reads (**Settings › Listener APIs**).

News, presenters, shows and pages have the same fixed fields on every station, so their reads are typed (`radiotools_sdk.types`):

```python
from radiotools_sdk import RadioToolsStationClient

client = RadioToolsStationClient.from_env()
for story in client.get_content("news", limit=5)["records"]:
    print(story["values"]["title"], story["values"].get("summary", ""))

page = client.get_content_by_slug("pages", "about-us")
shows = client.get_shows("2026-10-21", "2026-10-27")
recordings = client.get_on_demand(limit=10)  # None when the station offers no on-demand recordings
```

For GraphQL, WebSocket, ETag, and retry behavior, use `@rivi-software/radiotools-sdk` (TypeScript).
