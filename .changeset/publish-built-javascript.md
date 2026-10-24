---
"@rivi-software/radiotools-contract": patch
"@rivi-software/radiotools-sdk": patch
"@rivi-software/radiotools-sdk-react": patch
"@rivi-software/radiotools-sdk-vue": patch
"@rivi-software/radiotools-sdk-svelte": patch
"@rivi-software/radiotools-sdk-next": patch
"@rivi-software/radiotools-sdk-generator": patch
---

Publish every npm package as built JavaScript with type declarations.

**Fixed**

- The core SDK, the contract and the React, Vue, Svelte and Next.js bindings shipped their TypeScript source, which Node.js cannot load from `node_modules`. A server-side Node script could not import them, and a Next.js app needed `transpilePackages`. They now ship ES modules and `.d.ts` files in `dist/`, so Node.js imports them directly and Next.js needs no extra configuration.
- The generator's published build did not run: its relative imports had no file extension, and `dist/cli.js` started with two shebang lines. `radiotools-sdk-generate` and importing `@rivi-software/radiotools-sdk-generator` now work in Node.js.
