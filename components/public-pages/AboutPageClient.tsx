"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useFadeUp } from "./useFadeUp";

const DEPT_KEYS = [
  "presidency",
  "secretary",
  "secretariat",
  "finance",
  "studentRights",
  "academic",
  "culture",
  "pr",
  "election",
  "international",
  "it",
] as const;

const ACADEMIC_GROUP_KEYS = [
  "genderEquality",
  "sustainability",
  "transitionalJustice",
  "localLanguages",
] as const;

export default function AboutPageClient() {
  const locale = useLocale();
  const tAbout = useTranslations("home.about");
  const tDepts = useTranslations("home.depts");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(() => new Set());
  const [truncatedDepts, setTruncatedDepts] = useState<Set<string>>(() => new Set());
  const deptDescRefs = useRef(new Map<string, HTMLParagraphElement>());
  useFadeUp([locale]);

  const rawHistory = tAbout.raw("history");
  const historyParagraphs = Array.isArray(rawHistory) ? (rawHistory as string[]) : [];
  const academicGroups = ACADEMIC_GROUP_KEYS.map((key) => ({
    key,
    name: tDepts(`academic.groups.${key}.name`),
    desc: tDepts(`academic.groups.${key}.desc`),
  }));
  const deptsData: Array<{ key: string; name: string; desc: string; parent?: string }> = [
    ...DEPT_KEYS.flatMap((key) => {
      const department = {
        key,
        name: tDepts(`${key}.name`),
        desc: tDepts(`${key}.desc`),
      };

      if (key !== "academic") return department;

      return [
        department,
        ...academicGroups.map((group) => ({
          ...group,
          key: `academic-${group.key}`,
          parent: department.name,
        })),
      ];
    }),
  ];

  useLayoutEffect(() => {
    const measureTruncation = () => {
      const next = new Set<string>();

      deptDescRefs.current.forEach((element, key) => {
        if (expandedDepts.has(key) || element.scrollHeight > element.clientHeight + 1) {
          next.add(key);
        }
      });

      setTruncatedDepts((current) => {
        if (current.size === next.size && [...current].every((key) => next.has(key))) return current;
        return next;
      });
    };

    const frame = window.requestAnimationFrame(measureTruncation);
    const resizeObserver = new ResizeObserver(measureTruncation);
    deptDescRefs.current.forEach((element) => resizeObserver.observe(element));

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [expandedDepts, locale]);

  const toggleDeptDescription = (key: string) => {
    setExpandedDepts((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="page">
      <div className="page-hero-mini">
        <div className="page-hero-mini-content">
          <h1 className="page-title">{tAbout("title")}</h1>
          <p className="page-desc">{tAbout("desc")}</p>
        </div>
      </div>

      <div className="section-wrap">
        <div className="section-header fade-up-target">
          <h2 className="section-title">{tAbout("historyTitle")}</h2>
        </div>
        <div className="about-body">
          {historyParagraphs.map((paragraph, index) => (
            <p key={index} className="fade-up-target">{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="section-wrap">
        <div className="section-header fade-up-target">
          <h2 className="section-title">{tAbout("deptsTitle")}</h2>
          <p className="section-sub">{tAbout("deptsSub")}</p>
        </div>

        <div className="dept-grid">
          {deptsData.map((department) => (
            <div className="dept-card fade-up-target" key={department.key}>
              {department.parent && <p className="dept-parent">{department.parent}</p>}
              <h3 className="dept-name">{department.name}</h3>
              <p
                className={`dept-desc ${expandedDepts.has(department.key) ? "is-expanded" : ""}`}
                id={`department-description-${department.key}`}
                ref={(element) => {
                  if (element) deptDescRefs.current.set(department.key, element);
                  else deptDescRefs.current.delete(department.key);
                }}
              >
                {department.desc}
              </p>
              {truncatedDepts.has(department.key) && (
                <button
                  type="button"
                  className="dept-toggle"
                  aria-expanded={expandedDepts.has(department.key)}
                  aria-controls={`department-description-${department.key}`}
                  onClick={() => toggleDeptDescription(department.key)}
                >
                  {expandedDepts.has(department.key) ? tDepts("showLess") : tDepts("showMore")}
                  <span aria-hidden="true">{expandedDepts.has(department.key) ? "↑" : "↓"}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
