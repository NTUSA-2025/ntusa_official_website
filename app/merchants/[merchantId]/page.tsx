import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import MerchantDataError from "@/components/merchants/MerchantDataError";
import { getMerchantDirectory } from "@/lib/get-merchant-directory";
import { displayText } from "@/lib/merchants";
import styles from "@/components/merchants/merchants.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("merchants");
  return { title: t("metaTitle") };
}

export default async function MerchantPage({ params }: { params: Promise<{ merchantId: string }> }) {
  await connection();
  const { merchantId } = await params;
  const [t, locale] = await Promise.all([getTranslations("merchants"), getLocale()]);
  let listings;
  try {
    listings = await getMerchantDirectory();
  } catch (error) {
    console.error("無法讀取特約商家資料:", error instanceof Error ? error.message : "unknown error");
    return <MerchantDataError />;
  }
  const listing = listings.find((item) => item.id === merchantId);
  if (!listing) {
    return (
      <section className={`${styles.page} ${styles.statusPage}`}>
        <div className={styles.container}>
          <h1>{t("notFoundTitle")}</h1>
          <p>{t("notFoundDescription")}</p>
          <Link className={styles.backLink} href="/merchants">{t("backToList")}</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.detailHero}>
        <div className={styles.container}>
          <Link className={styles.heroBack} href="/merchants">← {t("backToList")}</Link>
          {listing.category && <span className={styles.detailCategory}>{displayText(listing.category, locale)}</span>}
          <h1>{displayText(listing.name, locale)}</h1>
          <p>{t("detailIntro")}</p>
        </div>
      </div>
      <div className={`${styles.container} ${styles.detailBody}`}>
        <div className={styles.detailMain}>
          <h2>{t("offersTitle")}</h2>
          {listing.offers.map((offer) => (
            <article className={styles.detailOffer} key={offer.id}>
              <h3>{displayText(offer.title, locale)}</h3>
              <p className={styles.detailDescription}>{displayText(offer.description, locale)}</p>
              <dl className={styles.offerFacts}>
                <div><dt>{t("eligibility")}</dt><dd>{offer.eligibility ? displayText(offer.eligibility, locale) : t("pending")}</dd></div>
                <div><dt>{t("limitations")}</dt><dd>{offer.limitations ? displayText(offer.limitations, locale) : t("pending")}</dd></div>
                <div><dt>{t("dueDate")}</dt><dd>{offer.dueDate ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-TW", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${offer.dueDate}T00:00:00Z`)) : t("datePending")}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <aside className={styles.detailAside}>
          <h2>{t("visitTitle")}</h2>
          {listing.mapsUrl ? <a href={listing.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>{t("openMaps")} ↗</a> : <p>{t("locationPending")}</p>}
          <p className={styles.disclaimer}>{t("disclaimer")}</p>
        </aside>
      </div>
    </section>
  );
}
