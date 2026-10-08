"use client";

import { useState, useEffect, useRef } from "react";
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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

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
      if (e.key === "Escape") {
        closeDrawer();
        setIsAdminMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (!isAdminMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!adminMenuRef.current?.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isAdminMenuOpen]);

  const navItems: NavItem[] = [
    { href: "/", label: t("home") },
    { href: "/about", label: t("about") },
    { href: "/announcements", label: t("rights") },
    { href: "/cases", label: t("caseProgress") },
    { href: "/forms", label: t("forms") },
    { href: "/data", label: t("data") },
  ];

  const isNavActive = (item: NavItem) => (
    pathname === item.href
    || (item.href === "/data" && pathname === "/university-meeting-representatives")
  );
  const isAdminRouteActive = [
    "/editor",
    "/review",
    "/minutes/upload",
    "/student-rights/cases/manage",
    "/student-rights/cases/audit",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const canManageStudentRightsCases = session?.user?.department === "資訊部"
    || session?.user?.department === "學權部";

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

            {/* 登入後將管理功能收進選單，避免桌面導覽列超出畫面。 */}
            {session && (
              <div className="nav-admin-menu" ref={adminMenuRef}>
                <button
                  type="button"
                  className={`nav-link nav-admin-trigger ${isAdminRouteActive ? "active" : ""}`}
                  aria-haspopup="menu"
                  aria-expanded={isAdminMenuOpen}
                  aria-controls="desktop-admin-menu"
                  onClick={() => setIsAdminMenuOpen((open) => !open)}
                >
                  {t("adminMenu")}
                  <span className={`nav-admin-chevron ${isAdminMenuOpen ? "open" : ""}`} aria-hidden="true">⌄</span>
                </button>
                {isAdminMenuOpen && (
                  <div className="nav-admin-popover" id="desktop-admin-menu" role="menu">
                    <Link href="/editor" role="menuitem" className="nav-admin-item" onClick={() => setIsAdminMenuOpen(false)}>
                      {t("newPost")}
                    </Link>
                    <Link href="/review" role="menuitem" className="nav-admin-item" onClick={() => setIsAdminMenuOpen(false)}>
                      {t("review")}
                    </Link>
                    <Link href="/minutes/upload" role="menuitem" className="nav-admin-item" onClick={() => setIsAdminMenuOpen(false)}>
                      {t("uploadMinutes")}
                    </Link>
                    {canManageStudentRightsCases ? (
                      <>
                        <Link href="/student-rights/cases/manage" role="menuitem" className="nav-admin-item" onClick={() => setIsAdminMenuOpen(false)}>
                          {t("caseManagement")}
                        </Link>
                        <Link href="/student-rights/cases/audit" role="menuitem" className="nav-admin-item" onClick={() => setIsAdminMenuOpen(false)}>
                          {t("caseAudit")}
                        </Link>
                      </>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-admin-item nav-admin-signout"
                      onClick={() => {
                        setIsAdminMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                    >
                      {t("signOut")}
                    </button>
                  </div>
                )}
              </div>
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
              {canManageStudentRightsCases ? (
                <>
                  <Link href="/student-rights/cases/manage" className="drawer-link" onClick={closeDrawer} style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                    {t("caseManagement")}
                  </Link>
                  <Link href="/student-rights/cases/audit" className="drawer-link" onClick={closeDrawer} style={{ color: "var(--color-brand-dark)", fontWeight: "bold" }}>
                    {t("caseAudit")}
                  </Link>
                </>
              ) : null}
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
