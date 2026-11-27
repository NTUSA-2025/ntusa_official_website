export interface LocalizedText {
  zh: string;
  en: string | null;
}

export interface MerchantOffer {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  eligibility: LocalizedText | null;
  limitations: LocalizedText | null;
  dueDate: string | null;
}

export interface MerchantListing {
  id: string;
  name: LocalizedText;
  category: LocalizedText | null;
  mapsUrl: string | null;
  offers: MerchantOffer[];
}

export interface MerchantSheetRows {
  categories: unknown[][];
  eligibilities: unknown[][];
  merchants: unknown[][];
  offers: unknown[][];
}

function cellText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rowId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const number = Number(value.trim());
    return Number.isSafeInteger(number) && number > 0 ? String(number) : null;
  }
  return null;
}

function isPublished(value: unknown): boolean {
  return value === true || value === "TRUE" || value === "已上架";
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseSheetDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }
  const text = cellText(value);
  return isValidIsoDate(text) ? text : undefined;
}

export function todayInTaipei(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function safeMapsUrl(value: unknown): string | null {
  const text = cellText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (hostname !== "maps.app.goo.gl" && hostname !== "maps.google.com" && !(hostname === "www.google.com" && url.pathname.startsWith("/maps"))) return null;
    return url.href;
  } catch {
    return null;
  }
}

function records(rows: unknown[][], required: string[], sheetName: string): Record<string, unknown>[] {
  const header = rows[0]?.map(cellText) ?? [];
  for (const name of required) {
    if (!header.includes(name)) throw new Error(`特約商家資料表「${sheetName}」缺少 ${name} 欄位`);
  }
  // The exported template uses row 1 for machine names and row 2 for Chinese guidance.
  return rows.slice(2).map((row) => Object.fromEntries(header.map((name, index) => [name, row[index]])));
}

function localized(zh: unknown, en: unknown): LocalizedText | null {
  const primary = cellText(zh);
  return primary ? { zh: primary, en: cellText(en) || null } : null;
}

export function displayText(value: LocalizedText, locale: string): string {
  return locale === "en" ? value.en || value.zh : value.zh;
}

export function parseMerchantDirectory(rows: MerchantSheetRows, today = todayInTaipei()): MerchantListing[] {
  const categoryNames = new Map<string, LocalizedText>();
  for (const row of records(rows.categories, ["category_zh", "category_en"], "分類")) {
    const value = localized(row.category_zh, row.category_en);
    if (value) categoryNames.set(value.zh, value);
  }

  const eligibilityNames = new Map<string, LocalizedText>();
  for (const row of records(rows.eligibilities, ["eligibility_zh", "eligibility_en"], "適用對象")) {
    const value = localized(row.eligibility_zh, row.eligibility_en);
    if (value) eligibilityNames.set(value.zh, value);
  }

  const merchants = new Map<string, MerchantListing>();
  const merchantRows = records(rows.merchants, ["mer_id", "gmaps_link", "name", "name_en", "category", "publish_status"], "優惠店家");
  const knownMerchantIds = new Set(merchantRows.filter((row) => cellText(row.name)).map((row) => rowId(row.mer_id)).filter((id): id is string => Boolean(id)));
  merchantRows.forEach((row, index) => {
    if (!isPublished(row.publish_status)) return;
    const id = rowId(row.mer_id);
    const name = localized(row.name, row.name_en);
    if (!id || !name || merchants.has(id)) {
      console.warn(`[Merchants] Skipping invalid or duplicate merchant at row ${index + 3}`);
      return;
    }
    const category = cellText(row.category);
    merchants.set(id, {
      id,
      name,
      category: category ? categoryNames.get(category) ?? { zh: category, en: null } : null,
      mapsUrl: safeMapsUrl(row.gmaps_link),
      offers: [],
    });
  });

  const offerRows = records(rows.offers, ["mer_id", "title", "title_en", "desc", "desc_en", "eligibility", "limitations", "limitations_en", "due_date", "publish_status"], "優惠內容");
  offerRows.forEach((row, index) => {
    if (!isPublished(row.publish_status)) return;
    const id = rowId(row.mer_id);
    const merchant = id ? merchants.get(id) : undefined;
    const title = localized(row.title, row.title_en);
    const description = localized(row.desc, row.desc_en);
    const dueDate = parseSheetDate(row.due_date);
    if (id && knownMerchantIds.has(id) && !merchant) return;
    if (!merchant || !title || !description || dueDate === undefined) {
      console.warn(`[Merchants] Skipping invalid or orphaned offer at row ${index + 3}`);
      return;
    }
    if (dueDate && dueDate < today) return;
    const eligibility = cellText(row.eligibility);
    merchant.offers.push({
      id: `${id}:${index + 3}`,
      title,
      description,
      eligibility: eligibility ? eligibilityNames.get(eligibility) ?? { zh: eligibility, en: null } : null,
      limitations: localized(row.limitations, row.limitations_en),
      dueDate,
    });
  });

  return [...merchants.values()].filter((merchant) => merchant.offers.length > 0);
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase().replaceAll("台", "臺");
}

export function searchMerchants(listings: MerchantListing[], query: string, category: string | null): MerchantListing[] {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return listings.filter((listing) => {
    if (category && listing.category?.zh !== category) return false;
    const text = normalizeSearch([
      listing.name.zh, listing.name.en, listing.category?.zh, listing.category?.en,
      ...listing.offers.flatMap((offer) => [
        offer.title.zh, offer.title.en, offer.description.zh, offer.description.en,
        offer.eligibility?.zh, offer.eligibility?.en,
      ]),
    ].filter(Boolean).join("\n"));
    return terms.every((term) => text.includes(term));
  });
}
