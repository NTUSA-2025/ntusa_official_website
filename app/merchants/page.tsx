import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import MerchantDirectoryPageClient from "@/components/merchants/MerchantDirectoryPageClient";
import MerchantDataError from "@/components/merchants/MerchantDataError";
import { getMerchantDirectory } from "@/lib/get-merchant-directory";
import type { MerchantListing } from "@/lib/merchants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("merchants");
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function MerchantsPage() {
  await connection();
  let listings: MerchantListing[];
  let locale: string;
  try {
    [listings, locale] = await Promise.all([getMerchantDirectory(), getLocale()]);
  } catch (error) {
    console.error("無法讀取特約商家資料:", error instanceof Error ? error.message : "unknown error");
    return <MerchantDataError />;
  }
  return <MerchantDirectoryPageClient listings={listings} locale={locale} />;
}
