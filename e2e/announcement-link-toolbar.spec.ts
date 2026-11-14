import { expect, test } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test("link button follows the caret and edits display text and URL", async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: { email: "editor@ntusa.ntu.edu.tw", role: "editor", department: "資訊部" },
      expires: "2099-01-01T00:00:00.000Z",
    }),
  }));

  await page.goto(`${BASE}/editor`);
  const content = page.locator('[contenteditable="true"]').first();
  await expect(content).toBeVisible();
  await content.fill("活動詳情");
  await content.press("ControlOrMeta+A");
  await page.getByRole("button", { name: "粗體" }).click();

  await page.getByRole("button", { name: "插入連結" }).click();
  await page.getByRole("textbox", { name: "連結網址" }).fill("https://example.com/event");
  await page.getByRole("textbox", { name: "連結網址" }).press("Enter");

  await expect(page.locator("#editor-link-panel")).toHaveCount(0);
  await expect(content.locator('a[href="https://example.com/event"]')).toHaveText("活動詳情");
  await expect(page.getByRole("button", { name: "插入連結" })).toBeVisible();

  await content.press("ArrowLeft");
  await expect(page.getByRole("button", { name: "編輯連結" })).toBeVisible();

  await page.getByRole("button", { name: "編輯連結" }).click();
  const displayText = page.getByRole("textbox", { name: "顯示文字", exact: true });
  await expect(displayText).toHaveValue("活動詳情");
  await displayText.fill("更新後的活動詳情");
  await page.getByRole("textbox", { name: "連結網址" }).fill("https://example.com/updated");
  await displayText.press("Enter");

  await expect(content.locator('a[href="https://example.com/updated"]')).toHaveText("更新後的活動詳情");
  await expect(content.locator("strong")).toContainText("更新後的活動詳情");
  await expect(page.getByRole("button", { name: "插入連結" })).toBeVisible();

  await expect(content).toBeFocused();
  await content.press("ArrowLeft");
  await expect(page.getByRole("button", { name: "編輯連結" })).toBeVisible();
  await page.getByRole("button", { name: "編輯連結" }).click();
  await expect(displayText).toHaveValue("更新後的活動詳情");
  await page.getByRole("textbox", { name: "連結網址" }).fill("https://example.com/final");
  await page.getByRole("textbox", { name: "連結網址" }).press("Enter");
  await expect(content.locator('a[href="https://example.com/final"]')).toHaveText("更新後的活動詳情");
  await expect(content).toBeFocused();
  await content.press("ArrowRight");
  await expect(page.getByRole("button", { name: "插入連結" })).toBeVisible();

  await content.press("Enter");
  await page.getByRole("button", { name: "插入連結" }).click();
  await page.getByRole("textbox", { name: "連結網址" }).fill("https://example.com/second");
  await page.getByRole("textbox", { name: "連結網址" }).press("Enter");

  await expect(content.locator('a[href="https://example.com/second"]')).toHaveText("https://example.com/second");
  await expect(page.getByRole("button", { name: "插入連結" })).toBeVisible();
});
