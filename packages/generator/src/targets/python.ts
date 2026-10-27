import { listenerSdkManifest } from "@rivi-software/radiotools-contract";
import { snakeCase } from "../shared/naming.js";
import type { SdkTarget } from "../types.js";

/** The four content types every station has; their reads return typed records. */
const DEFAULT_TYPES = [
  ["news", "News"],
  ["presenters", "Presenter"],
  ["shows", "Show"],
  ["pages", "Page"],
] as const;

const WINDOW = "from_date: str, through_date: str";
const WINDOW_PARAMS = `{"fromDate": from_date, "throughDate": through_date}`;
const CONTENT_OPTIONS =
  "*, cursor: str | None = None, limit: int = 25, sort: str | None = None, direction: str | None = None, filter: list[str] | None = None";

/** Overloads that type a default type's reads; `kind` is `Collection` or empty for one record. */
function overloads(name: string, params: string, kind: "Collection" | "") {
  return [
    ...DEFAULT_TYPES.map(
      // A literal key narrows the str fallback; mypy flags that overlap, as typeshed's do.
      ([key, type]) => `    @overload
    def ${name}(self, content_type: Literal["${key}"]${params}) -> Published${type}${kind}: ...  # type: ignore[overload-overlap]`,
    ),
    `    @overload
    def ${name}(self, content_type: str${params}) -> Published${kind || "Record"}: ...`,
  ].join("\n\n");
}

/** The body of each read, by manifest method; a read without one stays a stub. */
const READS: Record<string, (doc: string) => string> = {
  getStation: (doc) => `    def get_station(self) -> dict[str, Any]:
        """${doc}"""
        station = self._get_json(f"/api/v1/stations/{quote(self.station_slug, safe='')}")
        self._resources = station.get("resources", {})
        return station`,
  getSchemas: (doc) => `    def get_schemas(self, *, content_type: str | None = None, version: int | None = None) -> dict[str, Any]:
        """${doc}"""
        params = {"type": content_type, "version": version}
        return self._get_json(self._resource("schemas"), params={k: v for k, v in params.items() if v is not None})`,
  getContent: (doc) => `${overloads("get_content", `, ${CONTENT_OPTIONS}`, "Collection")}

    def get_content(self, content_type: str, ${CONTENT_OPTIONS}) -> Any:
        """${doc}

        filter takes the REST form: field:value, field.contains:value or field.anyOf:a,b.
        """
        params: dict[str, Any] = {"type": content_type, "limit": limit, "cursor": cursor, "sort": sort, "direction": direction, "filter": filter}
        return self._get_json(self._resource("content"), params={k: v for k, v in params.items() if v is not None})`,
  getContentRecord: (doc) => `    def get_content_record(self, record_id: str) -> PublishedRecord:
        """${doc}"""
        return cast("PublishedRecord", self._get_json(f"{self._resource('content')}/{quote(record_id, safe='')}"))`,
  getContentBySlug: (doc) => `${overloads("get_content_by_slug", ", slug: str", "")}

    def get_content_by_slug(self, content_type: str, slug: str) -> Any:
        """${doc}

        Compare values["slug"] with the slug you asked for and redirect when they differ.
        """
        return self._get_json(f"{self._resource('content')}/{quote(content_type, safe='')}/by-slug/{quote(slug, safe='')}")`,
  getSchedule: (doc) => `    def get_schedule(self, ${WINDOW}) -> dict[str, Any]:
        """${doc}"""
        return self._get_json(self._resource("schedule"), params=${WINDOW_PARAMS})`,
  getShows: (doc) => `    def get_shows(self, ${WINDOW}) -> dict[str, Any]:
        """${doc}"""
        return self._get_json(self._resource("shows"), params=${WINDOW_PARAMS})`,
  getCurrentBroadcast: (doc) => `    def get_current_broadcast(self) -> dict[str, Any]:
        """${doc}"""
        return self._get_json(self._resource("broadcast"))`,
  getNowPlaying: (doc) => `    def get_now_playing(self) -> dict[str, Any]:
        """${doc}"""
        return self._get_json(self._resource("nowPlaying"))`,
  getTrackHistory: (doc) => `    def get_track_history(self, *, cursor: str | None = None, limit: int = 25) -> dict[str, Any]:
        """${doc}"""
        params: dict[str, Any] = {"limit": limit, "cursor": cursor}
        return self._get_json(self._resource("trackHistory"), params={k: v for k, v in params.items() if v is not None})`,
  getWeather: (doc) => `    def get_weather(self) -> dict[str, Any] | None:
        """${doc}"""
        href = self.get_station().get("resources", {}).get("weather")
        return self._get_json(href) if href else None`,
  getTraffic: (doc) => `    def get_traffic(self) -> dict[str, Any] | None:
        """${doc}"""
        href = self.get_station().get("resources", {}).get("traffic")
        return self._get_json(href) if href else None`,
};

