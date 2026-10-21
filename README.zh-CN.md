# Floorplan Studio PE

基于 [Floorplan Studio](https://github.com/tinkersoder/floorplan-studio) 的独立 Fork，将现有 `picture-elements` 编辑、房间和墙门窗绘图整合到一个工作区，提供简体中文界面。保留上游 MIT 许可证和作者署名。

版本：`0.3.0-beta.2`，供测试使用。不会自动替换任何生产卡片。已知限制与依赖审计见 [VALIDATION.md](VALIDATION.md)。

## 安装到 Home Assistant

### HACS 自定义仓库（推荐）

1. 打开 HACS → 右上角菜单 → 自定义仓库。
2. 添加 `https://github.com/SeanChengN/floorplan-studio-pe`，类型选择 **仪表盘 / Dashboard**（旧版 HACS 为前端 / Lovelace）。
3. 搜索 **Floorplan Studio PE**，安装时启用测试版（Show beta versions），选择 `v0.3.0-beta.2`。
4. 安装后刷新浏览器。如果 HACS 没有自动添加资源，在“设置 → 仪表盘 → 资源”添加 JavaScript 模块 `/hacsfiles/floorplan-studio-pe/floorplan-studio-pe.js`。
5. 在独立页面添加手动卡片，建议使用面板视图：

   ```yaml
   type: custom:floorplan-studio-pe-card
   height: 90vh
   ```

Fork 的仓库名、资源名与卡片名均独立，可以与上游版本共存。

### 手动安装

1. 从构建包中取出 `floorplan-studio-pe.js`，放到 `/config/www/floorplan-studio-pe/`。
2. 在 **设置 → 仪表盘 → 资源** 添加 JavaScript 模块：

   ```text
   /local/floorplan-studio-pe/floorplan-studio-pe.js?v=0.3.0-beta.2
   ```

3. 在独立的编辑页面添加手动卡片，建议使用面板视图：

   ```yaml
   type: custom:floorplan-studio-pe-card
   height: 90vh
   ```

4. 顶部语言选项选择“简体中文”，或保持“跟随 HA”。更新模块后更换版本参数并刷新浏览器。

该资源与上游 `floorplan-studio-card` 使用不同的文件名和元素名，可以同时安装。当前版本建议每个浏览器页面使用一个编辑器实例。

## 编辑现有户型

1. 在 HA 的原卡片代码编辑器中复制完整的单张 `picture-elements` 配置，保存原始副本。
2. 点击“导入卡片”，粘贴 YAML/JSON 或选择文件。无需提供额外 HA 令牌；编辑器使用当前 HA 会话。
3. 左侧选择图层，中间拖动实体，右侧修改属性。Shift 点击多选；方向键移动 0.1 个百分点，Shift + 方向键移动 1 个百分点；鼠标中键平移。
4. 明确互斥且位置相同的同实体图标自动关联移动，覆盖 `on/off` 和 `off/非 off 且非未知` 等常见条件。也可多选后手动关联或取消关联。自动识别不合并标签或不同位置的实体。
5. 全幅灯光图、裁剪图片和底图默认锁定。先解锁才能移动、删除或排序。条件容器可整体排序，不能跨容器拖放。
6. 修改实体、图标、位置、透明度、图片地址和裁剪文本；条件和动作有独立面板，复杂参数可编辑原始 YAML。输入无效时保留上次有效配置。
7. 使用“模拟状态”检查开关灯、夜灯、未知状态及组合状态。模拟不会改变真实家电状态；预览中的所有设备动作都被屏蔽。
8. 点击“导出卡片”下载 YAML，检查差异后手动替换目标卡片。最终仍由 HA 原生 `picture-elements` 渲染，删除编辑器也不影响已导出的卡片。

图层名称、锁定、临时隐藏和关联关系属于编辑器信息，不导出到 HA。临时隐藏只影响编辑画布，完整预览和导出始终包含这些图层。图片覆盖顺序决定最终灯光效果，排序前建议下载项目备份。

## 房间、状态图层和排列工具

房间树直接呈现开灯、关灯、鱼缸等状态；点击状态模拟，眼睛临时隐藏。12 个排列图标常驻工具栏。详细操作见 [统一工作区说明](docs/rooms-and-tools.zh-CN.md)。房间及区域属于编辑项目；开启／关闭填充和状态分支生成原生配置。保存项目以保留完整编辑信息。

## 保存和恢复

顶部选中楼层后点击“删除楼层”，确认后移入回收区。可撤销，或从“项目 → 当前项目已删除的楼层”恢复；至少保留一个楼层。

- 所有起点共用 v3 项目列表、楼层、自动保存和最近 100 步撤销。刷新保留项目，但会重新开始撤销历史。
- v1/v2 自动迁移前保存 `floorplan-studio-pe-project-v1-before-v3`，旧键不覆盖。旧绘图 IndexedDB 项目迁入同一列表，原数据保留，并备份到 `fps-legacy-before-v3-<id>`。
- “下载项目”保留完整编辑信息；导入同 ID 文件会另存副本。项目删除进入可恢复回收区。
- v3 无法由 beta.2 打开。更新前下载旧项目；beta.2 安装包和旧浏览器数据保留作为回退点。
- 图片引用不自动搬迁；本地存储配额或备份失败会提示下载恢复数据。
- 旧绘图完整原文和原始导出能力保留。无法准确转换的实体外观／动作、高级规则、底图变换等会阻止原生导出并列出原因。“导出原始绘图备份”导出迁移前原文，不包含之后编辑。

## 兼容范围

首版提供 `image`、`conditional`、`state-icon`、`state-label`、`icon` 的编辑。未知元素、未知样式、动作和条件完整保留在导出配置中；未知自定义元素不在安全预览中执行。`card_mod` 不在安全预览中执行，但在导出中保留，因此依赖该扩展的效果须在最终卡片中验收。

无修改导入再导出保证配置语义一致；不保留 YAML 注释、空行、锚点写法和原始排版。不支持循环 YAML 或非 JSON 数据类型。

拖动支持百分比 `left/top` 与默认居中变换；复杂表达式、旋转、独立缩放或其他定位方式需要通过 YAML 修改。原生预览读取 HA 实际图片区域，避开卡片标题的高度。独立网页只有布局示意，不能代替 HA 的原生渲染验收。

手机主要用于查看最终导出卡片。当前版本支持房间多边形顶点编辑；不提供任意跨条件容器拖放或一键写回仪表盘。

## 本地开发和检查

建议 Node.js 22。安装依赖后运行：

```text
npx tsc --noEmit
npm test -- --maxWorkers=2 --minWorkers=1
node scripts/check-i18n.cjs
npm run build:hacs
npm run build
```

安装构建在 `dist-hacs/floorplan-studio-pe.js`；独立网页在 `dist/`。构建不会自动清空输出目录；需移走旧文件时使用项目 `.recycle-bin/`。

`scripts/browser-smoke.mjs` 使用独立无头 Edge 检查本地构建；设置 `PLAYWRIGHT_MODULE` 为可用 Playwright 模块路径。它通过浏览器路由加载本地文件，不需要启动服务。

`scripts/ha-readonly-check.mjs` 接受进程环境变量 `HA_URL`、`HA_TOKEN`、`HA_DASHBOARD`、`HA_VIEW`；设置 `HA_BROWSER=1` 执行原生预览检查。凭据仅用于临时进程和浏览器会话，不能写入脚本。真实卡片及截图保存在被忽略的 `.validation/`，不得公开提交。

已执行的测试、原生 HA 验收范围、依赖风险见 [VALIDATION.md](VALIDATION.md)。
