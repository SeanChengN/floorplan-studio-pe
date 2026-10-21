# Floorplan Studio PE

Local fork of `tinkersoder/floorplan-studio`, upstream baseline `b21c1a8ff416f4fd609d11a3564cc436d043f9db`.
Inherits the parent workspace instructions. Preserve MIT copyright and the original drawing mode.

- The imported native card is the source of truth. Do not regenerate it through the drawing-mode exporter.
- Keep editor IDs, locks, names, visibility and groups outside exported HA configuration.
- Room/area/effect management metadata lives in v2 projects; v1 browser data must be backed up before migration writes. Classifying rooms never rewrites the native card. Explicit effects wrap nodes in place and preserve existing conditions/actions.
- Use isolated read-only native measurement for hidden/inactive layers. Registry fallback queries may only read area/entity/device registries; preview and simulation must never call devices or write dashboards.
- Preview is read-only: no device actions or dashboard writes. Do not commit real HA fixtures, tokens or private endpoint details.
- Native output must round-trip semantically, including unknown fields. Use synthetic tests; private acceptance fixtures belong only in ignored `.validation/`.
- New files: UTF-8 without BOM, LF. Preserve existing source line endings in narrow edits.
- Delivery checks: type check, `npm test`, `node scripts/check-i18n.cjs`, both builds, browser smoke and native HA acceptance when available.
- Room/arrangement checks: `scripts/browser-tools.mjs`, and `HA_TOOLS=1` with the existing HA acceptance harness. See [room tools guide](docs/rooms-and-tools.zh-CN.md).
- Vite output cleaning is disabled. Move obsolete output into `.recycle-bin/` before rebuilding a clean package.
- Keep the root `floorplan-studio-pe.js` synchronized with the HACS build on version updates. It allows HACS to register a prerelease-only repository before beta versions are enabled; normal version installs use the Release attachment.
- See [README.zh-CN.md](README.zh-CN.md) for usage and [VALIDATION.md](VALIDATION.md) for evidence and remaining limitations.

Use native searches and commands for this repository. No CodeGraph index or RTK workflow is configured here. Hindsight uses the parent shared bank; do not create repository-local routing.
