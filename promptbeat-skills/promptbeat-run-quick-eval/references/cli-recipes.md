# CLI Recipes

Use these from the downloaded full package root. PowerShell commands come first;
Unix equivalents use `./bin/promptbeat` with the same arguments.

## Project Config Full Run

Use when the user has a Promptbeat project config.

```powershell
.\bin\promptbeat.cmd validate --config examples\http-agent\promptbeat.yaml

.\bin\promptbeat.cmd run `
  --config examples\http-agent\promptbeat.yaml `
  --output-dir artifacts\http-agent\run
```

Unix equivalent:

```bash
./bin/promptbeat validate --config examples/http-agent/promptbeat.yaml
./bin/promptbeat run --config examples/http-agent/promptbeat.yaml --output-dir artifacts/http-agent/run
```

`run` runs the project pipeline and prints a summary like:

```text
Results: total=<n> passed=<n> failed=<n>
```

It compiles, generates, evaluates, and writes run artifacts. Generated case
inspection is optional; do not insert `generate` before `run` unless the user
asks to inspect cases first.

## Generate Only

Use when the user wants to inspect generated attacks without evaluating the
target. This writes cases JSON only. It does not evaluate the target and does
not produce promptfoo YAML for `eval`.

```powershell
.\bin\promptbeat.cmd generate `
  --config examples\http-agent\promptbeat.yaml `
  --count 5 `
  --output artifacts\http-agent\generated_cases.json
```

Unix equivalent:

```bash
./bin/promptbeat generate --config examples/http-agent/promptbeat.yaml --count 5 --output artifacts/http-agent/generated_cases.json
```

## Inspect Resolved Inputs

Use when the user is unsure which target, scenario, seed, or backend output is
resolved.

```powershell
.\bin\promptbeat.cmd config inspect --config examples\http-agent\promptbeat.yaml
```

Unix equivalent:

```bash
./bin/promptbeat config inspect --config examples/http-agent/promptbeat.yaml
```

## Existing Promptfoo YAML

Use when the user already has a generated promptfoo YAML file. Do not pass a
Promptbeat project YAML or generated cases JSON to `eval`, and do not say
`promptbeat generate` creates this YAML; `generate` writes cases JSON only.

```powershell
.\bin\promptbeat.cmd eval `
  --config artifacts\coding-agent\generate\generated_redteam.yaml `
  --output-dir artifacts\eval\run-001 `
  --run-id run-001
```

With provider override:

```powershell
$providerFile = "examples\agent-adapters\openclaw\providers.openclaw.yaml"

.\bin\promptbeat.cmd eval `
  --config artifacts\coding-agent\generate\generated_redteam.yaml `
  --provider-file $providerFile `
  --output-dir artifacts\openclaw\eval
```

Existing example provider files include
`examples\agent-adapters\openclaw\providers.openclaw.yaml`,
`examples\agent-adapters\claude-code\providers.claude-code.yaml`, and
`examples\agent-adapters\opencode\providers.opencode.yaml`.

Direct `eval` writes Promptfoo eval artifacts such as `promptfoo-result.json`,
`promptfoo.eval.stdout.log`, and `promptfoo.eval.stderr.log` under the output
directory. It does not write Promptbeat `evaluation_result.json` or `report.html`
automatically. To create HTML from the raw Promptfoo result, pass
`promptfoo-result.json` to `report --input`.

Unix equivalent:

```bash
./bin/promptbeat eval --config artifacts/coding-agent/generate/generated_redteam.yaml --provider-file examples/agent-adapters/openclaw/providers.openclaw.yaml --output-dir artifacts/openclaw/eval
```

## Report From Existing Result

Use when the user has either Promptbeat `evaluation_result.json` from project
`run`, or raw Promptfoo `promptfoo-result.json` from direct `eval`.

```powershell
.\bin\promptbeat.cmd report `
  --input artifacts\eval\run-001\evaluation_result.json `
  --output artifacts\eval\run-001\report.html
```

Raw Promptfoo result from direct `eval`:

```powershell
.\bin\promptbeat.cmd report `
  --input artifacts\eval\run-001\promptfoo-result.json `
  --output artifacts\eval\run-001\report.html
```

`--eval-result artifacts\eval\run-001\evaluation_result.json` is accepted in
place of `--input`. Prefer `--input` in examples because it also reads naturally
for raw Promptfoo result files. If `--output` is omitted, Promptbeat writes
`report.html` next to the input.

Unix equivalent:

```bash
./bin/promptbeat report --input artifacts/eval/run-001/promptfoo-result.json --output artifacts/eval/run-001/report.html
```
