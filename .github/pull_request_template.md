<!-- Write this so a reader who opens no files still knows why the PR is needed and what it does. One fact per bullet. A section you have nothing for gets one bullet: "- None." -->
<!-- Title: Conventional Commits, lowercase, no period, under 72 characters, e.g. `feat: read the values a refused request's issue names`. Types: feat, fix, docs, ci, refactor, chore. -->

## Problem

<!-- Who is affected and what is wrong for them today: an app built on an SDK, a framework binding, a language starter, or the release pipeline. A fix says what breaks, a feature names what a consumer can't do yet, a chore says who is blocked. Keep it true under any solution; the code path goes under Changes. -->

<!-- Does this fix an issue? Uncomment the line below so merging closes it. -->
<!-- Closes #ISSUE_ID -->

## Changes

<!-- Lead with what an SDK consumer now sees or does differently, per package or language, not only the code path behind it. -->
<!-- Show a contract change as a short `diff` block of the affected types, next to the methods that return them. -->
<!-- Mark regenerated or mechanical changes (`openapi.json`, `schema.graphql`, generated starters) as such, so a reviewer knows nothing user-visible hides in them. -->

## Monorepo catch-up

<!-- Only for a PR that ports listener-contract changes from rivi-monorepo; otherwise write "- None.". The next catch-up starts where this range ends, so always give both commits. -->

**Range:** rivi-monorepo `<from>`..`<to>`

<!-- What was compared: the exported schemas as JSON Schema, `schema.graphql`, `PUBLIC_SOCKET_PROTOCOL`, `LISTENER_CONTRACT_VERSION` and listener ADRs. List every change found that isn't ported, and why. -->

## How did you test this code?

<!-- Show before and after: the new or changed test failing against main, then passing, with the summary line from `bun test`. -->
<!-- Name the CI steps that pass locally: install, check:manifests, generate (and whether it left a diff), build, check, test, check:packages. Don't paste full suite output; long logs go in a <details> block. -->
<!-- Say what you could not check, such as a step that only runs on main or against production. Agents: do NOT claim manual testing you haven't done. -->

## Release

<!-- Keep exactly one line and delete the others. Plain bullets, not checkboxes: GitHub counts every checkbox in the body as an open task. -->
<!-- All npm packages share one version, so the changeset's bump applies to all of them. Its text becomes the npm changelog entry, so write it for consumers (Added / Changed / Fixed). -->
<!-- No changeset covers the language starters. They aren't published to a registry, so a change to them is released as soon as it lands on main. -->

- No changeset: nothing ships to npm
- Changeset (patch): a fix with no API change
- Changeset (minor): new or changed API (before 1.0, breaking changes are minor too)

## Merge Danger

**Door:** one-way or two-way

<!-- Two-way when reverting this PR undoes it. One-way when merging does something a revert can't take back, such as a publish to npm, a pushed tag or a changed repository setting. Say what merging starts. -->

**Blast Radius:** TypeScript consumers, framework bindings, a language starter, the release pipeline or CI

<!-- Say what breaks for them if this is wrong, and how they would notice. -->

## 🤖 Agent context

<!-- Fill this in when an agent wrote or co-wrote this PR. Delete it for a fully human-written PR. -->

**Autonomy:** Human-driven (agent-assisted) - or - Fully autonomous

**Agent:** tool, model

**Skills:** `/skill`, or None

<details>
<summary>More context for AI agents</summary>

<!-- Collapsed by default. On every push, rewrite it to describe the PR at that commit: replace stale bullets, never append a log. One line per bullet, under 25 words. Delete a field you have nothing for. Paraphrase the user's prompts, never paste them. -->

- **Decisions:** one bullet per decision, and the alternative it beat
- **Follow-ups:** work left for a later PR
- **Read closely:** files or lines that need a careful review

</details>

<!-- Rules for agents writing this body:
- This repository is public. Never put `rtm_…` keys, `RADIOTOOLS_API_TOKEN`, `RADIOTOOLS_INGEST_TOKEN`, station data or anything else from a session that isn't already public in the body, commits, fixtures or code.
- Never write a GitHub @mention you haven't verified this session with `gh api user` or `gh pr view --json author,assignees`.
- Agent-written PRs always get a human review: don't self-merge or auto-approve.
- Pass the body straight to `gh pr create --body-file -` on stdin, so markdown and newlines survive.
-->
