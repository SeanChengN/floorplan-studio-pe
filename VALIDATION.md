# Validation — 0.2.0-beta.2

Date: 2026-10-21. This record covers the rooms, state layers and arrangement expansion of the independent Floorplan Studio PE fork. Historical beta.1 evidence is preserved in [docs/validation-v0.2.0-beta.1.md](docs/validation-v0.2.0-beta.1.md).

## Automated checks

- TypeScript: passed; standalone and HACS production builds passed.
- Vitest: **71 tests passed**, nine files. Covers all six measured alignment and distribution modes, fixed key/canvas references, linked movement, clipping conversion, polygon validity, room classification, native static/state fills, nested conditions, original actions, locked descendants, branch conflicts, v1/v2 migration, backup failure, history and unknown-field round-trip.
- Translation coverage: **406 keys**, including literal calls and component labels; new tools support Simplified Chinese and English.
- Independent headless Edge: original editing/drawing modes, import/drag/export, invalid import retention, history, persistence, language switching and 360/390/430px layouts passed without page errors.
- New browser acceptance: measured alignment, fixed key, fixed-endpoint distribution, inactive clipping highlights, room creation without rendering mutation, static and state fills, vertex drag with single undo, polygon drawing, cursor wheel zoom without configuration changes and recoverable v1 migration passed.

## Native HA validation

The current room card was freshly read from Home Assistant **2026.7.4**. It has 47 top-level elements. Real configuration and screenshots remain in ignored `.validation/` and are excluded from public assets.

The module was mounted only in an independent temporary browser session, without installing resources or saving dashboards:

- Imported configuration stayed semantically identical; drag only changed intended linked coordinates and undo restored it.
- A conditionally inactive polygon image could be measured, highlighted and reused as a room without changing the source card.
- Two actual native entities aligned by rendered boundaries (less than 0.5px difference), with one-step undo.
- A configured room exported and rendered as a separate native HA card. Its synthetic control entity selected exactly the on fill (opacity 0.3), off fill (0.05), or neither for unknown/unavailable.
- Original all-off/all-on simulation and exported native card were checked at 360/390/430px.
- Socket observer recorded **zero device service calls and zero dashboard/resource writes**. Registry lookups are read-only.

Public screenshot `docs/rooms-editor.png` uses synthetic entities and a synthetic image. Private screenshots such as `.validation/native-tools-room.png` are not published.

## User acceptance

The user confirmed HACS installation and the import → move entity icon → export workflow on beta.1. New room, branch, arrangement and highlight features in beta.2 still await user manual acceptance. Automated browser checks are not represented as user acceptance.

## Compatibility and limits

- Final output remains native `picture-elements`; no runtime dependency on this editor. Unknown fields, existing actions and complex conditions survive.
- Room names, area membership, locks and management settings are editor metadata. Use v2 project files for full continuation; plain card YAML does not preserve that metadata.
- v1 browser data is backed up before v2 persistence. A failed backup prevents overwriting the old data. Older editor versions cannot open v2; retain project downloads and the original v1 backup for rollback.
- Precise clipping geometry supports simple percentage/pixel `polygon()` with supported positioning. Other clipping remains preserved and can show a browser-clipped tint/full rectangle, but cannot use precise arrangement. Alpha pixels are not analyzed.
- Optional room clipping synchronization requires an unlocked, full-size centered image. Complex positioning remains source-editable.
- Unknown custom elements and `card_mod` are preserved but not executed in safe preview. Room numeric gradients/heatmaps/animations, arbitrary cross-container drag/drop, full mobile editing and automatic dashboard writes remain outside this release.
- Generated fills initially append at the end of the elements array; existing element order is preserved. Adjust native layer order if needed. New rooms are transparent by default.
- Use one editor per browser page; the existing module state and HA bridge are shared between instances.
- YAML comments, anchor spelling and original whitespace are not preserved.

## Dependencies and recovery

The inherited dependency versions remain unchanged. The historical beta.1 audit reported **9 advisories (3 moderate, 4 high, 2 critical)**. A fresh `npm audit --json --registry=https://registry.npmjs.org` on 2026-10-21 returned **0 advisories**. This change in audit-service results is not evidence that this release remediated dependencies; no parser or toolchain upgrade is included. Treat this as a beta, import trusted configurations only, and do not expose development/test servers to a network.

Current and beta.1 releases remain separate rollback points. No private image or production dashboard was changed. Obsolete files are retained or moved to `.recycle-bin/`; public release packages contain only the module, MIT license and documentation.
