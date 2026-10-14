# Verified custom-card lessons

## Packaging and release

Use a bundle filename matching the repository slug in dist, hacs.json, the resource URL and the release asset. HACS calls the repository type Dashboard in its UI and plugin in the backend. Keep runtime dependencies bundled, provide LICENSE/README/changelog, and document manual JavaScript-module installation as well as the HACS import badge.

Commit dist and package-lock.json. CI installs with npm ci, runs tests/build and verifies dist has no changes. Release tags must match package.json and publish the JS asset. Verify actual release and HACS job success, not just git push. Private development is separate from public HACS custom distribution.

## Editor and rendering

Native ha-form and selectors may be unregistered on a fresh dashboard. The starter's getConfigElement first loads HA's built-in entities editor to register them. Retest on a real dashboard when changing this bootstrap.

HA may reuse its hass object while replacing states. Do not miss updates by relying solely on object identity. The starter also supports the HA states context subscription; disconnect must release subscriptions. Keep context and legacy hass behavior compatible when modifying rendering.

Use minimal entity/layout choices initially. Hide optional appearance and mapping settings. Preserve unknown config fields on editor changes. Do not validate intermediate optional editor fields as though the user has completed the entire form.

## Device services

Discover capabilities from the entity and use exact strings from presets/options. Match related entities by device_id first, followed by conservative naming fallback. Avoid unrelated devices.

Validate required capabilities/values before a movement sequence. Serialize setup and stop commands, allow retry after failure, and show errors. Integration-specific polling may need a refresh after mode selection before applying a dependent speed command. This is a finding to investigate for the selected integration, not a universal update_entity rule.

Examples from the fan project: oscillation_angle was a sweep-width setting, not live head position; direction meant head rotation in one integration and airflow reversal in another. Only implement behavior the selected integration supports.

Browser timers are not server automation. iOS widgets are not Lovelace cards and do not guarantee live state updates. HACS frontend installation does not create backend scripts or iPhone widgets. Keep these concerns separate unless requested.

## UX and validation

Use HA theme variables, ha-card/ha-icon, 44px targets, clear accessible labels and keyboard focus. Respect reduced motion. Keep compact layouts responsive to their container.

Test service ordering, state updates, missing capabilities, editor startup and real user errors. Mocked state tests and HTML previews do not prove real HA or physical device behavior. Label simulated previews and report unverified behavior.

## Git identity and environment

GitHub login and Git commit identity are separate. Inspect effective author/committer configuration; use repository-local user.name when changing only one project. Preserve email unless asked and never rewrite history implicitly.

In the source Windows environment, sandbox network restrictions sometimes produced misleading gh auth errors and prevented a localhost browser from reaching a sandboxed preview server. Verify the actual failure and use the environment's approved permissions mechanism where appropriate. Do not prescribe unsandboxed execution universally and never store credentials in project or skill files.
