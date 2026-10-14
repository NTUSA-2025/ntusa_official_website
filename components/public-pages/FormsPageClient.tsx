"use client";

import { useLocale, useTranslations } from "next-intl";
import { useFadeUp } from "./useFadeUp";

export default function FormsPageClient() {
  const locale = useLocale();
  const tForms = useTranslations("home.forms");
  useFadeUp([locale]);

  return (
    <section className="page">
      <div className="page-hero-mini">
        <div className="page-hero-mini-content">
          <h1 className="page-title">{tForms("title")}</h1>
          <p className="page-desc">{tForms("desc")}</p>
        </div>
      </div>

      <div className="section-wrap">
        <div className="section-header fade-up-target">
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
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
            </div>
            <div className="link-card-body">
              <h3 className="link-card-title">{tForms("lineCardTitle")}</h3>
              <p className="link-card-desc">{tForms("lineCardDesc")}</p>
            </div>
            <span className="link-card-arrow">→</span>
          </a>
        </div>

        <div className="section-header fade-up-target" style={{ marginTop: "56px" }}>
          <h2 className="section-title">{tForms("deptLinksTitle")}</h2>
        </div>
        <div className="links-grid">
          <a href="https://sc.ntusa.ntu.edu.tw/notifi" target="_blank" rel="noopener noreferrer" className="link-card fade-up-target">
            <div className="link-card-body">
              <h3 className="link-card-title">{tForms("studentCongressTitle")}</h3>
              <p className="link-card-desc">{tForms("studentCongressDesc")}</p>
            </div>
            <span className="link-card-arrow">→</span>
          </a>
          <a href="https://www.facebook.com/NTUStudentJudiciary" target="_blank" rel="noopener noreferrer" className="link-card fade-up-target">
            <div className="link-card-body">
              <h3 className="link-card-title">{tForms("studentJudiciaryTitle")}</h3>
              <p className="link-card-desc">{tForms("studentJudiciaryDesc")}</p>
            </div>
            <span className="link-card-arrow">→</span>
          </a>
          <a href="https://election.ntusa.ntu.edu.tw/notice" target="_blank" rel="noopener noreferrer" className="link-card fade-up-target">
            <div className="link-card-body">
              <h3 className="link-card-title">{tForms("electionCommitteeTitle")}</h3>
              <p className="link-card-desc">{tForms("electionCommitteeDesc")}</p>
            </div>
            <span className="link-card-arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