function renderPythonClient(): string {
  const manifest = listenerSdkManifest;
  const readMethods = manifest.clientMethods.filter(
    (m) => m.scope === "listener:read" && m.rest?.method === "GET" && m.name.startsWith("get"),
  );

  const methodBlocks = readMethods
    .map(
      (method) =>
        READS[method.name]?.(method.description) ??
        `    def ${snakeCase(method.name)}(self, **params: Any) -> dict[str, Any]:
        """${method.description}"""
        raise NotImplementedError("Use the TypeScript SDK or extend this client.")`,
    )
    .join("\n\n");

  const typed = DEFAULT_TYPES.flatMap(([, type]) => [
    `Published${type}`,
    `Published${type}Collection`,
  ]);

  return `"""Generated by @rivi-software/radiotools-sdk-generator — do not edit by hand."""
from __future__ import annotations

from typing import Any, Literal, cast, overload
from urllib.parse import quote

import httpx

from .types import (
    PublishedCollection,
    PublishedRecord,
${typed.map((name) => `    ${name},`).join("\n")}
)


class RadioToolsStationClient:
    """Minimal REST client for RadioTools listener contract v${manifest.contractVersion}.

    Reads follow the resource links of the station document, which the first read loads.
    """

    def __init__(
        self,
        base_url: str,
        station_slug: str,
        *,
        api_token: str | None = None,
        ingest_token: str | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        if not api_token and not ingest_token:
            raise ValueError("api_token or ingest_token is required")
        self.base_url = base_url.rstrip("/")
        self.station_slug = station_slug
        self.api_token = api_token
        self.ingest_token = ingest_token
        self._client = client or httpx.Client(timeout=30.0)
        self._resources: dict[str, Any] | None = None

    def _headers(self, *, ingest: bool = False) -> dict[str, str]:
        token = self.ingest_token if ingest else self.api_token
        if not token:
            scope = "ingest:write" if ingest else "listener:read"
            raise ValueError(f"Missing token for {scope}")
        return {"Authorization": f"Bearer {token}"}

    def _get_json(self, path: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = path if path.startswith("http") else f"{self.base_url}{path}"
        response = self._client.get(
            url,
            params=params,
            headers=self._headers(),
        )
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        return data

    def _post_json(self, path: str, body: dict[str, Any], *, ingest: bool = True) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        response = self._client.post(url, json=body, headers=self._headers(ingest=ingest))
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        return data

    def _resource(self, key: str) -> str:
        """The station's link for a resource; raises LookupError when the station has it off."""
        if self._resources is None:
            self.get_station()
        href = (self._resources or {}).get(key)
        if not isinstance(href, str) or not href:
            raise LookupError(f"Public {key} API is unavailable for this station")
        return href

${methodBlocks}

    def report_playback(self, observation: dict[str, Any], *, station_id: str | None = None) -> dict[str, Any]:
        """Send one encoder playback observation."""
        params: dict[str, str] = {}
        if station_id:
            params["stationId"] = station_id
        else:
            params["stationSlug"] = self.station_slug
        path = "${manifest.integrations.playback.path}"
        query = "&".join(f"{k}={quote(v, safe='')}" for k, v in params.items())
        return self._post_json(f"{path}?{query}", observation)

    @classmethod
    def from_env(cls) -> RadioToolsStationClient:
        import os

        base_url = os.environ.get("RADIOTOOLS_BASE_URL", "").strip()
        station_slug = os.environ.get("RADIOTOOLS_STATION_SLUG", "").strip()
        api_token = os.environ.get("RADIOTOOLS_API_TOKEN", "").strip() or None
        ingest_token = os.environ.get("RADIOTOOLS_INGEST_TOKEN", "").strip() or None
        if not base_url or not station_slug:
            raise ValueError("Set RADIOTOOLS_BASE_URL and RADIOTOOLS_STATION_SLUG")
        return cls(base_url, station_slug, api_token=api_token, ingest_token=ingest_token)
`;
}

