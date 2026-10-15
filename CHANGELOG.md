# Changelog

## 0.10.0

- Add a theme-native airflow scene, prominent reported speed and mode/sweep summary in both layouts.
- Keep all existing profiles, service sequences and YAML options; add optional scene, animation and summary switches to the visual editor.
- Use one continuous animation driven by reported speed; pause it offscreen, in hidden tabs and for reduced motion. Keep the power icon static.
- Distinguish missing speed from zero; retain reported state while service calls are pending.
- Add an interactive, explicitly simulated Light / Dark preview and lifecycle/state regression tests.

## 0.9.0

- Add script blueprints for the Home Assistant iOS Companion app widget: Power, Everyday, Set, Lock, Strength and Natural / Normal.
- Configure one shared server-side controller per fan. Lock stops first and interrupts unfinished controller sequences; sweep feedback is not required.
- Include blueprint import buttons, a complete scripts YAML example and English iPhone setup instructions.
- Add eight tests that render the shipped YAML/Jinja branches, checking defaults, profile overrides, maximum sweep, command ordering and failure paths.
- Widget profiles are configured separately from the dashboard card. iOS state is not real-time; Lock applies a profile without enforcing a global UI lock.
- Actual Home Assistant blueprint import and iPhone/device testing remain outstanding.

## 0.8.0

- Replace position feedback/scripts with manual Cycling Set / Lock. Set applies the configurable profile and starts maximum sweep; Lock stops first and reapplies the profile.
- Lock speed and mode controls in this card while its reported state matches the locked profile. Exit using Set, Everyday, oscillation or power off.
- Replace the bicycle icon with crosshairs and lock icons plus action labels.
- Simplify Cycling configuration to mode, speed and an optional sweep entity override.
- Translate card UI, editor, previews and repository documentation to English.
- Remove the obsolete script generator and positioning blueprint. Existing Home Assistant scripts are untouched; former positioning fields are ignored.
- Test service ordering, maximum sweep discovery, profile locking, missing entities and retryable stop failures. Real-device testing remains necessary.

## 0.7.0

- Add admin-only positioning script creation for devices with genuine live position feedback.
- Refresh rendering when Home Assistant reuses its hass object.
- Refresh the entity after changing preset mode, before setting profile speed.

## 0.6.2

- Load native Home Assistant form/selector components before opening the editor.
- Add a regression test for the first editor opening.

## 0.6.1

- Show the optional sweep slider only when the fan and oscillation are on.
- Visibility changes do not send angle commands.

## 0.6.0

- Add configurable Everyday (Natural/66%/30°) and Cycling (Natural/100%) profiles.
- Add a positioning blueprint requiring genuine live position feedback.

## 0.5.0

- Simplify the editor and auto-detect related sweep entities.
- Add an optional sweep slider and ignore stale preset mappings.

## 0.4.0

- Make the animated fan icon the power button.
- Add a time-trial bicycle icon, dark preview and HACS installation button.
- Publish the repository for HACS custom installation.

## 0.3.0

- Introduce compact icon controls, accessible targets and responsive wide layout.

## 0.2.0

- Add optional feedback-based target positioning and document integration differences.
- A live position sensor was required; availability for this device was never established.

## 0.1.0

- Initial compact/wide card, fan entity picker, Natural, speed, oscillation and configurable left action.
- Add HACS manifest, bundled distribution, tests and release workflow.
