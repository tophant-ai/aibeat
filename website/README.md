# Promptbeat Website

This folder is intentionally independent from the Python core, web API, CLI, and report UI dependencies.

- Framework: Mintlify
- Config: `docs.json`
- Local content: `docs/**/*.mdx`
- Local dependencies: `package.json` and `package-lock.json`

## Why Mintlify

Mintlify is the best fit for the first website pass because it supports hosted documentation with custom domains, docs-as-code, search, navigation, and AI-friendly documentation features. It lets us ship the product narrative and docs quickly without mixing dependencies into Promptbeat core packages.

## Run locally

```bash
cd website
PUPPETEER_SKIP_DOWNLOAD=1 npm install
npm run dev
```

`PUPPETEER_SKIP_DOWNLOAD=1` avoids slow Chromium downloads during local setup. Mintlify preview and link checks work without committing browser binaries or `node_modules/`.

## Validate links

```bash
cd website
npm run check
```

## Deployment notes

Use Mintlify hosting for the first launch. Configure the production domain in the Mintlify dashboard after the project is connected. Keep generated reports and benchmark artifacts out of this folder unless they are sanitized and intentionally published.

The seed community under `public/community/` is a prebuilt static artifact. It
contains collection metadata and aggregate counts only; controlled seed prompts
are not included. Rebuild it from the private registry source, scan the output
for prompt-bearing fields and secrets, then replace the committed artifact as a
single reviewed change.
