import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/panel.html");
});
test("compact header and both-role previous/next navigation", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "先攻", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".character")).toHaveCount(4);
  await expect(page.locator(".avatar,.round")).toHaveCount(0);
  await page.getByRole("button", { name: "下一个角色", exact: true }).click();
  await expect(page.locator(".character.active .character-name")).toHaveValue(
    "米拉 · 游侠",
  );
  await page.getByRole("button", { name: "上一个角色", exact: true }).click();
  await expect(page.locator(".character.active .character-name")).toHaveValue(
    "艾琳 · 战士",
  );
  await page.getByRole("button", { name: "玩家", exact: true }).click();
  await page.getByRole("button", { name: "下一个角色", exact: true }).click();
  await expect(page.locator(".character.active .character-name")).toHaveValue(
    "米拉 · 游侠",
  );
  await page.getByRole("button", { name: "上一个角色", exact: true }).click();
  await expect(page.locator(".character.active .character-name")).toHaveValue(
    "艾琳 · 战士",
  );
});
test("player can add manual character and edit all visible names/initiative", async ({
  page,
}) => {
  await page.getByRole("button", { name: "玩家", exact: true }).click();
  await page.getByRole("button", { name: "添加角色", exact: true }).click();
  await page.getByLabel("新角色名称").fill("测试法师");
  await page.getByLabel("新角色先攻").fill("24");
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await expect(page.getByLabel("测试法师名称")).toHaveValue("测试法师");
  await page.getByLabel("幽影猎手名称").fill("改名敌人");
  await page.getByLabel("幽影猎手名称").press("Enter");
  await expect(page.getByLabel("改名敌人名称")).toBeVisible();
  await page.getByLabel("改名敌人先攻").fill("25");
  await page.getByLabel("改名敌人先攻").press("Enter");
  await expect(page.locator(".character-name").first()).toHaveValue("改名敌人");
});
test("player picker contains standard conditions but not private definitions", async ({
  page,
}) => {
  await page.getByRole("button", { name: "玩家", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "效果管理", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "给米拉 · 游侠添加状态" }).click();
  await expect(page.locator(".effect-choices").getByRole("button")).toHaveCount(
    20,
  );
  await expect(page.locator(".effect-choices")).not.toContainText("猎手印记");
  await page
    .locator(".effect-choices")
    .getByRole("button", { name: "中毒", exact: true })
    .click();
  const row = page
    .locator(".character")
    .filter({ has: page.getByLabel("米拉 · 游侠名称") });
  await row.getByRole("button", { name: "中毒", exact: true }).hover();
  await expect(row.getByRole("tooltip")).toContainText("攻击检定与属性检定");
  await row.getByRole("button", { name: "中毒", exact: true }).click();
  await row.getByRole("button", { name: "移除", exact: true }).click();
  await expect(row.locator(".status-chip")).toHaveCount(0);
});
test("GM status cannot be removed by player, including exhaustion replacement", async ({
  page,
}) => {
  await page.getByRole("button", { name: "给艾琳 · 战士添加状态" }).click();
  await page
    .locator(".effect-choices")
    .getByRole("button", { name: "力竭 2", exact: true })
    .click();
  await page.getByRole("button", { name: "玩家", exact: true }).click();
  const row = page
    .locator(".character")
    .filter({ has: page.getByLabel("艾琳 · 战士名称") });
  await row.getByRole("button", { name: /力竭 2/ }).hover();
  await expect(
    row
      .getByRole("tooltip")
      .filter({ hasText: "力竭 2" })
      .getByRole("button", { name: "移除" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "给艾琳 · 战士添加状态" }).click();
  await page
    .locator(".effect-choices")
    .getByRole("button", { name: "力竭 3", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("只能由 DM");
});
test("DM creates private effect and cancellation works", async ({ page }) => {
  await page.getByRole("button", { name: "效果管理", exact: true }).click();
  await page.getByRole("button", { name: "新建效果" }).click();
  await page.getByLabel("名称", { exact: true }).fill("测试诅咒");
  await page.getByLabel("具体效果").fill("只用于测试。");
  await page.getByLabel("添加权限").selectOption("gm");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("测试诅咒", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "新建效果" }).click();
  await page.getByLabel("名称", { exact: true }).fill("取消内容");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByText("取消内容", { exact: true })).toHaveCount(0);
});
test("340px screenshot and no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 480 });
  await expect(page.locator(".character")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "qa/v02-compact-dm.png", fullPage: true });
  await page.getByRole("button", { name: "玩家", exact: true }).click();
  await page.screenshot({ path: "qa/v02-compact-player.png", fullPage: true });
});
