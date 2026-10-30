# Security policy

## Report a vulnerability

Don't report security vulnerabilities in public issues, discussions or pull requests. Report them privately instead:

- [report a vulnerability](https://github.com/rivi-software/radiotools-sdk/security/advisories/new) on GitHub, or
- email [oss-cybersecurity@rivi.software](mailto:oss-cybersecurity@rivi.software).

We read reports in English and Dutch. Include:

- the package and its version, for example `@rivi-software/radiotools-sdk@0.8.1`, or the language starter and the commit you copied it from
- what an attacker can do, and under which conditions
- the steps or code to reproduce it

Never include a working `rtm_…` key in a report. Create a test key for the reproduction and revoke it afterwards.

We investigate every report, keep you updated while we work on a fix, and publish a GitHub security advisory once the fix is released. Tell us if you want to be credited in the advisory.

## Supported versions

We fix vulnerabilities in the latest release only. Before 1.0, we don't backport fixes to older minor versions.

| Package | Supported |
| --- | --- |
| `@rivi-software/radiotools-*` npm packages | The latest release |
| Language starters (Python, Go, .NET, Ruby, PHP, Kotlin and Swift) | The latest commit on `main` |

The npm packages share one version number. The language starters aren't published to a registry, so after a security fix, copy or vendor the starter again.

## Scope

This policy covers the code in this repository: the SDKs, the framework bindings, the language starters, the generator, the contract and the OpenAPI document. That includes a dependency that makes an SDK vulnerable, as with the `zod` fix in 0.8.1.

For a vulnerability in the RadioTools service itself, such as the API, the realtime feed or the web app, email [oss-cybersecurity@rivi.software](mailto:oss-cybersecurity@rivi.software).

## Leaked keys

A station key or integration credential that has leaked, for example in a public repository or in browser code, isn't a vulnerability in the SDK. Revoke it in RadioTools under **Settings › Credentials** and create a new one. See [Authentication](https://docs.rivi.software/radiotools/api-reference/authentication).
