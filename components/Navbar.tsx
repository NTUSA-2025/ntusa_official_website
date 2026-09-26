"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { tabFromHashFragment } from "@/lib/home-active-tab";
import LocaleSwitcher from "./LocaleSwitcher";

type NavHashItem = { kind: "hash"; id: string; label: string };
type NavRouteItem = { kind: "route"; href: string; label: string };
type NavItem = NavHashItem | NavRouteItem;

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Keep the first client render identical to the server render. The URL hash
  // is applied after hydration by the effect below.
  const [activeHash, setActiveHash] = useState("home");

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
    const handleHash = () => {
      setActiveHash(tabFromHashFragment(window.location.hash));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("hashchange", handleHash);
    handleHash();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  // Client navigations (e.g. router.push("/#about") from /campus-tools) often skip the native hashchange event.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setActiveHash(tabFromHashFragment(window.location.hash));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const navigateTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    closeDrawer();
    if (pathname === "/") {
      // Assigning the fragment lets the browser emit the native hashchange
      // event, which keeps every hash consumer in sync without a synthetic
      // DOM event.
      window.location.hash = id;
    } else {
      router.push(`/#${id}`);
    }
  };

  const navItems: NavItem[] = [
    { kind: "hash", id: "home", label: t("home") },
    { kind: "hash", id: "about", label: t("about") },
    { kind: "hash", id: "announcements", label: t("rights") },
    { kind: "hash", id: "forms", label: t("forms") },
    { kind: "hash", id: "data", label: t("data") },
  ];

  const isNavActive = (item: NavItem) => {
    if (item.kind === "route") return pathname === item.href;
    return pathname === "/" && activeHash === item.id;
  };

  return (
    <>
      <header className={`navbar ${scrolled ? "scrolled" : ""}`} id="navbar">
        <div className="nav-inner">
          <Link href="/#home" className="nav-logo" onClick={(e) => navigateTo(e, "home")}>
            <Image src="/NTUSA_Logo_1.png" alt={tFooter("orgName")} width={40} height={40} className="logo-mark" />
            <div className="logo-text">
              <span className="logo-title">{tFooter("orgName")}</span>
              <span className="logo-sub">{tFooter("orgNameEn")}</span>
            </div>
          </Link>

          <nav className="nav-links">
            {navItems.map((item) =>
              item.kind === "route" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isNavActive(item) ? "active" : ""}`}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={`/#${item.id}`}
                  onClick={(e) => navigateTo(e, item.id)}
                  className={`nav-link ${isNavActive(item) ? "active" : ""}`}
                >
                  {item.label}
                </a>
              ),
            )}

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
          {navItems.map((item) =>
            item.kind === "route" ? (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                className={`drawer-link ${isNavActive(item) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.id}
                href={`/#${item.id}`}
                onClick={(e) => navigateTo(e, item.id)}
                className={`drawer-link ${isNavActive(item) ? "active" : ""}`}
              >
                {item.label}
              </a>
            ),
          )}

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
