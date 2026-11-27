import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { batchGet } = vi.hoisted(() => ({ batchGet: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock("googleapis", () => ({
  google: {
    auth: { JWT: class {} },
    sheets: () => ({ spreadsheets: { values: { batchGet } } }),
  },
}));

describe("getMerchantDirectory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCHANTS_SHEET_ID = "sheet-123";
    process.env.MERCHANTS_SERVICE_ACCOUNT_EMAIL = "sheets@example.iam.gserviceaccount.com";
    process.env.MERCHANTS_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nKEY\\n-----END PRIVATE KEY-----";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when merchant sheet environment variables are missing", async () => {
    delete process.env.MERCHANTS_SHEET_ID;
    const { getMerchantDirectory } = await import("./get-merchant-directory");
    await expect(getMerchantDirectory()).rejects.toThrow("特約商家資料來源尚未設定");
  });

  it("throws when Google Sheets response is missing required tabs", async () => {
    batchGet.mockResolvedValueOnce({ data: { valueRanges: [{ values: [] }] } });
    const { getMerchantDirectory } = await import("./get-merchant-directory");
    await expect(getMerchantDirectory()).rejects.toThrow("特約商家資料表缺少必要分頁");
  });

  it("parses valid Google Sheets batchGet rows into merchant listings", async () => {
    batchGet.mockResolvedValueOnce({
      data: {
        valueRanges: [
          { values: [["category_zh", "category_en"], ["分類", "英文"], ["餐飲", "Dining"]] },
          { values: [["eligibility_zh", "eligibility_en"], ["對象", "英文"], ["學生", "Students"]] },
          {
            values: [
              ["mer_id", "gmaps_link", "name", "name_en", "category", "publish_status"],
              ["編號", "地圖", "店名", "英文", "分類", "狀態"],
              [1, "https://maps.app.goo.gl/test", "測試餐廳", "Test Bistro", "餐飲", true],
            ],
          },
          {
            values: [
              ["mer_id", "title", "title_en", "desc", "desc_en", "eligibility", "limitations", "limitations_en", "due_date", "publish_status"],
              ["編號", "標題", "英文", "內容", "英文", "對象", "限制", "英文", "到期", "狀態"],
              [1, "9折優惠", "10% off", "出示學生證", "Show ID", "學生", "", "", null, true],
            ],
          },
        ],
      },
    });

    const { getMerchantDirectory } = await import("./get-merchant-directory");
    const listings = await getMerchantDirectory();

    expect(listings).toHaveLength(1);
    expect(listings[0].name).toEqual({ zh: "測試餐廳", en: "Test Bistro" });
    expect(listings[0].offers).toHaveLength(1);
  });
});
