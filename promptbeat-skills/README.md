# Promptbeat Skills

This directory is the source workspace for Promptbeat-specific agent skills. Keep
these skills versioned here, then copy or install mature skills into the runtime
skill directory used by a specific agent environment.

## Scope

- Use this directory for Promptbeat product workflow skills.
- Keep runtime-specific local skills in `.agents/skills/`, `.codex/skills/`, or a
  user-level skill directory.
- Do not duplicate Promptbeat examples or long docs inside `SKILL.md`; point to
  stable repository files and keep heavy detail in `references/`.

## First Batch

- `promptbeat-getting-started`: route a user request to the right Promptbeat path.
- `promptbeat-connect-coding-agent`: connect Codex, Claude Code, OpenCode, or
  OpenClaw style coding-agent targets.
- `promptbeat-run-quick-eval`: run the first small evaluation and locate results.
- `promptbeat-select-risk-pack`: choose scenarios, seeds, or subscriptions.
- `promptbeat-debug-run`: diagnose common Promptbeat setup and run failures.

## Validation

Before treating a skill as ready:

1. Check the pressure scenarios in `test-scenarios/`.
2. Record forward-test outcomes in `test-scenarios/results.md`.
3. Confirm frontmatter has only `name` and `description`.
4. Confirm every description starts with `Use when`.
5. Confirm referenced repository paths exist.
6. Confirm command examples match `core/go/cmd/promptbeat/main.go`.

## Runtime Install

This directory is the source of truth, not an automatic runtime install target.
To test a skill in an agent runtime, copy the specific skill directory into that
runtime's skill directory or attach the `SKILL.md` explicitly when spawning a
fresh agent. Keep this source copy versioned and sync changes back here after
runtime experiments.
