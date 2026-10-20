import { t } from '../i18n';
import { Modal } from './Modal';

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title={t("How to add your floorplan to a dashboard")} onClose={onClose} wide>
      <div className="fp-help">
        <h3>{t("1 · Design")}</h3>
        <ul>
          <li>{t("Upload a background (button in the right panel, or paste / drag-drop an image).")}</li>
          <li>{t("Adjust its opacity, scale, position and rotation; lock it when happy.")}</li>
          <li>{t("Place markers (M), draw rooms (R), trace walls (W). Click an entity in the left panel to drop a marker.")}</li>
          <li>{t("Select anything to edit style, state rules and actions on the right.")}</li>
          <li>{t("Toggle")}<strong>{t("Preview")}</strong> {t("to see live/demo states drive your colours and labels.")}</li>
        </ul>

        <h3>{t("2 · Connect Home Assistant (optional)")}</h3>
        <ul>
          <li>{t("Click the HA button → enter your HA URL + a long-lived token (Profile → Security).")}</li>
          <li>{t("Use the same scheme (http/https) as this app to avoid mixed-content blocks.")}</li>
          <li>{t("If blocked by CORS, add this origin to HA's")}<code>configuration.yaml</code>:
            <pre>{`http:\n  cors_allowed_origins:\n    - ${location.origin}`}</pre>
          </li>
        </ul>

        <h3>{t("3 · Export → ha-floorplan (rooms + rich rules)")}</h3>
        <ol>
          <li>{t("Install")}<strong>ha-floorplan</strong> {t("via HACS → Frontend → “floorplan”, then restart HA.")}</li>
          <li>{t("Export → target")}<em>ha-floorplan</em>{t(". Leave")}<em>{t("Embed")}</em> {t("selected for a self-contained card.")}</li>
          <li><strong>{t("Copy YAML")}</strong>{t(". In your dashboard: Edit → Add Card →")}<em>{t("Manual")}</em> {t("→ paste → Save.")}</li>
          <li>{t("If you chose")}<em>{t("Reference")}</em> {t("instead, also drop the")}<code>.png</code> {t("and")}<code>.svg</code> {t("into")}<code> /config/www/floorplan/</code>.</li>
        </ol>

        <h3>{t("3b · Export → Picture Elements (native, no HACS)")}</h3>
        <ol>
          <li>{t("Export → target")}<em>Picture Elements</em>{t(". Copy YAML, add as a Manual card.")}</li>
          <li>{t("Note: polygon rooms aren’t supported here — use ha-floorplan if you need filled rooms.")}</li>
        </ol>

        <h3>{t("Saving")}</h3>
        <p>{t("Everything autosaves to this browser (IndexedDB). Use")}<strong>{t("Projects")}</strong> {t("to manage, export a JSON backup, or import one on another machine.")}</p>
      </div>
    </Modal>
  );
}
