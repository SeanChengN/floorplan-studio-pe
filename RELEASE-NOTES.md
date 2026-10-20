# Floorplan Studio PE 0.2.0-beta.1

首个公开测试版：在 HA 内可视化编辑已有的原生 `picture-elements` 卡片，保留灯光图片叠加、条件逻辑及未知配置。

- 实体拖动、多选、关联移动、坐标和属性编辑。
- 图层选择、锁定、临时隐藏、同级排序、撤销重做和项目保存。
- 安全的 HA 原生预览与模拟灯光状态；不会操作设备或自动写回仪表盘。
- 完整简体中文 / English / 跟随 HA，保留原有绘图模式。

## HACS 安装

自定义仓库：`https://github.com/SeanChengN/floorplan-studio-pe`

类型：**仪表盘 / Dashboard**。启用测试版并安装 `v0.2.0-beta.1`，刷新浏览器。

```yaml
type: custom:floorplan-studio-pe-card
height: 90vh
```

HACS 使用附件 `floorplan-studio-pe.js`。ZIP 包含模块、许可证与使用说明；`SHA256SUMS.txt` 用于核验下载文件。

## 验证与限制

本地 39 项测试、341 项翻译键检查、双构建、独立浏览器验证以及 HA 原生灯光预览与手机宽度检查通过。用户人工验收仍待完成。

此版本仍有继承的依赖审计问题（9 项：3 moderate、4 high、2 critical，其中包含 js-yaml 解析器，其余主要在开发工具链），并非已完成安全修复的稳定版。测试期间只导入可信配置，不向网络开放开发或测试服务。

未知自定义元素和 `card_mod` 会保留导出，但不在编辑器安全预览中执行。暂不支持多边形顶点拖动、手机完整编辑或自动写回仪表盘。详情见 [验证记录](VALIDATION.md) 与 [中文说明](README.zh-CN.md)。

Based on Floorplan Studio by Tinker Söder, distributed under the MIT license.
