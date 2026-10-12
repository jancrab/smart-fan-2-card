# Reference: lovelace-fan-xiaomi

Source reviewed on October 12, 2026: [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi), README and `src/xiaomi-fan-card.ts`.

| Feature | Reference implementation | Meaning here |
| --- | --- | --- |
| Power, speed, oscillation | Standard fan services | Supported |
| Natural | Preset or integration-specific service | Exact presets are read from the fan |
| Sweep width | `number.set_value`, `_oscillation_angle` entity | Writable sweep width, not live position |
| Left/right | `fan.set_direction`, reverse/forward for the default backend | Integration-dependent head movement |
| Child lock, timer, LEDs | Additional switch/number/select entities | Possible future additions |
| Temperature, humidity, power supply | Additional sensors | Model-dependent |

The reference discovers related entities through the entity registry and shared device ID. Its animation follows `oscillating`, rather than a measured head position. The hardcoded supported angles 30/60/90/120° select sweep widths.

In [python-miio](https://github.com/rytilahti/python-miio/blob/master/miio/integrations/zhimi/fan/fan.py), `set_angle()` sets oscillation width, while `set_rotate()` moves in left/right steps. The angle getter alone does not establish live positional feedback.

[Home Assistant Xiaomi Miio](https://github.com/home-assistant/core/blob/dev/homeassistant/components/xiaomi_miio/fan.py) uses `set_rotate()` for direction commands, stopping oscillation first. [Xiaomi Home](https://github.com/XiaoMi/ha_xiaomi_home/blob/main/custom_components/xiaomi_home/fan.py) maps direction to `wind-reverse`. A generic direction command cannot safely be assumed to move the head across integrations.

No supplied entity establishes live head position for this Smartmi. Version 0.8.0 therefore uses manual Set / Lock: maximum sweep first, stop at the position chosen by the user. No automatic absolute positioning is claimed.
