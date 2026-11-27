"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { displayText, searchMerchants, type MerchantListing } from "@/lib/merchants";
import styles from "./merchants.module.css";

export default function MerchantDirectoryPageClient({
  listings,
  locale,
}: {
  listings: MerchantListing[];
  locale: string;
}) {
  const t = useTranslations("merchants");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(() => [...new Map(listings.flatMap((listing) => listing.category ? [[listing.category.zh, listing.category] as const] : [])).values()], [listings]);
  const results = useMemo(() => searchMerchants(listings, query, category), [listings, query, category]);

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>{t("eyebrow")}</span>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.intro}>{t("intro")}</p>
          <label className={styles.searchLabel} htmlFor="merchant-search">{t("searchLabel")}</label>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>
            <input
              id="merchant-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className={styles.container}>
        {listings.length > 0 && categories.length > 0 && (
          <div className={styles.filters} role="group" aria-label={t("categoryLabel")}>
            <button type="button" className={category === null ? styles.filterActive : styles.filter} aria-pressed={category === null} onClick={() => setCategory(null)}>{t("allCategories")}</button>
            {categories.map((item) => (
              <button key={item.zh} type="button" className={category === item.zh ? styles.filterActive : styles.filter} aria-pressed={category === item.zh} onClick={() => setCategory(item.zh)}>{displayText(item, locale)}</button>
            ))}
          </div>
        )}

        <div className={styles.resultsHeading}>
          <h2>{t("resultsTitle")}</h2>
          <span aria-live="polite">{t("resultCount", { count: results.length })}</span>
        </div>

        {results.length === 0 ? (
          <div className={styles.empty}>
            <p>{listings.length === 0 ? t("noPublished") : t("noResults")}</p>
            {listings.length > 0 && <button type="button" onClick={() => { setQuery(""); setCategory(null); }}>{t("clearFilters")}</button>}
          </div>
        ) : (
          <ul className={styles.grid}>
            {results.map((listing) => {
              const mainOffer = listing.offers[0];
              return (
                <li key={listing.id}>
                  <Link className={styles.card} href={`/merchants/${encodeURIComponent(listing.id)}`}>
                    <div className={styles.cardTop}>
                      <span className={styles.storeIcon} aria-hidden="true">✦</span>
                      {listing.category && <span className={styles.category}>{displayText(listing.category, locale)}</span>}
                    </div>
                    <h3>{displayText(listing.name, locale)}</h3>
                    <div className={styles.offerSummary}>
                      <span>{t("primaryOffer")}</span>
                      <strong>{displayText(mainOffer.title, locale)}</strong>
                      <p>{displayText(mainOffer.description, locale)}</p>
                    </div>
                    <div className={styles.cardBottom}>
                      <span>{listing.offers.length > 1 ? t("moreOffers", { count: listing.offers.length - 1 }) : ""}</span>
                      <span>{t("viewDetails")} <span aria-hidden="true">→</span></span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
