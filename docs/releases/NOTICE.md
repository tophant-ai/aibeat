# Distribution notes

This package distributes AIBeat command binaries and selected usage examples.
The public documentation/SDK repository is a projection, not a public mirror of
all internal product source or history. Distribution here does not grant new
licenses or change existing third-party terms.

AgentBeat includes the JavaScript and Python SDK source (SDK version 1.0.0).
SDK source and package metadata retain their existing notices. Framework adapters
may require additional framework packages; those frameworks are not bundled.

PromptBeat reuses the unchanged Node.js 22.22.2 / Promptfoo 0.121.9 runtime files
from the same platform's official v0.2 package. Runtime files retain their license
and notice documents in their original locations: Node.js notices are under
runtime/node/, and npm package LICENSE/NOTICE files are under
runtime/promptfoo/node_modules/<package>/ (including nested node_modules/).
THIRD-PARTY.json inventories compiled Go modules only, not the npm runtime;
licenses/ contains the collected Go dependency and toolchain notices.
The original archive SHA-256 is in MANIFEST.json and the
release's runtime-source manifest. Repackaging does not mean dependency versions
have been refreshed or all optional features have been newly validated.

No raw benchmark datasets, production credentials, model weights or real model
results are included. The local probe uses fixed Target/Judge responses and is
only a protocol integration example. Review the applicable source/data/model
licenses before importing external datasets or running real evaluations.
