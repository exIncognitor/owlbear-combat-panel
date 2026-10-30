# 战斗序列 · Owlbear Rodeo 战斗面板

一个中文 Owlbear Rodeo 扩展原型，使用官方 `@owlbear-rodeo/sdk` 3.1.0、React、TypeScript 和 Vite。版本 0.4.0。

## v0.4 更新

- 工具栏图标改成透明底 d20 轮廓，移除会在 Owlbear 遮罩中显示为实心方块的底板。图标 URL 带版本查询参数，便于清除旧资源缓存。
- 先攻新增/编辑均支持一位小数，20.5 排在 20 前面，整数显示为 20。
- DM 在轮数旁点击 ↺ 重置为第 1 轮并取消当前行动指示，保留全部角色、先攻与状态；玩家前后切换权限保持不变。
- 新增 27 项常见 2014 法术/职业效果，连同原有 20 项标准选项共 47 项。包括加速、祝福、护盾、缓慢、狂暴和诗人激励。来源索引与更新方法见 RULES-2014.md。

## 先体验界面

- 解压后用桌面浏览器打开 `standalone-demo.html`。这是离线演示，不连接 Owlbear 账号，不修改你的房间。
- 演示上方可以切换 **DM 视角 / 玩家视角**；真实 Owlbear 房间中没有身份切换按钮，身份来自官方 SDK。
- 所有示例角色都能由玩家和 DM 修改名称与先攻。
- 如果浏览器禁止本地 HTML 的脚本或存储，请使用下方本地开发服务器。
- 演示数据存储在当前浏览器 localStorage；同源演示标签页可同步刷新。演示里的 DM 库和玩家库在同一个模拟存储中，仅用于测试界面，不代表真实房间的私有存储隔离。

## v0.2 紧凑界面

- 面板尺寸 340 × 480 px，标题栏直接使用上一位／下一位箭头，不再显示大回合卡片、头像、归属信息或冗余描述。
- DM 与玩家均可切换前后角色、手动添加角色、从地图导入选中的角色 Token、修改面板名称与先攻。
- 手动角色不需要 Token，但需要打开一个场景。面板名称修改不会重命名地图 Token。
- 不区分角色归属。DM 专属效果管理权限保持不变；玩家不能移除 DM 添加的状态。
- 内置 D&D 5e 2014 全部 15 类标准状态，力竭按六级分别选择，包含低等级累积效果；不使用 2024 力竭规则。
- 悬停、聚焦或点击状态标签查看说明。只有 DM 可以移出角色，避免玩家通过删除角色绕过 DM 状态保护。

## 权限与隐私：请先读

### 正常使用下的权限

真实模式每次写入前重新查询官方角色。角色与先攻是共享编辑的，不检查所有权。效果管理仅限 DM，玩家不能添加 DM 专属效果，也不能移除 DM 添加的状态；玩家只移除自己添加的公开状态。隐藏 Token 不在玩家界面显示，也不允许玩家修改。

地图 Token 修改和场景 metadata 写入仍受 Owlbear 房间本身权限约束，真实联测需确认玩家具备相应平台权限。

### 这不是服务端防作弊系统

静态扩展运行在客户端。Owlbear 的 metadata 是共享的扩展数据，不是本插件的独立角色 ACL 数据库。手工篡改客户端、其他扩展或直接调用 SDK 不在本版本的防护范围内；不能声称阻止所有恶意玩家伪造写入。若需要对抗恶意客户端，需要另做认证、服务端权威状态及授权设计，不能仅靠隐藏按钮实现。

### DM 专属目录不通过共享 metadata 下发

- 真实模式的 DM 专属目录存在 **当前浏览器 + 当前扩展来源 + 房间 ID + DM 用户 ID** 的 localStorage 中。
- 只有「玩家可添加」定义会写入房间共享 metadata。
- DM 应用一个专属状态后，该状态名称、完整说明、颜色与来源的快照会写入角色 Token，供大家查看。因此**已应用的状态不是秘密**，请勿在其中写秘密剧情。
- 隐藏 Token 的处理属于视图过滤，不是对其他扩展/开发者工具的保密保证。
- 清除网站数据、换浏览器、换设备、换域名/端口会导致原私有目录不可用；请导出备份。不同 DM 的私有目录不自动同步，需要手动导入。
- 多名 DM 共享的公开效果库采用最后写入结果；同一个 Token 的同时修改也可能覆盖。建议指定一名 DM 管理定义，避免多人同时修改同一角色。没有事务锁或服务端冲突合并。
- 修改或删除效果定义不会追溯修改已经应用的状态快照；先移除旧状态、再添加才能使用新说明。

## 本地运行与构建

需要 Node.js 22.12+（推荐 Node.js 24 LTS）及 npm。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

浏览器打开 `http://localhost:5173/` 查看产品主页，打开 `/panel.html` 进入演示模式。正式嵌入 Owlbear 时使用真实 SDK。

```sh
npm test
npm run build
npm run build:standalone
```

- `dist/` 是可部署的扩展站点，包含 `manifest.json`、图标和打包代码。
- `standalone-demo.html` 是便携离线演示文件，不是正式扩展安装清单。
- 不要直接双击 `dist/index.html`：正式版本使用模块和站点绝对路径，应由 HTTP/HTTPS 服务器提供。
- 本地开发已配置 Owlbear 来源 CORS。
- Manifest 和资源路径基于域名根路径。如果部署到子目录，需要同步调整 Vite base 和 manifest 的 action/icon URL。

