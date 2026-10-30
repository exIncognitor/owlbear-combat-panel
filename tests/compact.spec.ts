import { test, expect } from "@playwright/test";

test("260px panel keeps short lists compact and preserves decimal controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 260, height: 420 });
  await page.goto("/panel.html");
  await page.getByRole("button", { name: "移出幽影猎手", exact: true }).click();
  await page.getByRole("button", { name: "移出遗迹守卫", exact: true }).click();
  await page
    .getByLabel("艾琳 · 战士名称", { exact: true })
    .fill("万众瞩目的超偶像");
  await page.getByLabel("艾琳 · 战士名称", { exact: true }).press("Enter");
  await page.getByLabel("万众瞩目的超偶像先攻", { exact: true }).fill("20.5");
  await page.getByLabel("万众瞩目的超偶像先攻", { exact: true }).press("Enter");
  await expect(
    page.getByLabel("万众瞩目的超偶像先攻", { exact: true }),
  ).toHaveValue("20.5");
  const geometry = await page.locator("main").evaluate((e) => ({
    width: e.getBoundingClientRect().width,
    height: e.getBoundingClientRect().height,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  expect(geometry.width).toBe(260);
  expect(geometry.height).toBeLessThan(240);
  expect(geometry.overflow).toBe(false);
  await page.screenshot({ path: "qa/v05-compact.png" });
});

test("action canvas leaves its background to the host", async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 470 });
  await page.goto("/panel.html");
  await page.setContent(`<style>
    body {margin:0;min-height:470px;background-color:#43616a;background-image:linear-gradient(#bbd8c333 1px,transparent 1px),linear-gradient(90deg,#bbd8c333 1px,transparent 1px),radial-gradient(ellipse at 15% 75%,#86a072 0 15%,transparent 16%),linear-gradient(25deg,transparent 60%,#2b454d 61% 74%,transparent 75%);background-size:40px 40px,40px 40px,100% 100%,100% 100%;font:14px sans-serif;color:#d0e5da}
    p {position:absolute;right:18px;bottom:5px} iframe {position:absolute;left:20px;top:20px;width:260px;height:420px;border:0;background:transparent}
    </style><p>原生面板透明画布 · 本地测试</p><iframe title="半透明面板" src="/panel.html?surface=action"></iframe>`);
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("heading", { name: "先攻", exact: true }),
  ).toBeVisible();
  const colors = await frame.locator("main").evaluate((e) => ({
    root: getComputedStyle(document.documentElement).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor,
    panel: getComputedStyle(e).backgroundColor,
    width: e.getBoundingClientRect().width,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  expect(colors.root).toBe("rgba(0, 0, 0, 0)");
  expect(colors.body).toBe("rgba(0, 0, 0, 0)");
  expect(colors.panel).toBe("rgba(0, 0, 0, 0)");
  expect(colors.width).toBe(260);
  expect(colors.overflow).toBe(false);
  await frame.getByRole("button", { name: "目盲", exact: true }).click();
  const tip = await frame.getByRole("tooltip").evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, right: r.right };
  });
  expect(tip.left).toBeGreaterThanOrEqual(0);
  expect(tip.right).toBeLessThanOrEqual(260);
  await frame.getByRole("button", { name: "目盲", exact: true }).click();
  await frame.getByRole("heading", { name: "先攻", exact: true }).click();
  await expect(
    frame.getByRole("button", { name: "关闭面板", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "qa/v052-action-canvas.png" });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.locator("iframe").evaluate((e) => {
    e.setAttribute("src", "/panel.html?surface=action");
  });
  await expect(
    frame.getByRole("heading", { name: "先攻", exact: true }),
  ).toBeVisible();
  await expect(frame.locator("html")).toHaveCSS("color-scheme", "normal");
});

test("effect management and its editor fit the narrowed panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 260, height: 420 });
  await page.goto("/panel.html");
  await page.getByRole("button", { name: "效果管理", exact: true }).click();
  await page.getByRole("button", { name: "新建效果" }).click();
  await page.getByLabel("名称", { exact: true }).fill("窄屏效果");
  await page.getByLabel("具体效果").fill("窄屏编辑验证。");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("窄屏效果", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
