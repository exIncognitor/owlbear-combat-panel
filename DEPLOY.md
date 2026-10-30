# 部署到 Cloudflare Pages

这是纯静态 Vite 项目，无服务端、数据库、密钥或额外账号系统。请不要把 Owlbear 登录信息、验证码、开发者令牌或本地效果库提交到仓库。

## 从 GitHub 连接 Pages

1. 将本项目源代码提交到目标 GitHub 仓库。包含 `package.json`、`package-lock.json`、`index.html`、`panel.html`、`vite.config.ts`、`src/` 和 `public/`。
2. 在 Cloudflare 的 Workers & Pages 中创建 Pages 项目并连接该仓库。
3. 设置构建命令为 `npm run build`，构建输出目录为 `dist`。根目录为项目根目录。
4. 建议将构建环境变量 `NODE_VERSION` 设为 `24`。不需要任何敏感环境变量。
5. 完成部署后依次打开 `/`、`/panel.html`、`/manifest.json`、`/LICENSE-SRD.txt`，确认页面和资源可访问。
6. 在主页复制安装链接，然后在 Owlbear 添加自定义扩展并启用到测试房间。

也可在已授权的 Cloudflare Pages 直传流程中上传 `dist/`。不要上传源码 ZIP 作为站点资源。

## 路由与嵌入

- 根路径 `/` 是产品主页。
- 扩展实际入口为 `/panel.html`，manifest 的 `action.popover` 已指向该路径。
- `manifest.json`、图标和资源使用站点根路径；当前构建不适用于未配置的子目录托管。
- Cloudflare Pages 可能将 `.html` 路径规范化为无后缀路径；正常跳转应保持同一页面。部署后需确认面板不会跳到产品主页。

`public/_headers` 随构建复制到 `dist/_headers`，用于：

- 允许跨域读取 manifest 和公共静态资源。
- 允许本站、`https://www.owlbear.rodeo`、`https://owlbear.rodeo` 嵌入页面。
- 不设置阻止嵌入的 `X-Frame-Options`。
- 禁止 manifest 的长期缓存，以便更新版本后重新读取。

不要把整个站点放在会拦截 iframe 或 manifest 请求的登录墙后面。若使用自定义域名、额外 CSP、访问规则或 WAF，请另外验证平台安装和嵌入。

## 部署后验收

1. 首页桌面及手机布局、锚点导航和复制链接。
2. 首页嵌入演示和独立 `/panel.html`，切换 DM／玩家视角。
3. manifest 返回正确 JSON，版本与代码一致，popover 为 `/panel.html`。
4. 真实 Owlbear 房间加载插件并打开场景。
5. GM 与玩家分别测试手动/Token 添加、改名、先攻、前后角色、状态可见性和 DM-only 限制。
6. 刷新与场景切换后的数据恢复、角色隐藏、长说明和错误状态。

测试未完成前，保留现有先攻工具。所有代码测试通过并不代表平台联机验收已完成。

## 发布与开源许可

发布代码或站点需由仓库与 Cloudflare 账户所有者授权。本项目未新增一般代码许可证；SRD 规则内容的 CC BY 4.0 归属在 `LICENSE-SRD.txt` 中单独说明。
