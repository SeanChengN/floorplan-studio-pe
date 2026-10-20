# Floorplan Studio PE

Independent fork based on upstream commit `b21c1a8ff416f4fd609d11a3564cc436d043f9db`, with the original MIT license and copyright preserved.

Adds a desktop editor for existing native Home Assistant `picture-elements` cards. The original card object is preserved; editor metadata is stored separately. Unknown configuration survives import/export. Includes Simplified Chinese and English for both editing modes.

In HACS, add `https://github.com/SeanChengN/floorplan-studio-pe` as a custom repository with category **Dashboard** (formerly Lovelace/Frontend). Enable beta versions and download `v0.2.0-beta.1`. Refresh the browser. If the resource is not registered automatically, add `/hacsfiles/floorplan-studio-pe/floorplan-studio-pe.js` as a JavaScript module.

For manual installation, copy `floorplan-studio-pe.js` from the Release to `/config/www/floorplan-studio-pe/`, and register `/local/floorplan-studio-pe/floorplan-studio-pe.js?v=0.2.0-beta.1` as a JavaScript module.

Add a manual card on a separate dashboard view:

```yaml
type: custom:floorplan-studio-pe-card
height: 90vh
```

Import one card's YAML or JSON; drag entities, select/lock/order layers, edit properties, and export YAML for manual replacement. Full-size lighting images are locked by default. Mutually exclusive icons for the same entity and position can move together. Temporary hiding and locks do not affect exported configuration.

The native HA preview is read-only and supports local state simulation. Unsupported custom elements and `card_mod` are preserved but not executed in preview. Standalone mode is only a layout approximation. The final exported card continues to use HA's native renderer and does not depend on this editor.

Save project files to keep names, groups and locks across browsers. Current-card projects autosave in browser localStorage; drawing projects continue using upstream IndexedDB. No automatic dashboard writes, mobile full editing, or polygon-vertex editing in this beta.

See [Chinese installation and usage guide](README.zh-CN.md) and [validation record](VALIDATION.md). This is a beta prerelease of an independent fork. Known dependency advisories remain; import trusted configurations only. The repository, resource and custom-card names differ from upstream, allowing both versions to coexist.
