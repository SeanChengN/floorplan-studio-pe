# Validation — 0.2.0-beta.1

Date: 2026-10-20. Upstream baseline: `b21c1a8ff416f4fd609d11a3564cc436d043f9db`.
Implementation branch: `feat/picture-elements-editor`. This record covers local automated and browser acceptance before publication. Publication targets the independent `SeanChengN/floorplan-studio-pe` fork as a beta prerelease. No production dashboard replacement was performed.

## Automated checks

- TypeScript `tsc --noEmit`: passed.
- Vitest: **39 tests passed**, six files. Includes upstream export/icon/HA bridge tests and new semantic round-trip, strict input validation, unknown-field retention, explicit and automatic linked movement, locked descendants, same-parent ordering, duplicate/delete, safe preview, simulated state isolation, history/persistence and language behavior.
- `node scripts/check-i18n.cjs`: passed, **341 dictionary keys**. English UI keys and Chinese translations share one lookup; technical identifiers and user-entered names stay unchanged.
- HACS-style module and standalone production builds: passed.
- Git whitespace check: passed. Existing source newline styles were preserved; new source/docs use UTF-8 without BOM and LF.

## Real configuration compatibility

Both the historical local fixture and a fresh read of the current HA room card passed semantic round-trip and coordinate-only movement checks:

| Fixture | Top-level elements | All nodes | Clipped images | Auto-linked pairs |
|---|---:|---:|---:|---:|
| Historical v11 | 45 | 79 | 12 | 12 |
| Current HA card | 47 | 81 | 14 | 12 |

The live card had changed since the old preview record; tests used the freshly read card. Real entity names, configuration and screenshots remain in ignored `.validation/`, outside the install package and public tests.

## Browser checks

Independent headless Microsoft Edge ran the standalone build and checked:

- Chinese/English switching, including the retained drawing mode.
- Entity drag, coordinate mutation, undo/redo, YAML export.
- Invalid import rejection while retaining the previous document.
- Browser reload restores the project.
- 360/390/430px preview layouts without document-level horizontal overflow.
- No page errors during this smoke test.

Home Assistant **2026.7.4** was then loaded in an independent temporary browser session. The new module was mounted only in that browser's DOM, not installed into the production dashboard:

- Imported the freshly read native card and confirmed semantic equality.
- Dragged a real icon and confirmed that only the intended linked coordinates changed; undo restored the card exactly.
- Native HA rendering displayed the room image, labels and state icons.
- Simulated all lights off and on; screenshots visually confirmed the study, bathrooms and fish lighting changing while fixed ambient regions remained illuminated.
- Native editor preview was checked at 360/390/430px.
- Exported YAML was parsed and rendered as a separate native HA card, outside the editor, at those same widths.
- The socket observer recorded **zero device service calls and zero dashboard/resource writes** during acceptance.

Screenshots: `.validation/ha-editor.png`, `ha-all-off.png`, `ha-all-on.png`, `ha-preview-*.png`, `ha-exported-*.png`. These are local evidence, not published artifacts.

## User acceptance — 2026-10-21

The user confirmed successful installation through HACS and successful import of a card, movement of entity icons, and export of the edited configuration. This is manual acceptance of that specific workflow; it does not establish acceptance of every editor feature or replacement of the final production card.

The public README screenshot uses the built-in synthetic demo only. Private acceptance screenshots remain excluded from the repository.

## Remaining limits

- Broader manual acceptance remains pending. HACS installation and the import/move/export workflow are user-confirmed; final production-card replacement has not been confirmed.
- Preview deliberately omits unknown custom elements and `card_mod` execution. Their configuration survives export. A final card relying on those extensions needs its own visual check.
- Complex positioning expressions and nonstandard transforms remain editable in YAML but are not draggable. Polygon vertices and mobile full editing are outside this beta.
- Same-browser editor instances share the existing module state/HA bridge; use one editor card per page.
- YAML semantic values survive; comments, original formatting and anchor spelling do not.

## Dependency audit

The inherited dependency lock reports **9 advisories: 3 moderate, 4 high, 2 critical**. Most concern build/test dependencies (Vite/Vitest/esbuild and transitives); `js-yaml` also has high-severity parsing advisories. This beta is not represented as security-remediated.

An attempted upgrade of the affected parser and toolchain failed in npm 10.9.8 with `Cannot read properties of null (reading 'edgesOut')`, including a fresh-lock attempt. The known working dependency baseline was restored from the local recovery directory; no repeated blind upgrade was attempted. Upstream source and lock recovery copies remain under `.recycle-bin/`.

The new importer uses `js-yaml` JSON_SCHEMA, rejects cycles and dangerous object keys, and has structural bounds; these measures do not constitute a blanket fix for the dependency advisories. Import trusted local configurations only during beta evaluation. Development and test servers should not be exposed to a network. Resolve the dependency update before a stable release.

## Recovery and packaging

No original image, HA card or integration repository was modified. Obsolete local build assets may be moved to `.recycle-bin/` with containment checks; nothing is permanently deleted. The package contains only the module, MIT license and usage/validation docs. Private fixtures, browser credentials, caches and recovery data are excluded.
