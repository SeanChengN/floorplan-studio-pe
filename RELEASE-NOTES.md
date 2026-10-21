# Floorplan Studio PE 0.3.0-beta.2

紧急修复导入卡片后，HA 持续推送状态导致画布闪烁和卡顿的问题。

- 状态更新只更新原生卡片的 HA 状态；仅配置内容真正改变时才调用 setConfig，避免反复重建图片和实体。
- 尺寸测量观察器不再随着每次状态更新销毁重建。
- 顶部新增“删除楼层”：移入可恢复区，支持撤销／重做；在“项目”窗口恢复，至少保留一个楼层。

真实 HA 回归：同一份 47 元素卡片，40 次连续状态推送，整卡配置重建由旧版 40 次降为 0 次。86 项测试、双构建、浏览器及 HA 原生检查通过。没有设备调用或仪表盘写入；请更新后继续人工测试。

HACS 开启测试版，更新到 `v0.3.0-beta.2` 并刷新浏览器。资源与卡片类型不变；`v0.3.0-beta.1` 和 `v0.2.0-beta.2` 均保留。更新前下载项目备份。

[中文说明](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/README.zh-CN.md) · [验证记录](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/VALIDATION.md)

Based on Floorplan Studio by Tinker Söder, distributed under the MIT license.
