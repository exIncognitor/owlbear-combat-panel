import { test, expect } from "@playwright/test";

test("homepage install link copies the current origin and keeps the panel separate", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "战斗有序",
  );
  await expect(page.locator("iframe")).toHaveAttribute("src", "/panel.html");
  await expect(page.getByLabel("插件安装链接")).toHaveValue(
    "http://127.0.0.1:5173/manifest.json",
  );
  await page.getByRole("link", { name: "安装到 Owlbear", exact: true }).click();
  await expect(page).toHaveURL(/#install$/);
  await page.locator("#copy-manifest").click();
  await expect(page.locator("#copy-feedback")).toContainText("已复制");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "http://127.0.0.1:5173/manifest.json",
  );
});

for (const width of [1440, 390]) {
  test(`homepage at ${width}px has no horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `qa/home-${width}.png`, fullPage: true });
  });
}
