# Reusable Home Assistant custom-card workflow

This file records verified experience from Smart Fan 2 Card. Reuse it for future cards, rather than relying on a previous chat's history. Project instructions live in the root AGENTS.md.

## Repository and chat organization

Use one GitHub repository per independently installed HACS card, with its own package version, bundle and releases. Use a corresponding local project folder. Start a new chat for a distinct card or substantial feature; a chat does not require a new repository. Small changes to the same card belong in the same repository.

For a new card, use the reusable [ha-card-init skill](../skills/ha-card-init/SKILL.md). Its generator embeds a general AGENTS.md, working guide, functioning theme-native card, native editor, tests, demo and HACS build/release workflows. It refuses nonempty destinations and can initialize a fresh local Git repository with the requested commit name. It does not carry over fan-specific controls, old Git history or remote-publishing authorization. A versioned copy of the skill lives in this repository; install that folder under your Codex skills directory for use in other projects.

Codex discovers repository AGENTS.md instructions when working in that repository. A file in this fan repository is not automatically inherited by unrelated project folders. Include a copy or explicit reference in each new project. See [official AGENTS.md guidance](https://developers.openai.com/codex/guides/agents-md).

## HACS packaging

- Keep a single bundled ES module in dist, with no runtime CDN dependencies. Register the custom element and window.customCards metadata.
- Provide hacs.json, README installation/configuration instructions, LICENSE, changelog and the visual editor.
- A public HACS custom repository can be added with the My Home Assistant HACS badge. A private development repository is not the same as a publicly installable custom repository.
- HACS installs the dashboard JavaScript. Backend scripts/blueprints need separate import and setup. iPhone widgets need setup in the Companion app.
- Keep manual installation documented: /config/www file, /local resource, JavaScript module type, and a changed cache version on update. Avoid duplicate resources.

## UI and entity discovery

- Start the editor with entity and layout. Put optional presentation/profile fields in collapsible sections.
- Load native HA form/selector components before returning the custom editor. Their lazy registration caused an unusable editor on fresh dashboards.
- HA may assign an updated but reused hass object. The card must still render changed attributes.
- Prefer entity registry device_id matching for related entities, then a conservative exact-name fallback. Do not guess unrelated entities.
- Use exact preset strings from preset_modes. Nature/normal capitalization differs between integrations; stale explicit mappings must not block valid discovery.
- Apply device theme variables, visible keyboard focus, labels/tooltips and reduced motion. Keep disabled state and pending commands understandable.

## Device actions and lessons

- Validate profile capabilities and parameter ranges before starting movement. Serialize setup commands and report service errors.
- Polling integrations can still use/report the previous mode immediately after set_preset_mode. This card refreshes with homeassistant.update_entity before setting profile speed. Real-device behavior still needs verification.
- Sweep width is not measured head position. The reference Xiaomi card's hardcoded 30/60/90/120 values are sweep presets.
- fan.set_direction is integration-dependent: some Xiaomi integrations move the head while others reverse airflow. Do not assume generic left/right behavior.
- Current Cycling: Set applies its configurable profile, sets the angle entity maximum and starts oscillation. Lock stops first, then reapplies the profile. No absolute-angle guarantee.
- Card lock is local UI state and clears on reload. Widget Lock applies a profile but does not enforce a global lock. iOS cached state is unsuitable for deciding whether the next tap should Set or Lock, so the widget has separate buttons.
- Widget buttons share a restart-mode server controller to interrupt unfinished sequences. Already dispatched device commands and network latency remain relevant.

## Tests and previews

Run npm run check for card changes. For widget blueprints, install requirements-test.txt and run the Python unittest suite. Meaningful tests cover service order, exact values, discovery, stale state, capability failures and retryable stop errors.

The light/dark demos load the actual bundled card with simulated hass data. The iOS widget HTML is only a layout illustration; the native Companion app determines actual rendering. Label screenshots accordingly. Do not claim actual-device verification from mocks.

## GitHub and releases

1. Check git status and remote identity. Preserve unrelated changes and scan outgoing files for secrets.
2. Verify local checks and rebuild dist. Keep version and lockfile synchronized; describe final behavior and limitations in the changelog.
3. Commit focused changes. Push only with authorization from the task; check the GitHub identity and target repository.
4. For an authorized release, create the matching version tag and push it. The release workflow verifies the version, tests/builds, checks the committed distribution and publishes the JavaScript asset.
5. Verify the release asset and validation jobs, including HACS and blueprint tests. A successful push alone is not a successful release.
6. Tell the user which version to update to and whether browser reload or separate blueprint import is needed.

In this Windows workspace, sandboxed GitHub calls previously reported misleading auth/network failures. Check actual gh authentication and network access; use the environment's approved escalation mechanism when necessary. Do not assume credentials expired based solely on a sandbox failure. Never store tokens or session details in this workflow.

This repository's established scope includes authorized public publication and releases. That authorization must not be inferred for a future unrelated repository.
