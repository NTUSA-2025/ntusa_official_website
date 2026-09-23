import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("LocaleSwitcher E2E", () => {
  test("1. Default landing — zh-TW", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang, "html[lang] should be zh-TW").toBe("zh-TW");

    const title = await page.title();
    expect(title, "document title").toContain("臺大學生會官網");

    const h1 = page.locator("h1").first();
    await expect(h1, "hero h1").toContainText("臺大學生會");

    await expect(
      page.locator("nav").first(),
      "navbar should contain 首頁"
    ).toContainText("首頁");

    // Scope to the desktop navbar switcher; the drawer-variant switcher
    // is also in the DOM at all times (drawer hides via transform, not display).
    const zhBtn = page
      .locator('.locale-switcher--desktop button[aria-pressed="true"]')
      .first();
    await expect(zhBtn, "中 button should be aria-pressed=true").toBeVisible();
    const label = await zhBtn.textContent();
    expect(label?.trim(), "active button label").toBe("中");
  });

  test("2. Click EN — switches to English", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    const enBtn = page
      .locator(".locale-switcher button")
      .filter({ hasText: "EN" })
      .first();
    await expect(enBtn).toBeVisible();
    await enBtn.click();

    // Wait for router.refresh to complete
    await page.waitForFunction(() => {
      return document.documentElement.getAttribute("lang") === "en";
    }, { timeout: 8000 });

    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang, "html[lang] after EN click").toBe("en");

    await expect(
      page.locator("nav").first(),
      "navbar should show Home"
    ).toContainText("Home");
    await expect(
      page.locator("nav").first(),
      "navbar should NOT show 首頁"
    ).not.toContainText("首頁");

    const h1 = page.locator("h1").first();
    await expect(h1, "hero h1 in English").toContainText(
      "NTU Student Association"
    );

    const enPressed = page
      .locator(".locale-switcher button")
      .filter({ hasText: "EN" })
      .first();
    await expect(enPressed, "EN button aria-pressed=true").toHaveAttribute(
      "aria-pressed",
      "true"
    );

    const zhBtn = page
      .locator(".locale-switcher button")
      .filter({ hasText: "中" })
      .first();
    await expect(zhBtn, "中 button aria-pressed=false").toHaveAttribute(
      "aria-pressed",
      "false"
    );

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie, "NEXT_LOCALE cookie exists").toBeDefined();
    expect(localeCookie?.value, "NEXT_LOCALE cookie value").toBe("en");
    expect(localeCookie?.sameSite, "NEXT_LOCALE SameSite").toBe("Strict");
  });

  test("3. Click 中 — switches back to Chinese", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // First switch to EN
    const enBtn = page
      .locator(".locale-switcher button")
      .filter({ hasText: "EN" })
      .first();
    await enBtn.click();
    await page.waitForFunction(() => {
      return document.documentElement.getAttribute("lang") === "en";
    }, { timeout: 8000 });

    // Now switch back to 中
    const zhBtn = page
      .locator(".locale-switcher button")
      .filter({ hasText: "中" })
      .first();
    await zhBtn.click();
    await page.waitForFunction(() => {
      return document.documentElement.getAttribute("lang") === "zh-TW";
    }, { timeout: 8000 });

    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang, "html[lang] should revert to zh-TW").toBe("zh-TW");

    await expect(
      page.locator("nav").first(),
      "navbar should show 首頁 again"
    ).toContainText("首頁");

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value, "NEXT_LOCALE cookie value").toBe("zh-TW");
    expect(localeCookie?.sameSite, "NEXT_LOCALE SameSite").toBe("Strict");
  });

  test("4. Reload persists EN locale", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });

    const h1 = page.locator("h1").first();
    await expect(h1, "hero h1 after reload").toContainText(
      "NTU Student Association"
    );
  });

  test("5. /campus-tools honors NEXT_LOCALE=en cookie", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(`${BASE}/campus-tools`, { waitUntil: "networkidle" });

    const h1 = page.locator("h1").first();
    await expect(h1, "campus-tools h1 in English").toContainText(
      "Campus Tools Built by Students"
    );
    await expect(h1, "campus-tools h1 should NOT be Chinese").not.toContainText(
      "學生打造的校園工具"
    );
  });

  test("6. Mobile drawer switcher flips locale", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Open hamburger — aria-label is locale-dependent, try both
    const hamburger = page
      .locator('button[aria-label="開啟選單"], button[aria-label="Open menu"]')
      .first();
    await expect(hamburger, "hamburger button visible").toBeVisible();
    await hamburger.click();

    // Drawer should open and show the drawer variant switcher
    const drawerSwitcher = page.locator(".locale-switcher--drawer");
    await expect(drawerSwitcher, "drawer locale-switcher visible").toBeVisible();

    // Click EN inside the drawer
    const enBtnDrawer = drawerSwitcher
      .locator("button")
      .filter({ hasText: "EN" });
    await enBtnDrawer.click();

    // Drawer hides via transform: translateX(100%), so the element stays
    // in the DOM with a non-zero bounding box. Assert on the .open class
    // dropping from .drawer instead of toBeHidden() on the switcher.
    await expect(
      page.locator(".drawer"),
      "drawer should lose .open class after switch (onSwitch=closeDrawer)"
    ).not.toHaveClass(/\bopen\b/, { timeout: 5000 });

    // Locale should flip
    await page.waitForFunction(() => {
      return document.documentElement.getAttribute("lang") === "en";
    }, { timeout: 8000 });

    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang, "html[lang] after drawer EN click").toBe("en");
  });

  test("7. English navigation keeps the bilingual brand name", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(BASE, { waitUntil: "networkidle" });

    const desktopBrand = page.locator("header .logo-text");
    await expect(desktopBrand.locator(".logo-title")).toHaveText(
      "國立臺灣大學學生會"
    );
    await expect(desktopBrand.locator(".logo-sub")).toHaveText(
      "NTU Student Association"
    );

    await page.setViewportSize({ width: 375, height: 800 });
    const hamburger = page.locator('button[aria-label="Open menu"]');
    await expect(hamburger, "mobile menu button").toBeVisible();
    await hamburger.click();

    const drawerBrand = page.locator(".drawer .logo-text");
    await expect(drawerBrand.locator(".logo-title")).toHaveText(
      "國立臺灣大學學生會"
    );
    await expect(drawerBrand.locator(".logo-sub")).toHaveText(
      "NTU Student Association"
    );
  });
});
