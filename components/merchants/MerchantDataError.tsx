"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./merchants.module.css";

export default function MerchantDataError() {
  const router = useRouter();
  const t = useTranslations("merchants");
  return (
    <section className={`${styles.page} ${styles.statusPage}`}>
      <div className={styles.container} role="alert">
        <h1>{t("unavailableTitle")}</h1>
        <p>{t("unavailableDescription")}</p>
        <button type="button" className={styles.retry} onClick={() => router.refresh()}>{t("retry")}</button>
      </div>
    </section>
  );
}
