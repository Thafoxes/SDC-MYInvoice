---
name: Imported runtime setup
description: Replit runtime and package-installer quirks encountered during the import
---

Installing Node 24 did not initially select it: the imported `vue-node-20` module kept Node 20 first in PATH, even after removing the standalone Node 20 module.

**Why:** This produced engine warnings after a successful Node 24 installation and would prevent using built-in SQLite.

**How to apply:** Verify the actual `node --version` after changing runtime modules. If Node 20 still takes precedence, check the imported Vue runtime module too.

The package-install callback rejects an empty package list and rejects pip `-r` tokens. Supplying the requirements' package specifiers works, but the Python installer generates a uv project and an unused Python entry-point scaffold.

**Why:** These callback validation limits and generated scaffolding are not obvious from a normal npm/pip workflow.

**How to apply:** Use explicit package specifiers, then review generated manifests for unintended dependency edits. Preserve the original project requirements as the intended dependency source.
