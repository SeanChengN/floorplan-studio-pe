# Validation — 0.3.0-beta.1

Date: 2026-10-21. Covers the unified workspace, project migration, drawing tools, room state tree and persistent arrangement toolbar. Previous evidence remains in [beta.2](docs/validation-v0.2.0-beta.2.md) and [beta.1](docs/validation-v0.2.0-beta.1.md).

## Automated checks

- TypeScript and both production builds passed. HACS bootstrap JS is synchronized with `dist-hacs/floorplan-studio-pe.js`.
- **85 tests passed in 10 files.** Includes native semantic round trips, coordinate-only linked movement, room classification without new wrappers, independent state combinations, state-image masks, explicit conditional edits, v3 floors and source preservation, wall/opening regeneration and locks, duplicate/delete integrity, malformed input, migration backups, repeated-project import protection, visibility independent of undo/redo, geometry and arrangement regressions.
- Translation coverage: **466 dictionary keys**. Simplified Chinese, English and Follow HA remain available.
- `browser-smoke.mjs`: import, drag, undo/redo, export, invalid input preservation, reload, Chinese/English and 360/390/430px layouts passed.
- `browser-tools.mjs`: measured alignment, key object, fixed-endpoint distribution, inactive clipping highlight, room-from-clipping unchanged card, static/state fills, polygon draw and vertex editing, cursor wheel zoom and recoverable v1 migration passed.
- `browser-workspace.mjs`: one library/canvas, 12 visible icons, four room state rows, independent simulation, visibility with unchanged export, alignment undo, wall/door/window draw and linked geometry edits, entity click placement with non-light details action, common history, reload and project switching passed.
- All three browser suites recorded zero page errors. The synthetic screenshot [unified-workspace.png](docs/unified-workspace.png) was visually inspected. It contains no private entities or images.

## Home Assistant native verification

The release build was loaded into an independent temporary browser session against Home Assistant **2026.7.4**. The latest card was read again: **47 top-level elements**. Production resources and dashboards were not installed or changed.

- Import/export semantic equality; a linked entity drag changed only intended coordinates, and undo restored the card.
- Conditionally inactive polygon image measurement/highlight and room reuse preserved the card.
- Actual rendered entity bounds aligned within 0.5px, with one-step undo.
- Generated room fill exported into a separate native card: on opacity `[0.3]`, off `[0.05]`, unknown/unavailable `[]`.
- Native preview and separately exported native card checked at **360, 390 and 430px**, including all-on/all-off states.
- WebSocket observer: **0 device calls, 0 dashboard/resource writes**.

Private configurations and native screenshots remain ignored under `.validation/`; none are included in public documentation or release assets. Automated browser/HA checks do not replace human acceptance.

## Human acceptance

The earlier HACS import → drag → export flow was confirmed by the user. The redesigned workspace and room state tree in this release **still await user manual acceptance**. No user approval is inferred from test success.

## Compatibility and limits

- Export remains standard `picture-elements`. Unknown native configuration, original actions, conditions, image URLs and custom fields survive. Comments, whitespace and YAML anchor spelling are not preserved.
- Workspace files are v3; each floor retains a native v2 document plus geometry bindings. Editor-only names, masks, locks, rooms and geometry metadata do not enter exported HA configuration. Use project downloads to continue editing.
- Migration backs up v1/v2 local data and preserves legacy IndexedDB. Repeated legacy migrations do not duplicate projects. Re-importing an existing project ID creates a separate copy. Deleted projects remain recoverable in the project recycle area. Keep pre-upgrade downloads: beta.2 cannot read v3.
- Legacy drawing snapshots and original ha-floorplan/SVG/PNG/project exports remain available. These exports represent the original, pre-migration drawing, **not subsequent workspace edits**. Legacy markers (including appearance/actions), advanced room rules/actions, transformed backgrounds and hidden categories can be approximated in the workspace but block native export with explicit reasons. Advanced rules are not silently discarded.
- Existing simple entity-state conditions and state-image mappings appear as room state rows. Complex conditions remain editable in source/layer views; the editor does not invent simulation inputs for unsupported logic. Additional conditions can prevent a selected state from rendering.
- Drawing walls/doors/windows generates managed SVG image layers. Edit their geometry through drawing controls. Raw YAML changes to an ancestor can invalidate a managed geometry relationship; arbitrary raw restructuring is not a supported geometry workflow.
- Exact arrangement uses measured native boundaries and simple percent/pixel `polygon()` clips, not alpha pixels. Complex positioning/clipping is preserved but excluded from exact alignment. Generated wall/opening geometry uses drawing controls rather than entity arrangement.
- Room geometry changes update generated fills and explicitly bound clipping only. Generated fills append by default; inspect covering order as needed. Room geometry does not move entity icons.
- Safe preview omits unknown custom components and `card_mod` execution while preserving their configuration. Standalone preview is approximate. One editor per browser page; no full mobile editor or automatic dashboard writes.
- Content undo is session-local (up to 100 steps); viewport and simulation are outside it. Temporary masks are carried through history without discarding redo. Refresh starts a new history.

## Dependencies and rollback

Dependency versions are unchanged. The previous beta.2 record contains the 2026-10-21 npm audit results; this release does not claim dependency remediation. Beta.2 release/tag/assets remain as rollback points. No private images or production cards were replaced. Build cleaning remains disabled; no workspace files were permanently deleted.
