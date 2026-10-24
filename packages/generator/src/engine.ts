import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { csharpTarget } from "./targets/csharp.js";
import { goTarget } from "./targets/go.js";
import { kotlinTarget } from "./targets/kotlin.js";
import { nextTarget } from "./targets/next.js";
import { openapiTarget } from "./targets/openapi.js";
import { phpTarget } from "./targets/php.js";
import { pythonTarget } from "./targets/python.js";
import { reactTarget } from "./targets/react.js";
import { rubyTarget } from "./targets/ruby.js";
import { svelteTarget } from "./targets/svelte.js";
import { swiftTarget } from "./targets/swift.js";
import { vueTarget } from "./targets/vue.js";
import type { GenerateOptions, GeneratedFile, GeneratorTarget, SdkTarget } from "./types.js";

const targets: SdkTarget[] = [
  pythonTarget,
  reactTarget,
  vueTarget,
  svelteTarget,
  goTarget,
  csharpTarget,
  rubyTarget,
  phpTarget,
  openapiTarget,
  kotlinTarget,
  swiftTarget,
  nextTarget,
];

export function listTargets(): SdkTarget[] {
  return targets;
}

function resolveTargets(target: GeneratorTarget): SdkTarget[] {
  if (target === "all") return targets;
  const match = targets.find((entry) => entry.id === target);
  if (!match) {
    throw new Error(`Unknown target "${target}". Available: ${targets.map((t) => t.id).join(", ")}, all`);
  }
  return [match];
}

function writeGeneratedFile(baseDir: string, file: GeneratedFile, dryRun: boolean): void {
  const fullPath = isAbsolute(file.path) ? file.path : join(baseDir, file.path);
  if (dryRun) {
    console.log(`[dry-run] would write ${fullPath} (${file.contents.length} bytes)`);
    return;
  }
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, file.contents, "utf8");
  console.log(`wrote ${fullPath}`);
}

export function generateSdks(options: GenerateOptions): void {
  const selected = resolveTargets(options.target);
  for (const target of selected) {
    const outDir = target.outputDir(options.repoRoot);
    const files = target.generate(options.repoRoot);
    for (const file of files) {
      writeGeneratedFile(outDir, file, options.dryRun ?? false);
    }
  }
}