/**
 * Typed records of the four default types. Keep the fields in step with the Zod schemas in
 * `@rivi-software/radiotools-sdk` (PublishedNewsValues and the others); its tests compare them.
 */
function renderPythonTypes(): string {
  const record = (name: string, type: string, values: string) => `class ${name}(_PublishedBase):
    type: ${type}
    values: ${values}`;
  const collection = (name: string, type: string, records: string) => `class ${name}(_CollectionBase):
    type: ${type}
    records: list[${records}]`;
  return `"""Generated by @rivi-software/radiotools-sdk-generator — do not edit by hand.

Published records as the listener API returns them. News, presenters, shows and pages have the
same fixed fields on every station, so their values are typed: title and slug are always set, any
other field is absent until the record sets it. A record published before its station moved onto
the fixed schema may carry other keys. Any other type (events, notices, or a type RIVI added to one
station) has the generic PublishedRecord; read its fields from get_schemas().
"""
from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class NewsValues(TypedDict):
    title: str
    slug: str
    featured_image: NotRequired[str]
    """A media asset id: the record's media entry with this assetId."""
    summary: NotRequired[str]
    category: NotRequired[str]
    """A choice key; the station manages the options, so read the labels from get_schemas()."""
    source: NotRequired[str]


class PresenterValues(TypedDict):
    title: str
    """The presenter's name."""
    slug: str
    featured_image: NotRequired[str]
    bio: NotRequired[dict[str, Any]]
    """Rich text."""
    role: NotRequired[str]


class ShowPresenter(TypedDict, total=False):
    presenter: str
    """The id of a published presenters record."""


class ShowValues(TypedDict):
    title: str
    slug: str
    featured_image: NotRequired[str]
    description: NotRequired[dict[str, Any]]
    """Rich text."""
    presenters: NotRequired[list[ShowPresenter]]
    website: NotRequired[str]


class PageValues(TypedDict):
    title: str
    slug: str
    featured_image: NotRequired[str]
    summary: NotRequired[str]
    """Also the page's meta description."""


class _PublishedBase(TypedDict):
    contractVersion: int
    id: str
    publicationId: str
    revision: int
    schemaVersion: int
    publishedAt: str
    firstPublishedAt: NotRequired[str]
    document: dict[str, Any]
    media: list[dict[str, Any]]
    related: NotRequired[dict[str, list[str]]]
    """Shows and presenters: the planning shows the record profiles or presents (programIds)."""


${record("PublishedRecord", "str", "dict[str, Any]")}


${DEFAULT_TYPES.map(([key, type]) => record(`Published${type}`, `Literal["${key}"]`, `${type}Values`)).join("\n\n\n")}


class _CollectionBase(TypedDict):
    contractVersion: int
    nextCursor: str | None
    page: dict[str, Any]


${collection("PublishedCollection", "str", "PublishedRecord")}


${DEFAULT_TYPES.map(([key, type]) => collection(`Published${type}Collection`, `Literal["${key}"]`, `Published${type}`)).join("\n\n\n")}
`;
}

export const pythonTarget: SdkTarget = {
  id: "python",
  description: "Python httpx client (packages/sdk-python)",
  outputDir: (repoRoot) => `${repoRoot}/packages/sdk-python/src/radiotools_sdk`,
  generate: () => [
    {
      path: "client.py",
      contents: renderPythonClient(),
    },
    {
      path: "types.py",
      contents: renderPythonTypes(),
    },
    {
      path: "__init__.py",
      contents: `"""${listenerSdkManifest.packageNames.python} — generated listener SDK."""
from .client import RadioToolsStationClient
from .types import (
    NewsValues,
    PageValues,
    PresenterValues,
    PublishedCollection,
    PublishedNews,
    PublishedNewsCollection,
    PublishedPage,
    PublishedPageCollection,
    PublishedPresenter,
    PublishedPresenterCollection,
    PublishedRecord,
    PublishedShow,
    PublishedShowCollection,
    ShowPresenter,
    ShowValues,
)

__all__ = [
    "NewsValues",
    "PageValues",
    "PresenterValues",
    "PublishedCollection",
    "PublishedNews",
    "PublishedNewsCollection",
    "PublishedPage",
    "PublishedPageCollection",
    "PublishedPresenter",
    "PublishedPresenterCollection",
    "PublishedRecord",
    "PublishedShow",
    "PublishedShowCollection",
    "RadioToolsStationClient",
    "ShowPresenter",
    "ShowValues",
]
`,
    },
  ],
};
