import { useSyncExternalStore } from 'react';
import { getHass, subscribeHass } from './ha/hassBridge';
import { legacyZh } from './legacy-zh';
export type Language = 'auto' | 'zh-Hans' | 'en';
export const zh: Record<string, string> = {
  ...legacyZh,
  'Follow HA': '跟随 HA', 'Existing card': '编辑现有卡片', 'Drawing studio': '绘制户型',
  'Import card': '导入卡片', 'Export card': '导出卡片', 'Open project': '打开项目', 'Save project': '下载项目',
  'Layers': '图层', 'Properties': '属性', 'Undo': '撤销', 'Redo': '重做', 'Duplicate': '复制元素', 'Delete': '删除',
  'Link movement': '关联移动', 'Unlink movement': '取消关联', 'Add element': '添加元素', 'Entity': '实体',
  'Image': '图片', 'Condition': '条件', 'Icon': '图标', 'Temperature / state': '温度 / 状态',
  'Fit': '适应窗口', 'Preview': '预览', 'Edit': '编辑', 'Live states': '实时状态', 'Simulated states': '模拟状态',
  'All off': '全部关闭', 'All on': '全部开启', 'Reset simulation': '重置模拟',
  'Name': '名称', 'Lock': '锁定', 'Unlock': '解锁', 'Hide temporarily': '临时隐藏', 'Show': '显示',
  'Move earlier': '下移一层', 'Move later': '上移一层', 'Background': '底图', 'Opacity': '不透明度',
  'Left (%)': '水平位置 (%)', 'Top (%)': '垂直位置 (%)', 'Image URL': '图片地址', 'Icon name': '图标名称',
  'Raw YAML': '原始 YAML', 'Apply YAML': '应用 YAML', 'Import': '导入', 'Cancel': '取消',
  'Copy': '复制', 'Download': '下载', 'Close': '关闭', 'Copied': '已复制', 'Type': '类型',
  'Card YAML / JSON': '卡片 YAML / JSON', 'Project JSON': '项目 JSON', 'Select a file': '选择文件',
  'Import your picture-elements card to start editing.': '导入你的 picture-elements 卡片，开始调整实体和图层。',
  'Your original lighting images and conditions stay in the exported card.': '导出配置会保留原有灯光图片、条件和样式。',
  'Select a layer to edit its properties.': '选择图层后可编辑属性。',
  'Locked layers must be unlocked before changing their contents.': '修改图层内容前，请先解锁。',
  'Reordering changes image overlap. Conditional groups move together.': '排序会改变图片覆盖关系；条件容器整体调整顺序。',
  'Drag to move · Shift-click to select more · Middle-drag to pan': '拖动移动 · Shift 点击多选 · 鼠标中键拖动画布',
  'Native HA preview': 'HA 原生预览', 'Layout preview only — open in HA to verify rendering.': '当前仅为布局示意，请在 HA 中验证原生渲染。',
  'Preview never controls devices.': '预览不会控制真实设备。',
  'Unsupported elements are preserved in export; omitted from safe preview.': '不支持的元素会完整保留在导出中；安全预览中不执行它们。',
  'Complex position: edit coordinates in YAML.': '复杂定位：请在 YAML 中调整坐标。',
  'Linked': '已关联', 'Selected': '已选择', 'Add inside selected condition': '添加到选中的条件容器',
  'Add at root': '添加到顶层', 'Clipping (clip-path)': '裁剪范围 (clip-path)',
  'Conditions YAML': '条件 YAML', 'Apply conditions': '应用条件', 'Actions YAML': '动作 YAML', 'Apply actions': '应用动作',
  'Load demo': '载入示例', 'Saved locally': '已保存到此浏览器',
  'Local save failed. Download your project to keep a backup.': '本地保存失败，请下载项目备份。',
  'Download recovery data': '下载恢复数据', 'Import replaces the current workspace. Download your project first if needed.': '导入会替换当前工作内容；如需保留，请先下载项目。',
  'Export includes temporarily hidden layers. Editor locks and names are excluded.': '导出包含临时隐藏的图层，不包含编辑器锁定状态和图层名称。',
  'Select matching icons and link movement to move them together.': '选择需要同步移动的图标，点击“关联移动”。',
  'Image could not be loaded. Check its URL and permissions.': '图片加载失败，请检查地址及访问权限。',
  'Cannot create native preview. Reload HA and check required resources.': '无法创建原生预览，请刷新 HA 并检查所需资源。',
  'Help': '帮助', 'Width': '宽度', 'Color': '颜色', 'Font size': '字号',
  'invalidCard': '配置必须是一张 type: picture-elements 卡片。',
  'missingImage': '卡片需要 image、image_entity、camera_image 或 state_image 底图配置。',
  'invalidElements': 'elements 必须包含有效元素，嵌套不能超过 32 层。',
  'invalidConditions': '条件容器必须包含 conditions 和 elements 数组。',
  'recursiveYaml': '不支持循环引用的 YAML。', 'unsafeKey': '配置包含不允许的对象键。',
  'invalidNumber': '数字必须为有限值。', 'invalidProject': '项目文件结构或版本不受支持。',
  'cannotMove': '选中或关联元素已锁定，或使用了不支持拖动的定位方式。',
  'missingLayer': '该图层已不存在，请重新选择。', 'locked': '此操作涉及锁定的图层，请先解锁。',
  'cannotLink': '请选择至少两个可移动元素进行关联，并检查锁定与定位方式。',
  'Parse error': '解析失败', 'Operation failed': '操作失败', 'Unknown state': '未知状态',
};
const errorsEn: Record<string, string> = {
  invalidCard: 'Expected one picture-elements card.', invalidElements: 'Invalid elements or nesting exceeds 32 levels.',
  missingImage: 'The card needs image, image_entity, camera_image or state_image.',
  invalidConditions: 'A conditional element needs conditions and elements arrays.', recursiveYaml: 'Recursive YAML is not supported.',
  unsafeKey: 'Disallowed object key.', invalidNumber: 'Numbers must be finite.', invalidProject: 'Unsupported project structure or version.',
  cannotMove: 'Selected or linked elements are locked or use unsupported positioning.', missingLayer: 'Layer no longer exists.',
  locked: 'Unlock the affected layers first.', cannotLink: 'Select at least two movable elements to link.',
};
let preference: Language = 'auto';
try { const v = localStorage.getItem('fps-pe-language'); if (v === 'en' || v === 'zh-Hans') preference = v; } catch { /* private browser */ }
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());
subscribeHass(emit);
export function language(): 'zh-Hans' | 'en' {
  if (preference !== 'auto') return preference;
  const h = getHass() as any;
  return String(h?.locale?.language || h?.language || (typeof navigator !== 'undefined' ? navigator.language : 'en')).startsWith('zh') ? 'zh-Hans' : 'en';
}
export function setLanguage(value: Language) { preference = value; try { localStorage.setItem('fps-pe-language', value); } catch { /* session preference still works */ } emit(); }
export function useLanguage() { useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => `${preference}:${language()}`); return preference; }
export const t = (key: string): string => language() === 'zh-Hans' ? (zh[key] ?? key) : (errorsEn[key] ?? key);
