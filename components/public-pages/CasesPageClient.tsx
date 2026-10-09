"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HomePublicCase } from "@/lib/get-cached-public-cases";
import { useFadeUp } from "./useFadeUp";

function CaseContactLinks() {
  const tCases = useTranslations("home.cases");

  return (
    <address className="case-contact">
      <a href="mailto:studentrights@ntusa.ntu.edu.tw">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5.5h18v13H3z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
        <span>{tCases("emailLabel")}：studentrights@ntusa.ntu.edu.tw</span>
      </a>
      <a href="https://line.me/R/ti/p/%40ntusa" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="case-contact-line-icon">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
        <span>{tCases("lineLabel")}：@ntusa</span>
      </a>
    </address>
  );
}

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
          <CaseContactLinks />
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

        <div className="case-contact-cta fade-up-target">
          <p className="case-contact-cta-title">{tCases("contactPrompt")}</p>
          <p>{tCases("contactInvitation")}</p>
          <CaseContactLinks />
        </div>
      </div>
    </section>
  );
}
