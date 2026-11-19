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

export default async function PublicCaseManagePage({ searchParams }: { searchParams: Promise<{ tag?: string | string[] }> }) {
  const [t, locale, query] = await Promise.all([getTranslations("caseManagement"), getLocale(), searchParams]);
  let migrationPending = false;
  let cases: Awaited<ReturnType<typeof getCases>> = [];
  let tags: { id: string; name: string }[] = [];
  let selectedTag = "";

  try {
    tags = await prisma.caseTag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
    selectedTag = typeof query.tag === "string" && tags.some(({ id }) => id === query.tag) ? query.tag : "";
    cases = await getCases(selectedTag);
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
          <span>{migrationPending ? t("casesUnavailable") : t("caseCount", { count: cases.length })}</span>
        </div>

        <form className="case-tag-filter" action="/student-rights/cases/manage" method="get">
          <label htmlFor="manage-case-tag">{t("filterByTag")}</label>
          <select id="manage-case-tag" name="tag" defaultValue={selectedTag} disabled={migrationPending || tags.length === 0}>
            <option value="">{t("allTags")}</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
          <button className="btn btn-outline" type="submit" disabled={migrationPending || tags.length === 0}>{t("applyFilter")}</button>
          {!migrationPending && tags.length === 0 ? <span>{t("filterUnavailable")}</span> : null}
        </form>

        {migrationPending ? (
          <p className="case-tag-hint">{t("casesUnavailable")}</p>
        ) : cases.length ? (
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
                  {caseRecord.tags.length > 0 ? (
                    <div className="case-tags" aria-label={t("tags")}>
                      {caseRecord.tags.map((tag) => <span className="case-tag" key={tag.id}>{tag.name}</span>)}
                    </div>
                  ) : null}
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
            <p>{selectedTag ? t("noMatchingCases") : t("emptyCases")}</p>
            {selectedTag
              ? <Link className="btn btn-outline" href="/student-rights/cases/manage">{t("allTags")}</Link>
              : <Link className="btn btn-outline" href="/student-rights/cases/manage/new">{t("createFirst")}</Link>}
          </div>
        )}
      </section>
    </section>
  );
}

function getCases(tagId: string) {
  return prisma.publicCase.findMany({
    include: {
      tags: { orderBy: { name: "asc" as const } },
      timelineEvents: {
        orderBy: [{ occurredAt: "desc" as const }, { createdAt: "desc" as const }],
        take: 1,
      },
    },
    where: tagId ? { tags: { some: { id: tagId } } } : undefined,
    orderBy: { number: "desc" },
  });
}
