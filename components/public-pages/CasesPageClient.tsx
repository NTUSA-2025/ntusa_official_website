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
              const latestEvent = caseRecord.timelineEvents[0];
              const earlierEvents = caseRecord.timelineEvents.slice(1);

              return (
                <article className="case-card fade-up-target" key={caseRecord.id}>
                  <div className="case-card-meta">
                    <span>#{caseRecord.number}</span>
                  </div>
                  <h2>{caseRecord.publicSummary}</h2>
                  {latestEvent ? (
                    <div className={`case-timeline-layout ${expanded ? "expanded" : ""}`}>
                      <ol className="case-timeline case-timeline-latest">
                        <li>
                          <div className="case-timeline-heading">
                            <time dateTime={latestEvent.occurredAt}>
                              {new Date(latestEvent.occurredAt).toLocaleDateString(locale, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                timeZone: "UTC",
                              })}
                            </time>
                            {earlierEvents.length > 0 && (
                              <button
                                type="button"
                                className="case-link"
                                aria-expanded={expanded}
                                aria-controls={`case-timeline-${caseRecord.id}`}
                                onClick={() => toggleCaseTimeline(caseRecord.id)}
                              >
                                {expanded ? tCases("hideTimeline") : tCases("showTimeline")}{" "}
                                <span className={`case-link-chevron ${expanded ? "open" : ""}`} aria-hidden="true">⌄</span>
                              </button>
                            )}
                          </div>
                          <p>{latestEvent.publicNote}</p>
                        </li>
                      </ol>
                      {earlierEvents.length > 0 && (
                        <div
                          id={`case-timeline-${caseRecord.id}`}
                          className={`case-public-timeline ${expanded ? "open" : ""}`}
                          aria-hidden={!expanded}
                        >
                          <div className="case-public-timeline-inner">
                            <ol className="case-timeline case-timeline-history">
                              {earlierEvents.map((event) => (
                                <li key={event.id}>
                                  <time dateTime={event.occurredAt}>
                                    {new Date(event.occurredAt).toLocaleDateString(locale, {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      timeZone: "UTC",
                                    })}
                                  </time>
                                  <p>{event.publicNote}</p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="case-empty-timeline">{tCases("emptyTimeline")}</p>
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
