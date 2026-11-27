import "server-only";

import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import { parseMerchantDirectory, todayInTaipei, type MerchantListing, type MerchantSheetRows } from "./merchants";

const RANGES = [
  "'分類'!A:B",
  "'適用對象'!A:B",
  "'優惠店家'!A:F",
  "'優惠內容'!A:J",
];

const getCachedRows = unstable_cache(
  async (spreadsheetId: string): Promise<MerchantSheetRows> => {
    const email = process.env.MERCHANTS_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.MERCHANTS_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
    if (!email || !key) throw new Error("特約商家讀取憑證尚未設定");
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      // Share the specific workbook with this account. Do not impersonate a Workspace admin.
    });
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: RANGES,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    });
    const valueRanges = response.data.valueRanges;
    if (!valueRanges || valueRanges.length !== RANGES.length) {
      throw new Error("特約商家資料表缺少必要分頁");
    }
    const [categories, eligibilities, merchants, offers] = valueRanges.map((range) => range.values ?? []);
    return { categories, eligibilities, merchants, offers };
  },
  ["merchant-directory-rows"],
  { revalidate: 21_600 },
);

export async function getMerchantDirectory(): Promise<MerchantListing[]> {
  const spreadsheetId = process.env.MERCHANTS_SHEET_ID;
  const email = process.env.MERCHANTS_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.MERCHANTS_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!spreadsheetId || !email || !key) throw new Error("特約商家資料來源尚未設定");
  const rows = await getCachedRows(spreadsheetId);
  // Apply expiry at request time, so midnight in Taipei does not depend on cache refresh.
  return parseMerchantDirectory(rows, todayInTaipei());
}
