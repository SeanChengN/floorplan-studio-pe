# Floorplan Studio PE 0.3.0-beta.1

将“编辑现有卡片”和“绘制户型”合并为同一个工作区。

- 同一项目列表、楼层、画布、属性、自动保存和撤销；空白绘制、底图、卡片三种起点。
- 房间下直接显示开灯／关灯／鱼缸等状态及图层，点击状态模拟，眼睛临时显隐；相同实体共享模拟值。
- 房间绘制预览、网格吸附、顶点编辑；墙连续绘制、门窗吸附和联动；实体点击放置。
- 六种对齐、六种分布常驻图标；选区／关键对象／画布基准，保留边界与裁剪高亮。
- v3 项目迁移与恢复备份、回收区、重复导入另存副本；完整简体中文与英文。

## HACS 更新

启用测试版，更新到 `v0.3.0-beta.1`，刷新浏览器。资源 `/hacsfiles/floorplan-studio-pe/floorplan-studio-pe.js` 与卡片类型 `custom:floorplan-studio-pe-card` 不变。

更新前下载当前项目。v3 无法由 beta.2 打开；保留 `v0.2.0-beta.2` 作为回退点，迁移不改写旧存储。

## 验证与边界

85 项测试、翻译覆盖、双构建与浏览器检查通过；HA 原生验证及详细证据见验证记录。用户人工验收仍待进行。没有调用设备或写入生产仪表盘。

旧绘图中的高级规则、实体外观／动作等无法保证原生等价时，明确阻止原生导出；完整旧数据与原始导出入口保留，但原始导出仅代表迁移前快照。独立网页预览不能替代 HA 原生效果检查。

[中文操作说明](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/docs/rooms-and-tools.zh-CN.md) · [验证记录](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/VALIDATION.md)

Based on Floorplan Studio by Tinker Söder, distributed under the MIT license.
