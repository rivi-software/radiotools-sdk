// Fails when a publishable package under packages/ declares a dependency with the workspace: protocol.
// `changeset publish` runs `npm publish`, which ships package.json unchanged, and npm cannot install
// a `workspace:` range (EUNSUPPORTEDPROTOCOL). Use a real version range; bun still links the local copy.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packagesDir = join(import.meta.dir, "..", "packages");
const fields = ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"];
const problems: string[] = [];

for (const dir of readdirSync(packagesDir).sort()) {
  const file = join(packagesDir, dir, "package.json");
  if (!existsSync(file)) continue;
  const manifest = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  if (manifest.private === true) continue;
  for (const field of fields) {
    const ranges = (manifest[field] ?? {}) as Record<string, string>;
    for (const [name, range] of Object.entries(ranges)) {
      if (range.startsWith("workspace:")) {
        problems.push(`packages/${dir}/package.json: ${field}["${name}"] is "${range}"`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error("npm cannot install these published dependency ranges:");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("Replace each workspace: range with the package's version range, for example ^0.4.0.");
  process.exit(1);
}
console.log("Publishable package.json files use installable dependency ranges.");
