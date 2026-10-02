"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { UniversityMeeting } from "@/lib/university-meeting-representatives";

type Props = {
  meetings: UniversityMeeting[];
  loadFailed: boolean;
  sourceUrl: string;
};

export default function MeetingRepresentativesPageClient({
  meetings,
  loadFailed,
  sourceUrl,
}: Props) {
  const t = useTranslations("representatives");
  const [query, setQuery] = useState("");

  const filteredMeetings = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return meetings;

    return meetings.filter((meeting) =>
      [
        meeting.name,
        meeting.representatives.map((representative) => representative.name).join(" "),
        meeting.representatives.map((representative) => representative.studentId).join(" "),
        meeting.appointmentMethod,
        meeting.otherRepresentatives,
        meeting.office,
        meeting.subject,
        meeting.frequency,
        meeting.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [meetings, query]);

  return (
    <div className="representatives-page">
      <section className="representatives-hero">
        <div className="representatives-hero-inner">
          <p className="representatives-eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="representatives-lead">{t("description")}</p>
          <div className="representatives-hero-actions">
            <Link href="/data" className="representatives-back-link">
              {t("back")}
            </Link>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              {t("openSource")}
            </a>
          </div>
        </div>
      </section>

      <section className="representatives-content" aria-labelledby="representatives-list-title">
        <div className="representatives-toolbar">
          <div>
            <h2 id="representatives-list-title">{t("listTitle")}</h2>
            <p>{t("count", { count: filteredMeetings.length })}</p>
          </div>
          <label className="representatives-search">
            <span className="sr-only">{t("searchLabel")}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </label>
        </div>

        <p className="representatives-privacy-note">{t("sourceNote")}</p>

        {loadFailed ? (
          <div className="representatives-state" role="status">
            <h2>{t("unavailableTitle")}</h2>
            <p>{t("unavailableDescription")}</p>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="representatives-text-link">
              {t("openSource")}
            </a>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="representatives-state" role="status">
            <h2>{t("emptyTitle")}</h2>
            <p>{t("emptyDescription")}</p>
          </div>
        ) : (
          <div className="representatives-grid">
            {filteredMeetings.map((meeting) => (
              <article className="representative-card" key={meeting.id}>
                <header>
                  <div>
                    <p className="representative-card-label">{t("meetingLabel")}</p>
                    <h2>{meeting.name}</h2>
                  </div>
                  {meeting.frequency ? <span className="representative-frequency">{meeting.frequency}</span> : null}
                </header>

                <div className="representative-primary">
                  <p className="representative-card-label">{t("representativeLabel")}</p>
                  {meeting.representatives.length > 0 ? (
                    <ul>
                      {meeting.representatives.map((representative, index) => (
                        <li key={`${representative.name}-${index}`}>
                          <strong>{representative.name}</strong>
                          {representative.email ? <a href={`mailto:${representative.email}`}>{representative.email}</a> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="representative-pending">{t("pending")}</p>
                  )}
                </div>

                {meeting.subject ? <p className="representative-subject">{meeting.subject}</p> : null}

                <details className="representative-details">
                  <summary>{t("showDetails")}</summary>
                  <dl>
                    {meeting.representatives.some((representative) => representative.studentId) ? (
                      <>
                        <dt>{t("studentIds")}</dt>
                        <dd>
                          <ul className="representative-student-ids">
                            {meeting.representatives
                              .filter((representative) => representative.studentId)
                              .map((representative) => (
                                <li key={`${representative.name}-${representative.studentId}`}>
                                  {representative.name}：{representative.studentId}
                                </li>
                              ))}
                          </ul>
                        </dd>
                      </>
                    ) : null}
                    {meeting.appointmentMethod ? <><dt>{t("appointmentMethod")}</dt><dd>{meeting.appointmentMethod}</dd></> : null}
                    {meeting.reportStatus ? <><dt>{t("reportStatus")}</dt><dd>{meeting.reportStatus}</dd></> : null}
                    {meeting.otherRepresentatives ? <><dt>{t("otherRepresentatives")}</dt><dd>{meeting.otherRepresentatives}</dd></> : null}
                    {meeting.office ? <><dt>{t("office")}</dt><dd>{meeting.office}</dd></> : null}
                    {meeting.note ? <><dt>{t("note")}</dt><dd>{meeting.note}</dd></> : null}
                  </dl>
                  {meeting.regulationUrl ? (
                    <a href={meeting.regulationUrl} target="_blank" rel="noopener noreferrer" className="representatives-text-link">
                      {t("regulationLink")}
                    </a>
                  ) : null}
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
