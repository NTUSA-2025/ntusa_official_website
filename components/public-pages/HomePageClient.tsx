"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { HomePostPreview } from "@/lib/home-posts";
import { proxyR2Url } from "@/lib/r2-proxy";
import HomeHero from "@/components/HomeHero";
import { useFadeUp } from "./useFadeUp";

export default function HomePageClient({ posts }: { posts: HomePostPreview[] }) {
  const locale = useLocale();
  const tNews = useTranslations("home.news");
  useFadeUp([locale]);

  return (
    <section className="page">
      <HomeHero />

      <div className="section-wrap">
        <div className="section-header fade-up-target">
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
                      src={proxyR2Url(post.coverImage)!}
                      alt={post.title}
                      className="news-card-cover"
                    />
                  ) : "📄"}
                </div>
                <div className="news-card-body">
                  <div className="news-card-meta">
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
          <Link href="/announcements" className="btn btn-outline">
            {tNews("viewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
