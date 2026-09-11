# AIBeat 0.4.0

**[Download PromptBeat or AgentBeat](https://github.com/tophant-ai/aibeat/releases/tag/v0.4.0)** · [Release notes and platform table](RELEASE.md) · [中文](README.zh-CN.md)

Two independent products, with clear commands and complete onboarding packages:

| | PromptBeat | AgentBeat |
| --- | --- | --- |
| Evaluate | Models and prompts: red-team, quality and regression | HTTP Agents: task outcomes, safety and layered evidence |
| Recommended download | Complete archive with Node.js 22.22.2 / Promptfoo 0.121.9 | One native binary, Python/JS SDK sources and examples |
| Start | `promptbeat validate / generate / run` | `agentbeat eval-run / preflight / score` |
| Tutorial | [PromptBeat quickstart](docs/releases/promptbeat-getting-started.md) | [AgentBeat quickstart](docs/releases/agentbeat-getting-started.md) |

Choose a Linux x64, macOS Apple Silicon, macOS Intel, or Windows x64 archive from
the Release table. Names are clean: `promptbeat-0.4.0-linux-x64.tar.gz` or
`agentbeat-0.4.0-linux-x64.tar.gz`. Read the extracted package's `README.md` first.
SHA-256 sidecars verify each download; `MANIFEST.json` records package contents.

## PromptBeat

From the extracted complete package (Windows: use `bin\promptbeat.cmd`):

```sh
mkdir -p artifacts
./bin/promptbeat validate --config examples/bootstrap/promptbeat.yaml
./bin/promptbeat generate --config examples/bootstrap/promptbeat.yaml --count 5 --output artifacts/cases.json
```

This offline preview produces test inputs, not model answers or evaluation
scores. Follow the package's `examples/llm-basic/README.md` to configure your
models and run an evaluation. Real calls require data, cost and side-effect approval.

## AgentBeat

```sh
./bin/agentbeat --version
./bin/agentbeat eval-run --help
```

Follow the [complete quickstart](docs/releases/agentbeat-getting-started.md) to
start the fixed local Target/Judge, select the registry, run one case and inspect
JSON results. The evaluator no longer needs PromptBeat, Node or Promptfoo.
Python 3.11+ is only needed for the bundled local probe or Python Target example.

To connect an existing Agent, see the [authenticated Python/Node examples](examples/agentbeat-sdk-target/README.md).
SDK sources are [Python](sdk/agentbeat-sdk-py/README.md) and
[JavaScript](sdk/agentbeat-sdk-js/README.md), version 1.0.0 independently of CLI
0.4.0. They can be used locally; this release does not claim npm/PyPI publication.
L1 can work without an SDK; L2 needs actual collected events; L3 additionally
requires an independent State Controller.

## Upgrade and verification boundaries

The former `promptbeat api eval-run / agent-run / agent-preflight / agent-score`
commands now give migration guidance. Use AgentBeat's native commands instead.
Legacy `agentbeat run --adapter` needs separate historical dependencies and is
not the recommended lightweight-package workflow. Existing legacy examples
remain available for that older interface.

Linux native commands, runtime ABI and fixed HTTP protocol integration were
checked. macOS/Windows packages are cross-built, not newly native-tested.
Fixed Target/Judge replies are installation/protocol checks, **not real model
quality or safety results**. PromptBeat's pinned runtime is reused from the
same-platform official v0.2 package, not a dependency upgrade.

This public repository contains documentation, SDK sources and examples. It is
not a mirror of internal product source/history; GitHub's automatic source ZIP
is not a buildable complete product. Download the product archives above.
Website deployment and npm/PyPI publication are separate from this release.
