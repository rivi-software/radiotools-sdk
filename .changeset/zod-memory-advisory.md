---
"@rivi-software/radiotools-contract": patch
"@rivi-software/radiotools-sdk": patch
"@rivi-software/radiotools-sdk-react": patch
"@rivi-software/radiotools-sdk-vue": patch
"@rivi-software/radiotools-sdk-svelte": patch
"@rivi-software/radiotools-sdk-next": patch
"@rivi-software/radiotools-sdk-generator": patch
---

Depend on `zod` 4.6.7.

**Fixed**

- `@rivi-software/radiotools-sdk` and `@rivi-software/radiotools-sdk-generator` pinned `zod` 4.6.5, which can exhaust memory while validating oversized constrained collections ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)). They now pin 4.6.7.
