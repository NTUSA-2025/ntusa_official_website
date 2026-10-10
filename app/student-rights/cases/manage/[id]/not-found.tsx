import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function PublicCaseNotFound() {
  const t = await getTranslations("caseManagement");
  return (
    <section className="case-manager">
      <Link className="case-manager-back" href="/student-rights/cases/manage">
        {t("back")}
      </Link>
      <div className="case-manager-panel">
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundDescription")}</p>
      </div>
    </section>
  );
}
