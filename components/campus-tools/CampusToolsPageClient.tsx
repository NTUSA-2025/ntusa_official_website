"use client";

import { useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buildCampusToolsEnterDelays } from "@/lib/campus-tools-enter-delays";
import {
  CATEGORY_SECTION_TAGS,
  type CampusTool,
  type GroupedCampusTools,
} from "@/lib/campus-tools";

type Props = {
  grouped: GroupedCampusTools[];
  featured: CampusTool | undefined;
};

function ToolCta({ tool }: { tool: CampusTool }) {
  const t = useTranslations("campusTools");
  const unavailable = tool.comingSoon || tool.href === "#";
  if (unavailable) {
    return (
      <button type="button" className="btn btn-primary btn-sm disabled" disabled>
        {t("ctaUnavailable")}
      </button>
    );
  }
  return (
    <a
      href={tool.href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary btn-sm"
    >
      {t("ctaOpen")}
      <span aria-hidden> ↗</span>
    </a>
  );
}

function enterStyle(ms: number): CSSProperties {
  return { ["--campus-enter-delay" as string]: `${ms}ms` } as CSSProperties;
}

function ToolCard({ tool, enterDelayMs }: { tool: CampusTool; enterDelayMs: number }) {
  const t = useTranslations("campusTools");
  return (
    <article
      className="campus-tool-card campus-tools-enter"
      style={enterStyle(enterDelayMs)}
    >
      <div className="campus-tool-card-top">
        <h3 className="campus-tool-card-title">{tool.name}</h3>
        <p className="campus-tool-card-tagline">{tool.tagline}</p>
      </div>
      <p className="campus-tool-card-desc">{tool.description}</p>
      {tool.maintainers && tool.maintainers.length > 0 && (
        <p className="campus-tool-card-meta">
          {t("maintainersLabel")}{tool.maintainers.join("、")}
        </p>
      )}
      <div className="campus-tool-card-actions">
        <ToolCta tool={tool} />
      </div>
    </article>
  );
}

export default function CampusToolsPageClient({ grouped, featured }: Props) {
  const t = useTranslations("campusTools");
  const delays = useMemo(
    () => buildCampusToolsEnterDelays(grouped, Boolean(featured)),
    [grouped, featured],
  );

  return (
    <div className="campus-tools-page">
      <section className="page-hero-mini campus-tools-hero" aria-labelledby="campus-tools-hero-title">
        <div
          className="page-hero-mini-content campus-tools-enter"
          style={enterStyle(delays.hero)}
        >
          <div className="section-tag">Campus tools</div>
          <h1 id="campus-tools-hero-title" className="page-title">
            {t("heroTitle")}
          </h1>
          <p className="page-desc campus-tools-hero-lead">
            {t("heroLead")}
          </p>
          <p className="campus-tools-hero-back">
            <Link href="/" className="campus-tools-back-link">
              {t("heroBack")}
            </Link>
          </p>
        </div>
      </section>

      {featured && delays.featured !== null && (
        <div className="section-wrap campus-tools-featured-wrap">
          <div
            className="campus-tools-featured campus-tools-enter"
            style={enterStyle(delays.featured)}
          >
            <div className="campus-tools-featured-copy">
              <span className="campus-tools-featured-eyebrow">{t("featuredEyebrow")}</span>
              <h2 className="campus-tools-featured-title">{featured.name}</h2>
              <p className="campus-tools-featured-tagline">{featured.tagline}</p>
              <p className="campus-tools-featured-desc">{featured.description}</p>
              <ToolCta tool={featured} />
            </div>
            <div className="campus-tools-featured-panel" aria-hidden>
              <div className="campus-tools-featured-orbit" />
              <span className="campus-tools-featured-glyph">✦</span>
            </div>
          </div>
        </div>
      )}

      {grouped.map((group, gi) => (
        <section
          key={group.categoryId}
          className="section-wrap campus-tools-section"
          aria-labelledby={`category-${group.categoryId}`}
        >
          <div
            className="section-header campus-tools-category-header campus-tools-enter"
            style={enterStyle(delays.sectionHeaders[gi] ?? 0)}
          >
            <div className="section-tag">{CATEGORY_SECTION_TAGS[group.categoryId]}</div>
            <h2 id={`category-${group.categoryId}`} className="section-title">
              {group.label}
            </h2>
            <p className="section-sub">{t("categorySub")}</p>
          </div>
          <div className="campus-tools-grid">
            {group.tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                enterDelayMs={delays.cards.get(tool.id) ?? 0}
              />
            ))}
          </div>
        </section>
      ))}

      <section
        className="section-wrap campus-tools-submit"
        aria-labelledby="campus-tools-submit-title"
      >
        <div
          className="campus-tools-submit-inner campus-tools-enter"
          style={enterStyle(delays.submit)}
        >
          <h2 id="campus-tools-submit-title" className="campus-tools-submit-title">
            {t("submitTitle")}
          </h2>
          <p className="campus-tools-submit-desc">
            {t("submitDesc")}
          </p>
          <a
            className="btn btn-outline"
            href="https://www.facebook.com/NTUSAtw/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("submitFbButton")}
            <span aria-hidden> ↗</span>
          </a>
          <p className="campus-tools-submit-note caption">
            {t("submitNote")}
          </p>
        </div>
      </section>
    </div>
  );
}
