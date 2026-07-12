---
title: Docker-first CI/CD
description: How this repository validates Cursor rules in Docker and how the shared rules govern container-based delivery.
---

## Purpose

This repository uses Docker as the reproducible validation environment for its rule set. The container runs the same `scripts/lint.sh` checks used by developers and GitHub Actions.

The shared rule at `.cursor/rules/docker-cicd.mdc` extends this pattern to container-capable projects while preserving ANVIL's safety, logging, approval, and deployment requirements.

## Run locally

Build the validator image:

```bash
docker build -t cursor-rules-validator:dev .
```

Run all rule, YAML, JSON, Markdown, shell, and secret-file checks:

```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  cursor-rules-validator:dev
```

## CI behaviour

`.github/workflows/docker-ci.yml` performs the following on pull requests, pushes to `main`, and manual runs:

1. checks out the repository
2. builds the validator image with Buildx
3. restores and saves the GitHub Actions build cache
4. runs the image without root privileges or added Linux capabilities
5. fails the workflow if any validation check fails

The workflow does not publish an image or deploy infrastructure.

## Relationship to ANVIL

Docker provides build reproducibility. ANVIL remains the durable governance and engineering-state layer.

Meaningful lifecycle events should be returned to ANVIL, including:

- validation started and completed
- build or scan failure
- artifact publication
- deploy or rollback decision
- deployment result and health verification

High-volume build and runtime telemetry remains in the configured CI and Cloudflare observability systems. Only durable engineering state is promoted into ANVIL.

## Production use

Projects adopting the shared Docker rule should add their own release stages for image scanning, SBOM generation, signing, publication, deployment, and post-deploy verification.

Production publication and deployment must remain behind the project's required GitHub checks and ANVIL safety gates.
