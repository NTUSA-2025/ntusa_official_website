import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import { isPublicCaseTableMissing } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function displayDate(value: Date, locale: string) {
  return value.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function PublicCaseManagePage() {
  const [t, locale] = await Promise.all([getTranslations("caseManagement"), getLocale()]);
  let migrationPending = false;
  let cases: Awaited<ReturnType<typeof getCases>> = [];

  try {
    cases = await getCases();
  } catch (error) {
    if (!isPublicCaseTableMissing(error)) throw error;
    migrationPending = true;
  }

  return (
    <section className="case-manager">
      <header className="case-manager-header">
        <div className="case-manager-header-copy">
          <p className="case-eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
        <Link className="btn btn-primary" href="/student-rights/cases/manage/new">
          {t("newCase")}
        </Link>
      </header>

      {migrationPending ? (
        <p className="case-manager-message" role="alert">
          {t("migrationPending")}
        </p>
      ) : null}

      <section className="case-manager-panel case-manager-list-panel">
        <div className="case-manager-section-heading">
          <h2>{t("allCases")}</h2>
          <span>{t("caseCount", { count: cases.length })}</span>
        </div>

        {cases.length ? (
          <div className="case-manager-case-list">
            {cases.map((caseRecord) => {
              const latestProgress = caseRecord.timelineEvents[0]?.publicNote || caseRecord.currentSituation;

              return (
                <Link
                  className="case-manager-case-link"
                  href={`/student-rights/cases/manage/${caseRecord.id}`}
                  key={caseRecord.id}
                >
                  <div className="case-manager-case-row">
                    <strong>{t("caseNumber", { number: caseRecord.number })}</strong>
                    <span className={`case-manager-status ${caseRecord.isPublic ? "public" : ""}`}>
                      {t(caseRecord.isPublic ? "public" : "private")}
                    </span>
                  </div>
                  <h3>{caseRecord.publicSummary}</h3>
                  <p className="case-manager-case-progress">{latestProgress}</p>
                  <div className="case-manager-case-dates">
                    <span>{t("caseDate")}: {displayDate(caseRecord.openedAt, locale)}</span>
                    <span>{t("lastUpdated")}: {displayDate(caseRecord.updatedAt, locale)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="case-manager-empty">
            <p>{t("emptyCases")}</p>
            <Link className="btn btn-outline" href="/student-rights/cases/manage/new">{t("createFirst")}</Link>
          </div>
        )}
      </section>
    </section>
  );
}

function getCases() {
  return prisma.publicCase.findMany({
    include: {
      timelineEvents: {
        orderBy: [{ occurredAt: "desc" as const }, { createdAt: "desc" as const }],
        take: 1,
      },
    },
    orderBy: { number: "desc" },
  });
}
