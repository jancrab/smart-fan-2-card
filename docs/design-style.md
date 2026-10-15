# Airflow design

The fan card adopts atmospheric minimalism inspired by [Origami Weather](https://github.com/hazymorning/origami_weather). The airflow SVG and CSS are original to this project; no reference code or assets were copied. Existing MIT and Material Design Icons notices remain unchanged.

## Direction

The primary action is power on the fan icon, followed by speed and the existing profiles. A prominent reported percentage sits above a quiet mode/sweep summary. Four thin curved lines suggest airflow without claiming to measure particles or head position. The power icon is static: airflow is the single continuous motion system.

Design assessment: impact 4, context fit 5, feasibility 5, performance 4, consistency risk 3; DFII 15. HA's font takes priority over decorative typography. Spacing uses 4/8/12/16/24 px; the main value is 48 px with a smaller unit. Buttons retain at least 44 px targets. Long names wrap and wide cards stack below 560 px container width.

## Appearance options

| Setting | Default | Meaning |
| --- | --- | --- |
| `show_scene` | `true` | Show the background tint and airflow lines |
| `animate_scene` | `true` | Animate only with confirmed on state and known positive speed |
| `show_summary` | `true` | Show reported mode and sweep/fixed status |
| `show_angle_slider` | `false` | Existing optional sweep slider while oscillating |

All switches are in the visual editor's Appearance section. Existing YAML, compact/wide layouts, presets and Set/Lock controls remain compatible.

Scene tint overrides: `--smart-fan-scene-light`, `--smart-fan-scene-dark`.
Line overrides: `--smart-fan-flow-light`, `--smart-fan-flow-dark`.
Defaults blend the HA accent with its card surface. The active HA dark-mode flag chooses the palette; text, font, borders, radius and shadow come from HA theme variables. Custom scene colors should retain sufficient contrast with the theme's text.

## State and motion

- Reported speed controls a 6–14 second transform/opacity cycle. No canvas, animated blur, remote fonts or runtime CDN imports.
- Off, unavailable, unknown and missing-speed states have no active airflow. Missing speed displays an em dash.
- Pending calls display “Sending command …”; success alone never changes displayed device state.
- IntersectionObserver pauses offscreen cards; document visibility pauses hidden tabs. Disconnect releases both observers and listeners, reconnect installs fresh ones.
- Reduced motion disables animation and transitions entirely. The animation switch also provides a static scene.
- The scene is decorative, `aria-hidden` and noninteractive. The reported status, text labels and accessible button names carry the information.

## Local review

Run `npm run check`, then `npm run dev`, and open `/demo/airflow.html`. This loads the actual bundled card with simulated HA data, with Light/Dark cards and selectable 280/360/480 px widths, long names, missing speed/entity, unavailable and service-error states. A separate 720 px card demonstrates the wide layout. Buttons send simulated commands only.

Automated tests cover scene lifecycle/visibility, missing speed, unchanged reported state after service completion and the existing service/editor/profile behaviors. Browser checks cover layout bounds and target sizes, long labels, Set/Lock, error feedback and static-scene controls. Actual HA theme/editor integration, OS-level reduced-motion behavior on iOS and physical fan operation still require device testing.
