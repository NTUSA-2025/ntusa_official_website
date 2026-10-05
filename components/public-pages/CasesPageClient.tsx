"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HomePublicCase } from "@/lib/get-cached-public-cases";
import { useFadeUp } from "./useFadeUp";

export default function CasesPageClient({ publicCases }: { publicCases: HomePublicCase[] }) {
  const locale = useLocale();
  const tCases = useTranslations("home.cases");
  const [expandedCases, setExpandedCases] = useState<Set<string>>(() => new Set());
  useFadeUp([locale]);

  const toggleCaseTimeline = (id: string) => {
    setExpandedCases((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="page">
      <div className="page-hero-mini">
        <div className="page-hero-mini-content">
          <h1 className="page-title">{tCases("title")}</h1>
          <p className="page-desc">{tCases("desc")}</p>
        </div>
      </div>
      <div className="section-wrap">
        {publicCases.length === 0 ? (
          <div className="case-empty fade-up-target">{tCases("empty")}</div>
        ) : (
          <div className="case-list">
            {publicCases.map((caseRecord) => {
              const expanded = expandedCases.has(caseRecord.id);
              const openedAt = new Date(caseRecord.openedAt).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              });
              const updatedAt = new Date(caseRecord.updatedAt).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              });

              return (
                <article className="case-card fade-up-target" key={caseRecord.id}>
                  <div className="case-card-meta">
                    <span>#{caseRecord.number}</span>
                  </div>
                  <h2>{caseRecord.publicSummary}</h2>
                  <p className="case-current-situation">{caseRecord.currentSituation}</p>
                  <div className="case-card-footer">
                    <span>
                      {tCases("openedAt", { date: openedAt })} · {tCases("updatedAt", { date: updatedAt })}
                    </span>
                    <button
                      type="button"
                      className="case-link"
                      aria-expanded={expanded}
                      aria-controls={`case-timeline-${caseRecord.id}`}
                      onClick={() => toggleCaseTimeline(caseRecord.id)}
                    >
                      {expanded ? tCases("hideTimeline") : tCases("showTimeline")}{" "}
                      <span aria-hidden="true">{expanded ? "↑" : "→"}</span>
                    </button>
                  </div>
                  {expanded && (
                    <div id={`case-timeline-${caseRecord.id}`} className="case-public-timeline">
                      {caseRecord.timelineEvents.length ? (
                        <ol className="case-timeline">
                          {caseRecord.timelineEvents.map((event) => (
                            <li key={event.id}>
                              <time dateTime={event.occurredAt}>
                                {new Date(event.occurredAt).toLocaleDateString(locale, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  timeZone: "UTC",
                                })}
                              </time>
                              <div>
                                <p>{event.publicNote}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="case-empty">{tCases("emptyTimeline")}</p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
