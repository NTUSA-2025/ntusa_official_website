"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "./LocaleSwitcher";

type NavItem = { href: string; label: string };

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const openDrawer = () => {
    setIsDrawerOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    document.body.style.overflow = "";
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const navItems: NavItem[] = [
    { href: "/", label: t("home") },
    { href: "/about", label: t("about") },
    { href: "/announcements", label: t("rights") },
    { href: "/cases", label: t("caseProgress") },
    { href: "/forms", label: t("forms") },
    { href: "/data", label: t("data") },
    { href: "/university-meeting-representatives", label: t("studentRepresentatives") },
  ];

  const isNavActive = (item: NavItem) => pathname === item.href;

  return (
    <>
      <header className={`navbar ${scrolled ? "scrolled" : ""}`} id="navbar">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <Image src="/NTUSA_Logo_1.png" alt={tFooter("orgName")} width={40} height={40} className="logo-mark" />
            <div className="logo-text">
              <span className="logo-title">{tFooter("orgName")}</span>
              <span className="logo-sub">{tFooter("orgNameEn")}</span>
            </div>
          </Link>

          <nav className="nav-links">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isNavActive(item) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}

            {/* 登入後才會顯示的按鈕 */}
            {session && (
              <>
                <div style={{ width: "1px", height: "20px", background: "var(--color-border)", margin: "0 8px", flexShrink: 0 }}></div>
                <Link href="/editor" className="nav-link" style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                  {t("newPost")}
                </Link>
                <Link href="/review" className="nav-link" style={{ color: "var(--color-secondary)", fontWeight: "bold" }}>
                  {t("review")}
                </Link>
                <Link href="/minutes/upload" className="nav-link" style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                  {t("uploadMinutes")}
                </Link>
                <Link href="/student-rights/cases/manage" className="nav-link" style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                  {t("caseManagement")}
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="nav-link" style={{ color: "#e53e3e" }}>
                  {t("signOut")}
                </button>
              </>
            )}

            <LocaleSwitcher variant="desktop" />
          </nav>

          <button
            className={`hamburger ${isDrawerOpen ? "open" : ""}`}
            onClick={isDrawerOpen ? closeDrawer : openDrawer}
            aria-label={t("openMenu")}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      {/* 手機版側邊選單 */}
      <div className={`drawer-overlay ${isDrawerOpen ? "open" : ""}`} onClick={closeDrawer}></div>
      <aside className={`drawer ${isDrawerOpen ? "open" : ""}`} id="drawer">
        <button className="drawer-close" onClick={closeDrawer} aria-label={t("closeMenu")}>✕</button>
        <div className="drawer-logo">
          <Image src="/NTUSA_Logo_1.png" alt={tFooter("orgName")} width={40} height={40} className="logo-mark" />
          <div className="logo-text">
            <span className="logo-title">{tFooter("orgName")}</span>
            <span className="logo-sub">{tFooter("orgNameEn")}</span>
          </div>
        </div>
        <nav className="drawer-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDrawer}
              className={`drawer-link ${isNavActive(item) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}

          {/* 手機版：登入後按鈕 */}
          {session && (
            <>
              <div style={{ height: "1px", background: "var(--color-border)", margin: "8px 0" }}></div>
              <Link href="/editor" className="drawer-link" onClick={closeDrawer} style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                {t("newPost")}
              </Link>
              <Link href="/review" className="drawer-link" onClick={closeDrawer} style={{ color: "var(--color-secondary)", fontWeight: "bold" }}>
                {t("review")}
              </Link>
              <Link href="/minutes/upload" className="drawer-link" onClick={closeDrawer} style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                {t("uploadMinutes")}
              </Link>
              <Link href="/student-rights/cases/manage" className="drawer-link" onClick={closeDrawer} style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                {t("caseManagement")}
              </Link>
              <button onClick={() => { closeDrawer(); signOut({ callbackUrl: '/' }); }} className="drawer-link" style={{ color: "#e53e3e", textAlign: "left" }}>
                {t("signOut")}
              </button>
            </>
          )}

          <div className="drawer-divider" aria-hidden></div>
          <LocaleSwitcher variant="drawer" onSwitch={closeDrawer} />
        </nav>
      </aside>
    </>
  );
}
