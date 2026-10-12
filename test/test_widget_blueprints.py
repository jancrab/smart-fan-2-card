"""Exercise the shipped YAML and Jinja branches with a small HA state/service mock.

This verifies command intent, not HA schema compatibility or actual device movement.
"""
import ast
import math
from pathlib import Path
import unittest

import yaml
from jinja2.nativetypes import NativeEnvironment


class Input(str):
    pass


class Loader(yaml.SafeLoader):
    pass


Loader.add_constructor("!input", lambda loader, node: Input(loader.construct_scalar(node)))
ROOT = Path(__file__).resolve().parents[1]


class ScriptError(Exception):
    pass


class Controller:
    def __init__(self, **inputs):
        self.doc = yaml.load((ROOT / "blueprints/script/fan_widget_controller.yaml").read_text(encoding="utf-8"), Loader=Loader)
        self.inputs = {key: value.get("default") for key, value in self.doc["blueprint"]["input"].items()}
        self.inputs.update(fan_entity="fan.test", angle_entity="number.sweep")
        self.inputs.update(inputs)
        self.states = {"fan.test": "on", "number.sweep": "53"}
        self.attrs = {"fan.test": {"preset_modes": ["nature", "normal"], "preset_mode": "normal", "percentage": 33}, "number.sweep": {"min": 1, "max": 120, "step": 1}}
        self.calls = []
        self.fail = None
        self.env = NativeEnvironment()
        self.env.globals.update(states=lambda entity: self.states.get(entity, "unknown"), state_attr=lambda entity, attr: self.attrs.get(entity, {}).get(attr), is_state=lambda entity, state: self.states.get(entity) == state, is_number=self.is_number)

    @staticmethod
    def is_number(value):
        try:
            return value is not None and math.isfinite(float(value))
        except (ValueError, TypeError):
            return False

    def render(self, value):
        if isinstance(value, Input):
            return self.inputs[value]
        if isinstance(value, str) and ("{{" in value or "{%" in value):
            result = self.env.from_string(value).render(self.variables)
            if isinstance(result, str):
                result = result.strip()
                try:
                    return ast.literal_eval(result)
                except (ValueError, SyntaxError):
                    pass
            return result
        if isinstance(value, dict):
            return {key: self.render(item) for key, item in value.items()}
        return value

    def run(self, operation):
        self.variables = {"operation": operation}
        self.variables.update(self.render(self.doc["variables"]))
        self.sequence(self.doc["sequence"])
        return self.calls

    def sequence(self, steps):
        for step in steps:
            if "if" in step:
                self.sequence(step.get("then", []) if self.render(step["if"]) else step.get("else", []))
            elif "choose" in step:
                branch = next((item for item in step["choose"] if self.render(item["conditions"])), None)
                self.sequence(branch["sequence"] if branch else step.get("default", []))
            elif "variables" in step:
                self.variables.update(self.render(step["variables"]))
            elif "stop" in step:
                raise ScriptError(step["stop"])
            elif "action" in step:
                action, target, data = step["action"], self.render(step["target"])["entity_id"], self.render(step.get("data", {}))
                self.calls.append((action, target, data))
                if self.fail == action:
                    raise ScriptError("Service failed")
                if action == "fan.set_preset_mode":
                    self.attrs[target]["preset_mode"] = data["preset_mode"]
                elif action == "fan.set_percentage":
                    self.attrs[target]["percentage"] = data["percentage"]
                elif action == "number.set_value":
                    self.states[target] = str(data["value"])
            else:
                raise AssertionError(f"Unsupported test step: {step}")


class WidgetTests(unittest.TestCase):
    def test_everyday_defaults_and_order(self):
        controller = Controller()
        calls = controller.run("everyday")
        self.assertEqual([item[0] for item in calls], ["fan.oscillate", "fan.set_preset_mode", "homeassistant.update_entity", "fan.set_percentage", "number.set_value", "fan.oscillate"])
        self.assertEqual(calls[1][2], {"preset_mode": "nature"})
        self.assertEqual(calls[3][2], {"percentage": 66})
        self.assertEqual(calls[4][2], {"value": 30})
        self.assertEqual(calls[-1][2], {"oscillating": True})

    def test_set_uses_entity_max_and_configurable_profile(self):
        controller = Controller(cycling_preset="normal", cycling_percentage=72)
        controller.states["fan.test"] = "off"
        controller.attrs["number.sweep"]["max"] = 90
        calls = controller.run("cycling_set")
        self.assertEqual(calls[0][0], "fan.turn_on")
        self.assertEqual(calls[2][2], {"preset_mode": "normal"})
        self.assertEqual(calls[-3][2], {"percentage": 72})
        self.assertEqual(calls[-2][2], {"value": 90})
        self.assertEqual(calls[-1][2], {"oscillating": True})

    def test_lock_stops_first_without_needing_sweep(self):
        controller = Controller()
        controller.states["number.sweep"] = "unavailable"
        calls = controller.run("cycling_lock")
        self.assertEqual(calls[0], ("fan.oscillate", "fan.test", {"oscillating": False}))
        self.assertEqual(calls[-1][2], {"percentage": 100})
        self.assertFalse(any(item[0] == "number.set_value" or item[2].get("oscillating") is True for item in calls))

    def test_invalid_profiles_angles_and_unavailable_fan(self):
        for inputs in [{"everyday_angle": 121}, {"everyday_percentage": 0}, {"natural_preset": "missing"}, {"everyday_angle": 30.5}]:
            controller = Controller(**inputs)
            with self.assertRaises(ScriptError):
                controller.run("everyday")
            self.assertEqual(controller.calls, [])
        controller = Controller()
        controller.states["fan.test"] = "unavailable"
        with self.assertRaises(ScriptError):
            controller.run("power")
        self.assertEqual(controller.calls, [])

    def test_lock_still_stops_when_profile_is_invalid(self):
        controller = Controller(natural_preset="missing")
        with self.assertRaises(ScriptError):
            controller.run("cycling_lock")
        self.assertEqual(controller.calls, [("fan.oscillate", "fan.test", {"oscillating": False})])

    def test_failed_angle_write_does_not_start_oscillation(self):
        controller = Controller()
        controller.fail = "number.set_value"
        with self.assertRaises(ScriptError):
            controller.run("cycling_set")
        self.assertFalse(any(item[2].get("oscillating") is True for item in controller.calls))

    def test_power_strength_and_exact_natural_toggle(self):
        self.assertEqual(Controller().run("power"), [("fan.toggle", "fan.test", {})])
        controller = Controller()
        for expected in [66, 100, 33]:
            self.assertEqual(controller.run("strength")[-1][2], {"percentage": expected})
        for expected in ["nature", "normal"]:
            self.assertEqual(controller.run("natural")[-2][2], {"preset_mode": expected})

    def test_buttons_route_to_the_same_restart_controller(self):
        doc = yaml.load((ROOT / "blueprints/script/fan_widget_button.yaml").read_text(encoding="utf-8"), Loader=Loader)
        self.assertEqual(Controller().doc["mode"], "restart")
        self.assertEqual(doc["sequence"], [{"action": "script.turn_on", "target": {"entity_id": Input("controller")}, "data": {"variables": {"operation": Input("operation")}}}])


if __name__ == "__main__":
    unittest.main()