## 在 Owlbear Rodeo 测试

Owlbear 扩展是一个由 `manifest.json` 引导的网页，被嵌入房间面板。不是向平台上传一个 ZIP。

### 同机本地开发

1. 在**你正在使用 Owlbear 的那台电脑**运行开发服务器。
2. 用 GM 账号打开 Owlbear，在个人扩展管理中添加自定义扩展，输入 `http://localhost:5173/manifest.json`（具体入口以当前平台 UI 为准）。
3. 将扩展启用到测试房间，打开一个场景。
4. 从角色图层选择 Token，打开战斗序列，点击「加入选中 Token」。
5. 在效果管理中新建效果，或用「补全 2014 常见效果」加入缺少的默认状态、增益和减益。首次房间显示 47 项公开默认选项；已保存的自定义目录保留原样，补全仅添加缺少的 ID，不覆盖已改说明或权限。
6. 用另一个浏览器/隐私窗口通过房间邀请以玩家加入；双方打开战斗面板。
7. 测试权限表和以下验收清单。

**重要：** 同一 URL 的 localhost 对每个访问者都是各自的电脑。其他地点的玩家不能访问你电脑上的 localhost。远程多人测试需要一个双方可访问的 HTTPS 地址。

### 远程多人使用

把 `dist/` 的内容部署到支持静态文件的 HTTPS 主机，允许被 `https://www.owlbear.rodeo` 嵌入。不要设置阻止嵌入的 `X-Frame-Options: DENY/SAMEORIGIN`；如果设置 CSP，`frame-ancestors` 至少需要允许 Owlbear 来源。将 `https://你的域名/manifest.json` 作为安装链接。

本源码交付本身不包含账号信息；部署与真实房间测试结果由交付消息单独说明。实际房间测试需一个 GM 账号及测试房间，另一端通常可匿名以玩家加入；无需提供密码到聊天。

## 权限表

| 功能 | DM | 玩家 |
|---|---|---|
| 添加角色、改名、先攻、上一位／下一位 | 是 | 是 |
| 查看可见角色与状态说明 | 是 | 是 |
| 查看隐藏 Token | 是 | 否 |
| 管理效果目录 | 是 | 否 |
| 在添加列表查看 DM 专属效果 | 是 | 否 |
| 添加状态 | 全部效果 | 公开效果 |
| 移除状态 | 全部 | 仅自己添加的公开效果 |
| 移出角色 | 是 | 否 |

## 数据与限制

- 命名空间：`io.combat-panel.v1`。
- Token metadata 保存面板名称、先攻和已应用状态快照；场景 metadata 保存手动角色、回合与当前角色；房间 metadata 只保存公开效果目录。
- 官方房间 metadata 总上限为 16 KB，且与其他扩展共享。本版本写入前保守检查 15,000 字节，过大时提示减少内容。最多 80 个效果，名称最多 40 字，说明最多 1200 字；可能先触及共享数据字节限制。
- 一个角色不能重复添加同一效果 ID。当前没有叠层、持续时间自动扣除、规则自动结算或与第三方 Initiative Tracker 数据兼容。
- 标准状态依据 SRD 5.1（2014）做中文改写摘要；完整授权见 LICENSE-SRD.txt。力竭只能存在一个等级，玩家不能通过添加另一等级替换 DM 设置的力竭。
- 没有后台脚本；面板关闭后不运行自动回合逻辑。共享状态由 Owlbear 保存，重新打开时读取。
- 没有收集分析数据、外部字体或其他第三方 API。

## 测试

见 `TEST-REPORT.md`。v0.4 已通过 TypeScript 检查、生产构建及 47 个逻辑/模拟 SDK 测试，13 组本地浏览器测试通过。历史 v0.3 的真实安装与匿名玩家端加载记录单独保留；本次真实 Owlbear 测试按用户要求由用户进行，不把模拟测试当作平台验收。

在具备浏览器运行能力的环境可执行：

```sh
npx playwright install chromium
npm run test:e2e
```

## 官方参考

- 扩展架构：https://docs.owlbear.rodeo/extensions/getting-started/
- Manifest：https://docs.owlbear.rodeo/extensions/reference/manifest/
- 官方先攻教程：https://docs.owlbear.rodeo/extensions/tutorial-initiative-tracker/
- 玩家角色 API：https://docs.owlbear.rodeo/extensions/apis/player/
- 场景 API：https://docs.owlbear.rodeo/extensions/apis/scene/
- 房间 API（16 KB 上限）：https://docs.owlbear.rodeo/extensions/apis/room/
- Metadata：https://docs.owlbear.rodeo/extensions/reference/metadata/
- 安装扩展：https://extensions.owlbear.rodeo/guide

开发依据查阅时间：2026-10-30。正式安装界面及平台权限需在实际房间复核。

## 规则许可

标准状态源自 SRD 5.1，中文已改写概括。归属与 CC BY 4.0 声明见 public/LICENSE-SRD.txt（构建后位于站点 /LICENSE-SRD.txt），并从界面说明页可访问。

## v0.3 产品主页

根路径为产品介绍与安装页，实际扩展路径为 `/panel.html`。安装清单已更新指向该路径。主页复制安装链接使用当前域名，部署说明见 DEPLOY.md。
