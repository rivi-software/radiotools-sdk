# radiotools-sdk-go

Generated Go client stubs for RadioTools listener contract v1.

## Install

```bash
go get github.com/rivi-software/radiotools-sdk/packages/sdk-go
```

```go
import "github.com/rivi-software/radiotools-sdk/packages/sdk-go/radiotools"

client, err := radiotools.StationClientFromEnv()
if err != nil {
	log.Fatal(err)
}
weather, err := client.GetWeather(ctx) // nil when the station does not publish weather
```

Releases are tagged `packages/sdk-go/vX.Y.Z`. Until the first such tag, `go get` resolves the newest commit on `main` as a pseudo-version.

Regenerate: `bun run --filter @rivi-software/radiotools-sdk-generator generate --target go`

For GraphQL, WebSocket, and ETag behavior use `@rivi-software/radiotools-sdk` (TypeScript).
