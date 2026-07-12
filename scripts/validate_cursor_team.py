#!/usr/bin/env python3
"""Validate the versioned Cursor Team configuration and ANVIL event contract."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "cursor-team" / "manifest.json"
VERSION_PATH = ROOT / "VERSION"

EXPECTED_CHECKS = [
    "anvil/quality",
    "anvil/security",
    "anvil/approval",
    "anvil/governance",
    "anvil/deployment",
]
EXPECTED_COMMANDS = [
    "anvil-sync-rules.md",
    "anvil-audit-governance.md",
    "anvil-resume-autonomy.md",
    "anvil-report-ci.md",
]
EXPECTED_ENDPOINT = "https://portal.boz.dev/mcp"
EXPECTED_ROUTE = {
    "portal_tool": "anvil_dispatch",
    "target": "anvil-event-ingest-mcp",
    "command": "events_ingest",
}
FORBIDDEN_EXTERNAL_PATTERNS = [
    re.compile(r"\bhub\.boz\.dev\b", re.IGNORECASE),
    re.compile(r"https://[a-z0-9-]+\.anvil\.boz\.dev(?:/|$)", re.IGNORECASE),
]


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def load_json(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(errors, f"{path.relative_to(ROOT)}: missing")
        return {}
    except json.JSONDecodeError as exc:
        fail(errors, f"{path.relative_to(ROOT)}: invalid JSON ({exc})")
        return {}
    if not isinstance(value, dict):
        fail(errors, f"{path.relative_to(ROOT)}: root must be an object")
        return {}
    return value


def require_file(path: Path, errors: list[str]) -> None:
    if not path.is_file():
        fail(errors, f"{path.relative_to(ROOT)}: referenced file does not exist")


def require_tokens(path: Path, tokens: list[str], errors: list[str]) -> None:
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            fail(errors, f"{path.relative_to(ROOT)}: missing required text {token!r}")


def scan_external_boundaries(path: Path, errors: list[str]) -> None:
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    for pattern in FORBIDDEN_EXTERNAL_PATTERNS:
        match = pattern.search(text)
        if match:
            fail(
                errors,
                f"{path.relative_to(ROOT)}: forbidden direct ANVIL endpoint {match.group(0)!r}; "
                f"use {EXPECTED_ENDPOINT}",
            )


def main() -> int:
    errors: list[str] = []
    manifest = load_json(MANIFEST_PATH, errors)

    try:
        repo_version = VERSION_PATH.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        repo_version = ""
        fail(errors, "VERSION: missing")

    if manifest.get("schema_version") != 1:
        fail(errors, "cursor-team/manifest.json: schema_version must be 1")
    if manifest.get("policy_repo") != "Bruteforce-Group/cursor-rules":
        fail(errors, "cursor-team/manifest.json: policy_repo must be Bruteforce-Group/cursor-rules")
    if manifest.get("policy_ref") != "main":
        fail(errors, "cursor-team/manifest.json: policy_ref must be main")
    if manifest.get("policy_version") != repo_version:
        fail(
            errors,
            "cursor-team/manifest.json: policy_version must match VERSION "
            f"({manifest.get('policy_version')!r} != {repo_version!r})",
        )
    if manifest.get("external_anvil_endpoint") != EXPECTED_ENDPOINT:
        fail(
            errors,
            f"cursor-team/manifest.json: external_anvil_endpoint must be {EXPECTED_ENDPOINT}",
        )

    event_ingest = manifest.get("event_ingest")
    if not isinstance(event_ingest, dict):
        fail(errors, "cursor-team/manifest.json: event_ingest must be an object")
    else:
        for key, expected in EXPECTED_ROUTE.items():
            if event_ingest.get(key) != expected:
                fail(
                    errors,
                    f"cursor-team/manifest.json: event_ingest.{key} must be {expected!r}",
                )

    checks = manifest.get("consolidated_checks")
    if checks != EXPECTED_CHECKS:
        fail(
            errors,
            "cursor-team/manifest.json: consolidated_checks must exactly match "
            + ", ".join(EXPECTED_CHECKS),
        )

    team_content = manifest.get("team_content")
    if not isinstance(team_content, dict):
        fail(errors, "cursor-team/manifest.json: team_content must be an object")
        team_content = {}

    rules_file = team_content.get("rules_file")
    if not isinstance(rules_file, str) or not rules_file:
        fail(errors, "cursor-team/manifest.json: team_content.rules_file is required")
    else:
        require_file(ROOT / rules_file, errors)

    commands_directory = team_content.get("commands_directory")
    commands_dir = ROOT / str(commands_directory or "")
    if not isinstance(commands_directory, str) or not commands_directory:
        fail(errors, "cursor-team/manifest.json: team_content.commands_directory is required")
    elif not commands_dir.is_dir():
        fail(errors, f"{commands_directory}: commands directory does not exist")
    else:
        command_names = sorted(path.name for path in commands_dir.glob("*.md"))
        missing_commands = sorted(set(EXPECTED_COMMANDS) - set(command_names))
        if missing_commands:
            fail(
                errors,
                f"{commands_directory}: missing required commands {', '.join(missing_commands)}",
            )

    bugbot = manifest.get("bugbot")
    if not isinstance(bugbot, dict) or not isinstance(bugbot.get("team_rules_file"), str):
        fail(errors, "cursor-team/manifest.json: bugbot.team_rules_file is required")
    else:
        require_file(ROOT / bugbot["team_rules_file"], errors)

    for section in ("security_agents", "approval_agents"):
        agents = manifest.get(section)
        if not isinstance(agents, list) or not agents:
            fail(errors, f"cursor-team/manifest.json: {section} must be a non-empty array")
            continue
        seen_names: set[str] = set()
        for index, agent in enumerate(agents):
            if not isinstance(agent, dict):
                fail(errors, f"cursor-team/manifest.json: {section}[{index}] must be an object")
                continue
            name = agent.get("name")
            config = agent.get("configuration_file")
            triggers = agent.get("triggers")
            if not isinstance(name, str) or not name:
                fail(errors, f"cursor-team/manifest.json: {section}[{index}].name is required")
            elif name in seen_names:
                fail(errors, f"cursor-team/manifest.json: duplicate agent name {name!r}")
            else:
                seen_names.add(name)
            if not isinstance(config, str) or not config:
                fail(
                    errors,
                    f"cursor-team/manifest.json: {section}[{index}].configuration_file is required",
                )
            else:
                require_file(ROOT / config, errors)
            if not isinstance(triggers, list) or not triggers or not all(
                isinstance(trigger, str) and trigger for trigger in triggers
            ):
                fail(
                    errors,
                    f"cursor-team/manifest.json: {section}[{index}].triggers must be non-empty strings",
                )

    route_tokens = [
        EXPECTED_ENDPOINT,
        EXPECTED_ROUTE["portal_tool"],
        EXPECTED_ROUTE["target"],
        EXPECTED_ROUTE["command"],
    ]
    content_files = [
        ROOT / "cursor-team" / "team-content-rules.md",
        ROOT / "cursor-team" / "bugbot-team-rules.md",
        ROOT / "cursor-team" / "security-reviewer.md",
        ROOT / "cursor-team" / "vulnerability-scanner.md",
        ROOT / "cursor-team" / "approval-agent.md",
    ]
    for path in content_files:
        require_file(path, errors)
        require_tokens(path, route_tokens, errors)
        scan_external_boundaries(path, errors)

    check_requirements = {
        ROOT / "cursor-team" / "bugbot-team-rules.md": ["anvil/quality"],
        ROOT / "cursor-team" / "security-reviewer.md": ["anvil/security"],
        ROOT / "cursor-team" / "vulnerability-scanner.md": ["anvil/security"],
        ROOT / "cursor-team" / "approval-agent.md": ["anvil/approval"],
        ROOT / "cursor-team" / "team-content-rules.md": EXPECTED_CHECKS,
    }
    for path, tokens in check_requirements.items():
        require_tokens(path, tokens, errors)

    if commands_dir.is_dir():
        for path in sorted(commands_dir.glob("*.md")):
            require_tokens(path, route_tokens, errors)
            scan_external_boundaries(path, errors)

    runbook = manifest.get("runbook")
    if not isinstance(runbook, str) or not runbook:
        fail(errors, "cursor-team/manifest.json: runbook is required")
    else:
        require_file(ROOT / runbook, errors)

    if errors:
        print("Cursor Team configuration errors:")
        for error in errors:
            print(f" - {error}")
            print(f"::error title=Cursor Team validation::{error}")
        return 1

    print(
        "Cursor Team configuration passed: "
        f"{len(content_files)} templates, {len(EXPECTED_COMMANDS)} commands, "
        f"{len(EXPECTED_CHECKS)} consolidated checks."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
