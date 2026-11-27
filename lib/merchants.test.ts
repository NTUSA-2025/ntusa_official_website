import { describe, expect, it, vi } from "vitest";
import { displayText, parseMerchantDirectory, parseSheetDate, searchMerchants, todayInTaipei, type MerchantSheetRows } from "./merchants";

function sampleRows(): MerchantSheetRows {
  return {
    categories: [
      ["category_zh", "category_en"], ["分類", "分類英文名稱"], ["餐飲", "Dining"],
    ],
    eligibilities: [
      ["eligibility_zh", "eligibility_en"], ["適用對象", "適用對象_英文"], ["學生", "Students"],
    ],
    merchants: [
      ["mer_id", "gmaps_link", "name", "name_en", "category", "publish_status"],
      ["店家流水號", "地圖連結", "店家名稱_中文", "店家名稱_英文", "分類", "上架狀態"],
      [1, "https://maps.app.goo.gl/example", "花甲書店", "Flower Armor Books", "餐飲", true],
      [2, "javascript:alert(1)", "未上架商家", "", "餐飲", false],
    ],
    offers: [
      ["mer_id", "title", "title_en", "desc", "desc_en", "eligibility", "limitations", "limitations_en", "due_date", "publish_status"],
      ["店家流水號", "優惠標題_中文", "優惠標題_英文", "完整優惠內容_中文", "完整優惠內容_英文", "適用對象", "使用限制_中文", "使用限制_英文", "優惠到期日", "上架狀態"],
      [1, "學生定食85折", "15% off meals", "出示學生證", "Show student ID", "學生", "平日", "Weekdays", 46387, true],
      [1, "書籍9折", "", "購書優惠", "", "學生", "", "", null, true],
      [1, "過期優惠", "Expired", "不可用", "", "學生", "", "", "2026-01-01", true],
      [2, "未上架店家優惠", "", "不可用", "", "學生", "", "", null, true],
      [1, "未上架優惠", "", "不可用", "", "學生", "", "", null, false],
    ],
  };
}

describe("merchant sheet conversion", () => {
  it("joins by merchant ID, excludes unpublished and expired rows, and maps English values", () => {
    const listings = parseMerchantDirectory(sampleRows(), "2026-11-20");
    expect(listings).toHaveLength(1);
    expect(listings[0].offers).toHaveLength(2);
    expect(listings[0].category).toEqual({ zh: "餐飲", en: "Dining" });
    expect(listings[0].offers[0].eligibility).toEqual({ zh: "學生", en: "Students" });
    expect(listings[0].offers[0].dueDate).toBe("2026-12-31");
    expect(displayText(listings[0].offers[1].title, "en")).toBe("書籍9折");
  });

  it("rejects missing headers, duplicate IDs, orphaned offers, and invalid dates", () => {
    const rows = sampleRows();
    rows.merchants.push([1, "", "重複商家", "", "餐飲", true]);
    rows.offers.push([1, "錯誤日期", "", "無效", "", "學生", "", "", "2026-02-30", true]);
    rows.offers.push([999, "孤立優惠", "", "無效", "", "學生", "", "", null, true]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(parseMerchantDirectory(rows, "2026-11-20")).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(3);
    } finally {
      warn.mockRestore();
    }
    rows.categories[0] = ["wrong", "category_en"];
    expect(() => parseMerchantDirectory(rows)).toThrow("category_zh");
  });

  it("keeps blank expiry as pending and accepts only safe Google Maps URLs", () => {
    const rows = sampleRows();
    rows.merchants[2][1] = "https://example.com/phishing";
    const [listing] = parseMerchantDirectory(rows, "2026-11-20");
    expect(listing.mapsUrl).toBeNull();
    expect(listing.offers[1].dueDate).toBeNull();
    expect(parseSheetDate("2026-02-30")).toBeUndefined();
  });

  it("searches Chinese and English content with a category filter", () => {
    const listings = parseMerchantDirectory(sampleRows(), "2026-11-20");
    expect(searchMerchants(listings, "15% MEALS", "餐飲")).toHaveLength(1);
    expect(searchMerchants(listings, "台", "餐飲")).toHaveLength(0);
    expect(searchMerchants(listings, "books", "書店")).toHaveLength(0);
  });

  it("uses the Taipei calendar day", () => {
    expect(todayInTaipei(new Date("2026-11-19T16:30:00Z"))).toBe("2026-11-20");
  });
});
