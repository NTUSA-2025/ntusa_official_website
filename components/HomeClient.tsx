"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { tabFromHashFragment } from "@/lib/home-active-tab";
import AlternatingPostList from "./AlternatingPostList";
import HomeHero from "./HomeHero";
import { meetingMinutes } from "@/data/meetingMinutes";

const DEPT_KEYS = [
  "hq",
  "secretariat",
  "academic",
  "pr",
  "it",
  "finance",
  "international",
  "election",
] as const;

type PostType = {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  coverImage: string | null;
};

export default function HomeClient({ posts }: { posts: PostType[] }) {
  const [activeTab, setActiveTab] = useState(() => (
    typeof window === "undefined" ? "home" : tabFromHashFragment(window.location.hash)
  ));
  const [dataTab, setDataTab] = useState("minutes");
  const locale = useLocale();
  const tNews = useTranslations("home.news");
  const tAbout = useTranslations("home.about");
  const tDepts = useTranslations("home.depts");
  const tRights = useTranslations("home.rights");
  const tForms = useTranslations("home.forms");
  const tData = useTranslations("home.data");

  const rawHistory = tAbout.raw("history");
  const historyParagraphs = Array.isArray(rawHistory) ? (rawHistory as string[]) : [];
  const deptsData = DEPT_KEYS.map((key) => ({
    key,
    name: tDepts(`${key}.name`),
    desc: tDepts(`${key}.desc`),
  }));

  const applyHashToTab = useCallback((scrollBehavior: ScrollBehavior = "smooth") => {
    const tab = tabFromHashFragment(window.location.hash);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  }, []);

  // Apply hash before paint so navigations from other routes (e.g. /campus-tools) do not flash the home hero.
  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => applyHashToTab("auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [applyHashToTab]);

  useEffect(() => {
    const handleHashChange = () => applyHashToTab("smooth");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [applyHashToTab]);

  useEffect(() => {
    const observerOptions = { threshold: 0.01, rootMargin: "0px 0px -20px 0px" };
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          fadeObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll(".fade-up-target").forEach((el, i) => {
      if (el.classList.contains("is-visible")) return;
      (el as HTMLElement).style.setProperty("--delay", `${(i % 5) * 60}ms`);
      el.classList.add("fade-up");
      fadeObserver.observe(el);
    });

    return () => fadeObserver.disconnect(); 
  }, [activeTab, locale]);

  const navigateTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    window.history.pushState(null, "", `/#${id}`);
    window.dispatchEvent(new Event("hashchange"));
  };

  return (
    <>
      {/* ── PAGE: 首頁 ── */}
      <section className={`page ${activeTab === "home" ? "active" : ""}`} id="home">
        <HomeHero />

        <div className="section-wrap">
          <div className="section-header fade-up-target">
            <div className="section-tag">{tNews("sectionTag")}</div>
            <h2 className="section-title">{tNews("sectionTitle")}</h2>
            <p className="section-sub">{tNews("sectionSub")}</p>
          </div>

          <div className="news-grid" id="newsGrid">
            {posts.length === 0 ? (
              <div className="col-span-3 text-center text-gray-500 py-10">{tNews("emptyState")}</div>
            ) : (
              posts.map((post) => (
                <article key={post.id} className="news-card fade-up-target" role="article">
                  <div className="news-card-img">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        crossOrigin="anonymous"
                        className="news-card-cover"
                      />
                    ) : "📄"}
                  </div>
                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span className="news-card-tag">{tNews("cardTag")}</span>
                      <span className="news-card-date">{post.createdAt}</span>
                    </div>
                    <h3 className="news-card-title line-clamp-2">{post.title}</h3>
                    <p className="news-card-excerpt line-clamp-3">{post.excerpt}</p>
                    <Link href={`/post/${post.id}`} className="news-card-link">
                      {tNews("readMore")} <span>→</span>
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="section-footer fade-up-target">
            <Link href="/#rights" onClick={(e) => navigateTo(e, "rights")} className="btn btn-outline">
              {tNews("viewAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── PAGE: 關於我們 ── */}
      <section className={`page ${activeTab === "about" ? "active" : ""}`} id="about">
        <div className="page-hero-mini">
          <div className="page-hero-mini-content">
            <div className="section-tag">{tAbout("eyebrow")}</div>
            <h1 className="page-title">{tAbout("title")}</h1>
            <p className="page-desc">{tAbout("desc")}</p>
          </div>
        </div>

        <div className="section-wrap">
          <div className="section-header fade-up-target">
            <div className="section-tag">{tAbout("historyTag")}</div>
            <h2 className="section-title">{tAbout("historyTitle")}</h2>
          </div>
          <div className="about-body">
            {historyParagraphs.map((para, i) => (
              <p key={i} className="fade-up-target">{para}</p>
            ))}
          </div>
        </div>

        <div className="section-wrap">
          <div className="section-header fade-up-target">
            <div className="section-tag">{tAbout("deptsTag")}</div>
            <h2 className="section-title">{tAbout("deptsTitle")}</h2>
            <p className="section-sub">{tAbout("deptsSub")}</p>
          </div>

        <div className="dept-grid">
            {deptsData.map((dept) => (
              <div className="dept-card fade-up-target" key={dept.key}>
                <h3 className="dept-name">{dept.name}</h3>
                <p className="dept-desc">{dept.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAGE: 學權公告 ── */}
      <section className={`page ${activeTab === "rights" ? "active" : ""}`} id="rights">
        <div className="page-hero-mini">
          <div className="page-hero-mini-content">
            <div className="section-tag">{tRights("eyebrow")}</div>
            <h1 className="page-title">{tRights("title")}</h1>
            <p className="page-desc">{tRights("desc")}</p>
          </div>
        </div>

        <div className="section-wrap">
          {/* 原本的 placeholder 已替換為 AlternatingPostList */}
          <div className="fade-up-target">
            <AlternatingPostList posts={posts} />
          </div>
        </div>
      </section>

      {/* ── PAGE: 相關連結 ── */}
      <section className={`page ${activeTab === "forms" ? "active" : ""}`} id="forms">
        <div className="page-hero-mini">
          <div className="page-hero-mini-content">
            <div className="section-tag">{tForms("eyebrow")}</div>
            <h1 className="page-title">{tForms("title")}</h1>
            <p className="page-desc">{tForms("desc")}</p>
          </div>
        </div>

        <div className="section-wrap">
          <div className="section-header fade-up-target">
            <div className="section-tag">{tForms("complaintTag")}</div>
            <h2 className="section-title">{tForms("complaintTitle")}</h2>
          </div>
          <div className="links-grid">
            <a
              href="https://line.me/R/ti/p/%40ntusa"
              target="_blank"
              rel="noopener noreferrer"
              className="link-card fade-up-target"
            >
              <div className="link-card-icon line-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <div className="link-card-body">
                <div className="link-card-tag">{tForms("lineCardTag")}</div>
                <h3 className="link-card-title">{tForms("lineCardTitle")}</h3>
                <p className="link-card-desc">{tForms("lineCardDesc")}</p>
              </div>
              <span className="link-card-arrow">→</span>
            </a>
          </div>

          <div className="section-header fade-up-target" style={{ marginTop: "56px" }}>
            <div className="section-tag">{tForms("deptLinksTag")}</div>
            <h2 className="section-title">{tForms("deptLinksTitle")}</h2>
          </div>
          <div className="links-grid">
            <div className="link-card link-card-placeholder fade-up-target">
              <div className="link-card-body">
                <div className="link-card-tag">{tForms("comingSoonTag")}</div>
                <h3 className="link-card-title">{tForms("comingSoonTitle")}</h3>
                <p className="link-card-desc">{tForms("comingSoonDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAGE: 公開資料 ── */}
      <section className={`page ${activeTab === "data" ? "active" : ""}`} id="data">
        <div className="page-hero-mini">
          <div className="page-hero-mini-content">
            <div className="section-tag">{tData("eyebrow")}</div>
            <h1 className="page-title">{tData("title")}</h1>
            <p className="page-desc">{tData("desc")}</p>
          </div>
        </div>

        <div className="section-wrap">
          <div className="data-tabs">
            <button className={`data-tab ${dataTab === "minutes" ? "active" : ""}`} onClick={() => setDataTab("minutes")}>{tData("tabMinutes")}</button>
            <button className={`data-tab ${dataTab === "budget" ? "active" : ""}`} onClick={() => setDataTab("budget")}>{tData("tabBudget")}</button>
            <button className={`data-tab ${dataTab === "other" ? "active" : ""}`} onClick={() => setDataTab("other")}>{tData("tabOther")}</button>
          </div>

          <div className={`data-panel ${dataTab === "minutes" ? "active" : ""}`}>
            <p className="minutes-intro fade-up-target">{tData("minutesDesc")}</p>
            <ul className="minutes-list">
              {meetingMinutes.map((m) => {
                const meetingDate = new Date(`${m.date}T00:00:00`);
                const dateLabel = meetingDate.toLocaleDateString(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const title = tData(`types.${m.type}`);
                return (
                  <li key={m.id} className="minute-card fade-up-target">
                    <time className="minute-date" dateTime={m.date}>{dateLabel}</time>
                    <div className="minute-body">
                      <h3 className="minute-title">{title}</h3>
                      <span className="minute-tag">{tData("minutesTag")}</span>
                    </div>
                    <a
                      className="minute-link"
                      href={m.file}
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
          <div className={`data-panel ${dataTab === "other" ? "active" : ""}`}>
            <div className="rights-placeholder-box fade-up-target">
              <div className="placeholder-icon">📂</div>
              <h3>{tData("otherTitle")}</h3>
              <p>{tData("otherDesc")}</p>
              <div className="placeholder-badge">{tData("otherBadge")}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
