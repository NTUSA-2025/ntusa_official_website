"use client";

import { useLocale, useTranslations } from "next-intl";
import type { HomePostPreview } from "@/lib/home-posts";
import AlternatingPostList from "@/components/AlternatingPostList";
import { useFadeUp } from "./useFadeUp";

export default function AnnouncementsPageClient({ posts }: { posts: HomePostPreview[] }) {
  const locale = useLocale();
  const tRights = useTranslations("home.rights");
  useFadeUp([locale]);

  return (
    <section className="page">
      <div className="page-hero-mini">
        <div className="page-hero-mini-content">
          <h1 className="page-title">{tRights("title")}</h1>
          <p className="page-desc">{tRights("desc")}</p>
        </div>
      </div>

      <div className="section-wrap">
        <div className="fade-up-target">
          <AlternatingPostList posts={posts} />
        </div>
      </div>
    </section>
  );
}
