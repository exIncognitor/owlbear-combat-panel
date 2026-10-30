# 战斗序列 · Combat Sequence

为 **Owlbear Rodeo** 设计的中文先攻与状态扩展。紧凑的战斗面板、D&D 5e **2014** 标准状态、DM 自定义效果管理，以及独立产品主页。

> 当前为预览版。41 个逻辑测试与 9 组浏览器用例已验证；Cloudflare 站点已发布，真实 Owlbear 安装与匿名玩家端加载通过。DM 端空白及完整 GM／玩家联测仍未完成，详见 TEST-REPORT.md。

[GitHub 仓库](https://github.com/exIncognitor/owlbear-combat-panel)

[产品主页](https://owlbear-combat-panel.pages.dev/) · [Owlbear 安装清单](https://owlbear-combat-panel.pages.dev/manifest.json)

## 页面

| 路径 | 用途 |
|---|---|
| `/` | 产品主页、交互预览和安装指南 |
| `/panel.html` | 实际扩展面板；在 Owlbear 之外打开即进入本地演示 |
| `/manifest.json` | 添加到 Owlbear 的扩展安装地址 |
| `/LICENSE-SRD.txt` | SRD 5.1 规则内容的归属与许可 |

主页的复制按钮根据当前域名计算 manifest 地址，兼容 Cloudflare Pages 的预览和正式域名。

## 功能

- 340 × 480 px 紧凑面板；先攻排序、当前角色高亮、前后角色箭头。
- 玩家与 DM 均可添加角色、修改面板名称和先攻、切换前后角色。
- 可手动添加角色，也可加入地图上选中的角色 Token；不需要分配所有权。
- 每个角色的状态标签支持悬停、键盘聚焦或点击查看说明。
- 14 种非力竭标准状态，以及 2014 版力竭 1–6 级的累积说明。
- DM 专属效果管理，支持创建、修改、删除、导入和导出。
- 玩家添加列表不显示 DM 专属定义，也不能移除 DM 添加的状态。

## 开发

需要 Node.js 22.12+，推荐 Node.js 24。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

打开 `http://localhost:5173/` 查看主页，或 `/panel.html` 查看演示。真实房间身份来自官方 SDK，不由演示切换按钮控制。

```sh
npm test
npm run build
npm run build:standalone
```

- `npm run build` 生成完整静态站点到 `dist/`。
- `npm run build:standalone` 额外生成离线演示 `standalone-demo.html`。
- `npm run test:e2e` 运行已编写的 Playwright 用例，需要先安装 Chromium：`npx playwright install chromium`。

## Cloudflare Pages

构建命令 `npm run build`，输出目录 `dist`，Node.js 版本建议 `24`。完整步骤见 [DEPLOY.md](DEPLOY.md)。

现有站点采用免费 Pages 静态直传，未连接 Git 自动构建；源码推送后仍须手动部署新的 dist。

添加到 Owlbear 的链接为 `https://你的站点域名/manifest.json`，**不是首页或 ZIP 文件**。扩展面板路径是 `/panel.html`，不要改成产品主页。

## 数据与权限边界

- DM 专属效果目录仅存在当前浏览器、扩展来源、房间及 DM 用户组合的 localStorage 中。换浏览器、换设备或清除站点数据可能丢失，需要导出备份。
- 公开效果定义共享到房间；状态应用到角色后，其名称和说明对可见角色的玩家公开。不要放秘密剧情。
- 权限为客户端正常使用流程的检查，不是抵御恶意客户端的服务端授权。其他扩展或直接 SDK 写入不在此安全边界内。
- 房间原有权限仍然有效。多人同时修改同一角色可能覆盖；请避免并发编辑同一条目。
- 标准状态是中文改写摘要，不自动结算规则、时长或伤害。

详细使用说明见 [README.zh-CN.md](README.zh-CN.md)，测试状态见 [TEST-REPORT.md](TEST-REPORT.md)。

## 许可与归属

规则摘要包含经改写的 SRD 5.1 内容，适用 **CC BY 4.0**；完整归属见 [LICENSE-SRD.txt](LICENSE-SRD.txt)。这是独立项目，不代表 Owlbear Rodeo 或 Wizards of the Coast 的官方产品或认可。

仓库公开可见不等于开放源代码许可。项目其他代码及原创设计当前未另行指定许可证，不应把 SRD 的许可扩展到整个项目。
