"use client";

import { useTranslations } from "next-intl";
import styles from "@/components/merchants/merchants.module.css";

export default function MerchantsLoading() {
  const t = useTranslations("merchants");
  return (
    <section className={`${styles.page} ${styles.statusPage}`} role="status" aria-live="polite">
      <div className={styles.container}>
        <h1>{t("title")}</h1>
        <p>{t("loading")}</p>
      </div>
    </section>
  );
}
