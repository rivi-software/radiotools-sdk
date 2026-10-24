# RadioTools Swift SDK

Generated iOS/macOS REST stubs using `URLSession` and async/await.

## Install

The package manifest is `Package.swift` at the repository root. Add the repository with Swift Package Manager:

```swift
dependencies: [
    .package(url: "https://github.com/rivi-software/radiotools-sdk.git", branch: "main"),
],
targets: [
    .target(name: "MyApp", dependencies: [
        .product(name: "RadioToolsSDK", package: "radiotools-sdk"),
    ]),
]
```

In Xcode, choose File > Add Package Dependencies and enter `https://github.com/rivi-software/radiotools-sdk.git`.

Releases are tagged `vX.Y.Z`; once a tag exists, depend on `from: "X.Y.Z"` instead of `branch: "main"`.

```swift
import RadioToolsSDK

let client = try StationClient(baseURL: URL(string: "https://…")!, stationSlug: "my-station", apiToken: token)
let weather = try await client.getWeather() // nil when the station does not publish weather
```

Regenerate: `bun run --filter @rivi-software/radiotools-sdk-generator generate --target swift`

Use `packages/openapi/openapi.json` (from Zod) to generate typed models with Swift OpenAPI Generator if needed.
