"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  const handleLogoClick = () => {
    router.push("/api/auth/signin");
  };

  const handleHashNavigation = (e: React.MouseEvent<HTMLAnchorElement>, hashId: string) => {
    if (pathname === "/") {
      e.preventDefault();
      window.history.pushState(null, "", `/#${hashId}`);
      window.dispatchEvent(new Event("hashchange"));
    }
  };

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <button
            type="button"
            onClick={handleLogoClick}
            aria-label={t("adminSignInAriaLabel")}
            className="footer-logo-button"
          >
            <Image src="/NTUSA_Logo_1.png" alt={t("orgName")} width={32} height={32} className="logo-mark small" />
          </button>
          <div>
            <div className="footer-name">{t("orgName")}</div>
            <div className="footer-name-en">{t("orgNameEn")}</div>
            <a href="mailto:ntusamailbox@gmail.com" className="footer-contact">
              ntusamailbox@gmail.com
            </a>
            <a href="mailto:infor@ntusa.ntu.edu.tw" className="footer-bug-report">
              infor@ntusa.ntu.edu.tw
              <span>{t("bugReportLabel")}</span>
            </a>
          </div>
        </div>

        <div className="footer-links">
          <Link href="/#home" onClick={(e) => handleHashNavigation(e, "home")}>
            {tNav("home")}
          </Link>
          <Link href="/#about" onClick={(e) => handleHashNavigation(e, "about")}>
            {tNav("about")}
          </Link>
          <Link href="/#announcements" onClick={(e) => handleHashNavigation(e, "announcements")}>
            {tNav("rights")}
          </Link>
         <Link href="/#forms" onClick={(e) => handleHashNavigation(e, "forms")}>
            {tNav("forms")}
          </Link>
          <Link href="/#data" onClick={(e) => handleHashNavigation(e, "data")}>
            {tNav("data")}
          </Link>
        </div>

        <div className="footer-socials">
          <a href="https://www.facebook.com/NTUSAtw/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" width="25" height="25">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/ntusa.taiwan/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>
            </svg>
          </a>
          <a href="https://www.threads.net/@ntusa.taiwan" target="_blank" rel="noopener noreferrer" aria-label="Threads">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/>
            </svg>
          </a>
        </div>

        <div className="footer-copy">
          {t("copyright")}
        </div>
      </div>
    </footer>
  );
}
