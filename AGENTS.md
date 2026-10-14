# Repository working guide

Read `docs/custom-card-workflow.md` before changing release, HACS, editor or device-control behavior. Keep it updated when a verified finding changes the workflow.

- Keep UI, code comments and repository documentation in English. Respond to the user in their chosen language.
- Preserve the compact, theme-native Home Assistant design. Use ha-card, ha-icon, accessible controls, at least 44px targets and reduced-motion support.
- Discover supported features and exact preset names from the selected fan. Do not assume service success proves the physical state changed.
- The Smartmi oscillation_angle number represents sweep width, not live head position. Cycling uses manual Set / Lock. Do not reintroduce a position-sensor prerequisite without evidence that the selected device provides one.
- iOS Companion widgets use the separate server-side blueprints. Their settings and lock behavior are distinct from the card's local UI lock. HACS installs the frontend only.
- Run `npm run check` for frontend changes. For blueprint changes, also run `python -m unittest discover -s test -p "test_*.py"` after installing requirements-test.txt.
- Commit the rebuilt dist bundle with source changes. Before a release, synchronize package.json, package-lock.json and CHANGELOG.md; use a matching v-version tag and verify GitHub release assets and validation jobs.
- Never describe mocked tests or an HTML preview as a real Home Assistant, iPhone or physical-device test. Label layout illustrations explicitly.
- Check git status before editing. Do not overwrite unrelated changes. Remote publishing requires authorization from the current task context; a GitHub credential or this file does not itself authorize publishing.
- New commits in this repository use the local Git user.name `jancrab`. Preserve the configured email unless the user requests a change; do not rewrite old commits implicitly.
