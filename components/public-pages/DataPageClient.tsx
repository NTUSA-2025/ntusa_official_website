"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import type { UnifiedMeetingMinute } from "@/lib/get-cached-meeting-minutes";
import { useFadeUp } from "./useFadeUp";

export default function DataPageClient({ minutes }: { minutes: UnifiedMeetingMinute[] }) {
  const { data: session } = useSession();
  const [dataTab, setDataTab] = useState("minutes");
  const locale = useLocale();
  const tData = useTranslations("home.data");
  useFadeUp([dataTab, locale]);

  return (
    <section className="page">
      <div className="page-hero-mini">
        <div className="page-hero-mini-content">
          <h1 className="page-title">{tData("title")}</h1>
          <p className="page-desc">{tData("desc")}</p>
        </div>
      </div>

      <div className="section-wrap">
        <div className="data-tabs">
          <button className={`data-tab ${dataTab === "minutes" ? "active" : ""}`} onClick={() => setDataTab("minutes")}>
            {tData("tabMinutes")}
          </button>
          <button className={`data-tab ${dataTab === "budget" ? "active" : ""}`} onClick={() => setDataTab("budget")}>
            {tData("tabBudget")}
          </button>
          <button className={`data-tab ${dataTab === "representatives" ? "active" : ""}`} onClick={() => setDataTab("representatives")}>
            {tData("tabRepresentatives")}
          </button>
        </div>

        <div className={`data-panel ${dataTab === "minutes" ? "active" : ""}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <p className="minutes-intro fade-up-target m-0">{tData("minutesDesc")}</p>
            {session?.user && (
              <Link
                href="/minutes/upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shrink-0 self-start sm:self-center"
              >
                <span>＋</span>
                <span>{tData("uploadButton")}</span>
              </Link>
            )}
          </div>
          {minutes.length > 0 ? (
            <ul className="minutes-list">
              {minutes.map((minute) => {
                const meetingDate = new Date(`${minute.date}T00:00:00`);
                const dateLabel = meetingDate.toLocaleDateString(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const title = minute.title || tData("minutesTitle");

                return (
                  <li key={minute.id} className="minute-card fade-up-target">
                    <time className="minute-date" dateTime={minute.date}>{dateLabel}</time>
                    <h3 className="minute-title">{title}</h3>
                    <a
                      className="minute-link"
                      href={minute.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${dateLabel} ${title} — ${tData("minutesViewPdf")}`}
                    >
                      {tData("minutesViewPdf")}
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="minutes-empty">{tData("minutesEmpty")}</p>
          )}
        </div>

        <div className={`data-panel ${dataTab === "budget" ? "active" : ""}`}>
          <div className="rights-placeholder-box fade-up-target">
            <div className="placeholder-icon">📊</div>
            <h3>{tData("budgetTitle")}</h3>
            <p>{tData("budgetDesc")}</p>
            <a
              href="https://drive.google.com/drive/folders/1jziYHepOlmajQlV0lJKpnf1vpeW9dpBi"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ marginTop: "20px" }}
            >
              {tData("budgetOpenDrive")}
            </a>
          </div>
        </div>

        <div className={`data-panel ${dataTab === "representatives" ? "active" : ""}`}>
          <div className="rights-placeholder-box fade-up-target">
            <div className="placeholder-icon">🏛️</div>
            <h3>{tData("representativesTitle")}</h3>
            <p>{tData("representativesDesc")}</p>
            <Link
              href="/university-meeting-representatives"
              className="btn btn-primary"
              style={{ marginTop: "20px" }}
            >
              {tData("representativesOpen")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
