import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/panel.html");
});

test("decimal initiative sorts and persists without trailing .0", async ({
  page,
}) => {
  await page.getByLabel("艾琳 · 战士先攻", { exact: true }).fill("20");
  await page.getByLabel("艾琳 · 战士先攻", { exact: true }).press("Enter");
  await page.getByLabel("米拉 · 游侠先攻", { exact: true }).fill("20.5");
  await page.getByLabel("米拉 · 游侠先攻", { exact: true }).press("Enter");
  await expect(page.locator(".character-name").first()).toHaveValue(
    "米拉 · 游侠",
  );
  await expect(page.getByLabel("艾琳 · 战士先攻", { exact: true })).toHaveValue(
    "20",
  );
  await page.reload();
  await expect(page.getByLabel("米拉 · 游侠先攻", { exact: true })).toHaveValue(
    "20.5",
  );
  await page.getByLabel("米拉 · 游侠先攻", { exact: true }).fill("20.55");
  await page.getByLabel("米拉 · 游侠先攻", { exact: true }).press("Enter");
  await expect(page.getByRole("alert")).toContainText("最多一位小数");
  await expect(page.getByLabel("米拉 · 游侠先攻", { exact: true })).toHaveValue(
    "20.5",
  );
  await page.getByRole("button", { name: "添加角色", exact: true }).click();
  await page.getByLabel("新角色名称").fill("小数新角色");
  await page.getByLabel("新角色先攻").fill("21.5");
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await expect(page.getByLabel("小数新角色先攻", { exact: true })).toHaveValue(
    "21.5",
  );
  await expect(page.locator(".character-name").first()).toHaveValue(
    "小数新角色",
  );
});

test("DM can reset rounds from the compact toolbar without losing entries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 340, height: 480 });
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "下一个角色", exact: true }).click();
  }
  await expect(page.locator(".round-count")).toHaveText("R2");
  await page.getByRole("button", { name: "重置轮数", exact: true }).click();
  await expect(page.locator(".round-count")).toHaveText("R1");
  await expect(page.locator(".character.active")).toHaveCount(0);
  await expect(page.locator(".character")).toHaveCount(4);
  await expect(page.locator(".status-chip")).toHaveCount(2);
  await expect(page.getByLabel("艾琳 · 战士先攻", { exact: true })).toHaveValue(
    "19",
  );
  await page.screenshot({ path: "qa/v04-reset-dm.png", fullPage: true });
  await page.getByRole("button", { name: "玩家", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "重置轮数", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("DM supplements new builtins without overwriting customized effects", async ({
  page,
}) => {
  await page.getByRole("button", { name: "效果管理", exact: true }).click();
  await page.getByRole("button", { name: "编辑祝福术", exact: true }).click();
  await page.getByLabel("具体效果").fill("DM 自定义祝福说明");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除加速术", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "编辑加速术", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "补全 2014 常见效果", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "编辑加速术", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑祝福术", exact: true }).click();
  await expect(page.getByLabel("具体效果")).toHaveValue("DM 自定义祝福说明");
});

test("toolbar icon has transparent corners and remains visible as a 24px mask", async ({
  page,
}) => {
  const alpha = await page.evaluate(async () => {
    const img = new Image();
    img.src = "/icon.svg";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 24, 24);
    const data = ctx.getImageData(0, 0, 24, 24).data;
    const painted = Array.from(data).filter(
      (value, index) => index % 4 === 3 && value > 0,
    ).length;
    return { corner: data[3], painted };
  });
  expect(alpha.corner).toBe(0);
  expect(alpha.painted).toBeGreaterThan(100);
  expect(alpha.painted).toBeLessThan(24 * 24 * 0.8);
  await page.setViewportSize({ width: 340, height: 180 });
  await page.setContent(
    `<body style="margin:0;background:#36323e;display:flex;align-items:center;justify-content:center;gap:24px;height:180px;color:#f1edf5;font:14px sans-serif"><span style="display:block;width:28px;height:28px;background:#bca3ef;mask:url(http://127.0.0.1:5173/icon.svg) center/contain no-repeat"></span><span style="display:block;width:48px;height:48px;background:#bca3ef;mask:url(http://127.0.0.1:5173/icon.svg) center/contain no-repeat"></span><span>战斗序列</span></body>`,
  );
  await page.screenshot({ path: "qa/v04-icon-mask.png" });
});
