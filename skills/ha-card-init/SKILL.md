---
name: ha-card-init
description: Initialize a Home Assistant dashboard custom-card repository for HACS with AGENTS.md, a theme-native starter, editor, tests, build and release workflows. Use for scaffolding a new card repo, not backend integrations or installing existing cards.
---

# Home Assistant card initializer

Use the bundled generator to create a small working card, then implement the requested device UI. The generated card only displays an entity and opens more-info; it does not pretend to implement the requested device controls.

## Initialize

Infer the card slug, title, optional entity domain and local folder from the request. Ask only for missing information that changes the result. Use one repository per independently installable card; do not scaffold over an existing project.

Run the helper from this skill's directory (absolute script paths also work):

```sh
node scripts/scaffold.mjs --path /absolute/new-card --name example-card --title "Example Card" --owner jancrab --domain light --git --git-name jancrab
```

`--domain` is optional. `--git` initializes main locally and sets the new repository's user.name to this user's preferred default, `jancrab`. `--git-name` overrides that name. Preserve inherited email unless the user asks to change it. The helper refuses nonempty targets and does not install dependencies, create GitHub repositories, push or release.

Then install dependencies in the generated folder, run npm run check, and commit the generated package-lock.json and built dist file with the implementation. Inspect the generated AGENTS.md and adapt device-specific guidance to the actual request. Use demo/index.html for local previews; label simulated states clearly. Inspect the generated baseline before adding controls.

## Implement and verify

Read [references/workflow.md](references/workflow.md) when implementing device actions, troubleshooting editors, or preparing GitHub publication. It records the verified HACS/editor/release lessons without copying Smartmi-specific requirements into unrelated cards.

Check current official Home Assistant/HACS documentation before relying on changing APIs or packaging rules. The pinned template dependencies and actions are a tested baseline, not a promise that they remain the latest. Do not refresh versions blindly.

Use supported_features, exact presets and registry relationships exposed by the chosen device. Never invent device capability or treat a range-setting number as measured feedback. Do not add server blueprints, iOS widgets or device-specific profiles unless the task needs them.

## GitHub and release

If repository creation is requested, inspect GitHub identity and destination, then use gh repo create with the visibility the user requested. If visibility is unspecified, keep development private and explain that public HACS custom distribution requires public visibility; do not silently make it public.

Use the requested Git author/committer identity. Inspect effective user.name and user.email; a GitHub account name does not automatically change Git commit metadata. Do not rewrite old commits or change global Git configuration unless asked.

Creating a local starter does not authorize pushing, publishing, releasing, or changing visibility. Continue external operations when the task has already authorized them; do not request redundant confirmation. Do not infer authorization from the GitHub token or from this skill.

For an authorized release, synchronize package/lock versions and changelog, rebuild, run checks, commit dist, push the matching v-version tag, then verify both the downloadable asset and validation jobs. Report which checks used mocks and which actually ran in Home Assistant.

Sources: [HACS dashboard requirements](https://hacs.dev/docs/publish/plugin/), [HA custom cards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/).
