# Floorplan Studio PE 0.2.0-beta.2

新增房间管理、状态图层、排列与范围调试工具，保留原生 Picture Elements 渲染。

- 房间命名、HA 区域绑定、裁剪范围复用、多边形绘制与顶点编辑。
- 每房间多组独立开关填充及图片／实体图层；原位置增加条件包装，保留已有条件与动作。
- 六种对齐、六种分布；选区、关键对象、画布基准，使用实际渲染边界。
- 关闭、隐藏及锁定图层的边界／裁剪高亮；鼠标位置滚轮缩放。
- 项目 v2，v1 数据先备份后迁移。保存项目以保留房间管理信息；卡片导出仍为标准 `picture-elements`。

## HACS 更新

仓库：`https://github.com/SeanChengN/floorplan-studio-pe`，类型 **仪表盘 / Dashboard**。启用测试版，更新到 `v0.2.0-beta.2`，刷新浏览器。资源名和卡片类型保持不变：

```yaml
type: custom:floorplan-studio-pe-card
height: 90vh
```

更新前建议下载项目备份。旧版本无法打开 v2 项目；`v0.2.0-beta.1` 保留作为回退点。

## 验证与限制

71 项测试、翻译检查、双构建、独立浏览器和 HA 2026.7.4 原生预览验收通过。新功能仍待用户人工验收。没有写入生产仪表盘或控制设备。

此前记录的依赖审计问题未通过本次升级修复（依赖版本未变）；2026-10-21 官方 npm 审计当前返回 0 项，不能据此认定已完成安全整改。仅导入可信配置。精确裁剪支持简单 `polygon()`，其他形式保留但有测量限制；未知自定义元素和 `card_mod` 不在安全预览执行。

[中文操作说明](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/docs/rooms-and-tools.zh-CN.md) · [验证记录](https://github.com/SeanChengN/floorplan-studio-pe/blob/main/VALIDATION.md)

Based on Floorplan Studio by Tinker Söder, distributed under the MIT license.
