# Floorplan Studio PE 0.3.0-beta.3

优化房间归类、项目管理和工具栏空间。

- “将选中图层加入房间”固定在左侧顶部，替换重复的“绘制房间”按钮，配合目标房间选择框使用；绘制仍从工具栏“房间”进入。
- 项目回收区新增“永久删除”，确认后从项目库移除，刷新不会自动迁回。此操作不能撤销；已下载的项目文件和旧版备份不受影响。
- 工具栏改为紧凑布局。常见桌面宽度下，绘图／视图／缩放一行，12 个排列图标与模拟按钮一行。“实体状态”展开为浮动面板，减少挤占画布；窄窗口自动换行。

89 项测试、翻译检查、双构建、三套浏览器回归和 HA 原生检查通过。持续 40 次 HA 状态推送仍为 0 次配置重建；没有调用设备或写入仪表盘。实际使用体验待用户验收。

HACS 开启测试版，更新至 `v0.3.0-beta.3` 后强制刷新；资源和卡片类型不变。旧测试版保留作为回退点。

[中文说明](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/README.zh-CN.md) · [验证记录](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/VALIDATION.md)

Based on Floorplan Studio by Tinker Söder, distributed under the MIT license.
