import { t } from '../i18n';
import { ToolId, useStore } from '../state/store';

const TOOLS: { id: ToolId; label: string; key: string }[] = [
  { id: 'select', label: 'Select', key: 'V' },
  { id: 'marker', label: 'Marker', key: 'M' },
  { id: 'room', label: 'Room', key: 'R' },
  { id: 'wall', label: 'Wall', key: 'W' },
  { id: 'door', label: 'Door', key: '' },
  { id: 'window', label: 'Window', key: '' },
];

export function Toolbar({ onOpenExport, onOpenProjects, onOpenConnect, onOpenHelp }: {
  onOpenExport: () => void;
  onOpenProjects: () => void;
  onOpenConnect: () => void;
  onOpenHelp: () => void;
}) {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const name = useStore((s) => s.project.name);
  const commit = useStore((s) => s.commit);
  const conn = useStore((s) => s.conn);
  const usingDemo = useStore((s) => s.usingDemo);

  return (
    <div className="fp-toolbar">
      <div className="fp-toolbar-group fp-brand">
        <span className="fp-logo">▦</span>
        <input
          className="fp-project-name"
          value={name}
          onChange={(e) => commit((p) => void (p.name = e.target.value))}
          spellCheck={false}
        />
      </div>

      <div className="fp-toolbar-group">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            className={tool === item.id ? 'fp-tool active' : 'fp-tool'}
            onClick={() => setTool(item.id)}
            disabled={mode === 'preview'}
            title={item.key ? `${t(item.label)} (${item.key})` : t(item.label)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      <div className="fp-toolbar-group">
        <button onClick={undo} disabled={!canUndo} title={t("Undo (Ctrl+Z)")}>↶</button>
        <button onClick={redo} disabled={!canRedo} title={t("Redo (Ctrl+Shift+Z)")}>↷</button>
      </div>

      <div className="fp-toolbar-group fp-mode">
        <button
          className={mode === 'edit' ? 'active' : ''}
          onClick={() => setMode('edit')}
        >
          {t("Edit")}</button>
        <button
          className={mode === 'preview' ? 'active' : ''}
          onClick={() => setMode('preview')}
        >
          {t("Preview")}</button>
      </div>

      <div className="fp-toolbar-group fp-spacer" />

      <div className="fp-toolbar-group">
        <button onClick={onOpenConnect} title={t("Connect to Home Assistant")}>
          {conn.status === 'connected' ? '🟢 HA' : usingDemo ? '◻ ' + t('Demo') : '⚪ HA'}
        </button>
        <button onClick={onOpenProjects}>{t("Projects")}</button>
        <button className="fp-primary" onClick={onOpenExport}>{t("Export")}</button>
        <button onClick={onOpenHelp} title={t("Help")}>?</button>
      </div>
    </div>
  );
}
