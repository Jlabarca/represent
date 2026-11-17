"""Render the shared LibreChat configuration with the Notcards assistant preset."""
import argparse
from pathlib import Path

import yaml


def with_notcards(config):
    specs = config["modelSpecs"]["list"]
    local = next(spec for spec in specs if spec["name"] == "botanic-local")
    if local["preset"]["endpoint"] != "Botanic local" or local["preset"]["model"] != "botanic-free":
        raise ValueError("The configured local model does not match the seeded Notcards assistant")
    preset = {
        "name": "notcards", "label": "Notcards", "default": False,
        "showInMenu": True, "showOnLanding": False,
        "preset": {"endpoint": "agents", "agent_id": "agent_notcards", "model": local["preset"]["model"]},
    }
    existing = [spec for spec in specs if spec["name"] == "notcards"]
    if existing and existing != [preset]:
        raise ValueError("Conflicting Notcards preset in the base configuration")
    if not existing:
        specs.append(preset)
    return config


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.base.resolve() == args.output.resolve():
        parser.error("Choose a separate output file to preserve the base configuration")
    result = with_notcards(yaml.safe_load(args.base.read_text(encoding="utf-8")))
    args.output.write_text(yaml.safe_dump(result, allow_unicode=True, sort_keys=False), encoding="utf-8")
