#!/usr/bin/env bash
# Pack every publishable @rivi-software/* package, install the tarballs into an empty project and
# import each one from plain Node.js, as a customer's server-side script would. Plain Node cannot
# load TypeScript from node_modules, so this fails if a tarball is missing its built dist/ or an
# import inside it does not resolve. Run after `bun run build`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PACKAGES=(
  "@rivi-software/radiotools-contract"
  "@rivi-software/radiotools-sdk"
  "@rivi-software/radiotools-sdk-react"
  "@rivi-software/radiotools-sdk-vue"
  "@rivi-software/radiotools-sdk-svelte"
  "@rivi-software/radiotools-sdk-next"
  "@rivi-software/radiotools-sdk-generator"
)

# Install the framework peers at the versions the bindings are typechecked against.
dev_version() {
  node -p "require('$ROOT/packages/$1/package.json').devDependencies['$2']"
}
react="$(dev_version sdk-react react)"
PEERS=(
  "react@$react"
  "react-dom@$react"
  "vue@$(dev_version sdk-vue vue)"
  "svelte@$(dev_version sdk-svelte svelte)"
  "next@$(dev_version sdk-next next)"
)

mkdir -p "$WORK/tarballs" "$WORK/project"
cd "$ROOT"
for name in "${PACKAGES[@]}"; do
  npm pack -w "$name" --pack-destination "$WORK/tarballs" --silent >/dev/null
done

cd "$WORK/project"
echo '{ "name": "packed-import-check", "private": true, "type": "module" }' > package.json
# --omit=optional skips Next's native SWC binaries and sharp; importing next/* does not need them.
npm install --no-audit --no-fund --omit=optional --loglevel=error "$WORK"/tarballs/*.tgz "${PEERS[@]}"

# The bindings depend on the core SDK by version range; it must resolve to the tarball, not the registry.
nested="$(find node_modules -mindepth 3 -path '*/node_modules/@rivi-software/*' -name package.json -maxdepth 5)"
if [[ -n "$nested" ]]; then
  echo "A package installed its own copy of a @rivi-software dependency instead of the packed one:" >&2
  echo "$nested" >&2
  exit 1
fi

cat > import.mjs <<'EOF'
for (const name of process.argv.slice(2)) {
  const exports = Object.keys(await import(name));
  if (exports.length === 0) throw new Error(`${name} has no exports`);
  console.log(`ok  ${name} (${exports.length} exports)`);
}
EOF

for name in "${PACKAGES[@]}"; do
  if [[ "$name" == "@rivi-software/radiotools-sdk-next" ]]; then
    # It imports server-only, which throws outside React Server Components, where Next resolves it
    # with the react-server condition.
    node --conditions=react-server import.mjs "$name"
  else
    node import.mjs "$name"
  fi
done

node --input-type=module -e '
import { readGraphqlSchema } from "@rivi-software/radiotools-contract";
if (!readGraphqlSchema().includes("type Query")) throw new Error("contract GraphQL schema is missing");
console.log("ok  @rivi-software/radiotools-contract readGraphqlSchema()");
'
./node_modules/.bin/radiotools-sdk-generate list >/dev/null
echo "ok  radiotools-sdk-generate list"
