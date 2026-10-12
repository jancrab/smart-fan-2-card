# Cycling migration: no script required

Version 0.8.0 replaces automatic target positioning and the script creation button with manual **Set / Lock**.

- **Set** applies the Cycling profile, selects the sweep entity's maximum and starts oscillation.
- **Lock** stops oscillation immediately, then reapplies the Cycling profile and locks speed/mode controls in this card.
- Configure mode and speed in the visual editor under **Cycling · Set / Lock**.
- Exit through Set, Everyday, the oscillation toggle or power off. The UI lock clears on page reload.

Your supplied Smartmi entities contain a sweep width number, but no live head position. Manual stopping avoids requiring a sensor the integration does not expose. Timing depends on the network and device; an exact absolute angle cannot be promised.

Remove old `cycling_mode`, `position_entity`, `target_angle`, `target_tolerance`, `cycling_timeout`, `cycling_max_angle`, `left_entity` and `left_value` fields. They are ignored. Keep `angle_entity` if needed for sweep discovery.

The old script generator and blueprint are no longer included. Scripts already created in Home Assistant are not deleted or called by this version. You may remove an unused script yourself after checking that no other automation references it.

## Real-device check

1. Choose Normal and 66% in Cycling, press Set and check actual mode/speed plus maximum sweep.
2. Press Lock while the head is moving: confirm oscillation stops and mode/speed still match the profile.
3. Confirm speed and Natural controls are disabled only while locked, and Everyday restores Natural/66%/30°.
4. Repeat with Natural and 100%. Test errors by temporarily making the angle entity unavailable: Set should be unavailable, but an already armed Lock should still send the stop command.

A command returning successfully is not proof of physical positioning. Check the fan itself and its reported attributes.
