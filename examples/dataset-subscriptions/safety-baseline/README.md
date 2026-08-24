# Dataset subscription safety baseline

This example starts from a seed subscription instead of a hand-written `seeds.yaml` file.

The subscription file is shared across projects:

```text
subscriptions/safety-baseline.yaml
```

This project includes only the `safety-baseline` subscription and overrides each source to load at most 5 records.
Raw datasets are not bundled into release packages. Download them before expecting every source to load:

```bash
uv run python scripts/download_datasets.py --only harmbench jbb_behaviors do_not_answer simple_safety_tests beaver_tails
```

Validate the project:

```bash
./bin/promptbeat validate --config examples/dataset-subscriptions/safety-baseline/promptbeat.yaml
```

Generate attack cases:

```bash
./bin/promptbeat generate \
  --config examples/dataset-subscriptions/safety-baseline/promptbeat.yaml \
  --count 5 \
  --output artifacts/dataset-subscriptions/safety-baseline/generated_cases.json
```

Run the full Promptbeat + Promptfoo path:

```bash
./bin/promptbeat run \
  --config examples/dataset-subscriptions/safety-baseline/promptbeat.yaml \
  --output-dir artifacts/dataset-subscriptions/safety-baseline/run
```
