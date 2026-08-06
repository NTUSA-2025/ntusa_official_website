"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslations } from "next-intl";
import { proxyR2Url } from "@/lib/r2-proxy";

type Post = {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  createdAt: string;
};

export default function AlternatingPostList({ posts }: { posts: Post[] }) {
  const t = useTranslations("home.rights");

  if (!posts || posts.length === 0) {
    return <div className="text-center text-gray-500 py-8">{t("alternatingEmpty")}</div>;
  }

  return (
    <div className="flex flex-col gap-12">
      {posts.map((post, index) => {
        const isEven = index % 2 === 0;

        return (
          <Link
            href={`/post/${post.id}`}
            key={post.id}
            className={`group flex flex-col md:flex-row ${
              isEven ? '' : 'md:flex-row-reverse'
            } items-center gap-8 bg-white p-6 rounded-xl shadow-sm border border-transparent hover:border-gray-200 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}
          >
            {/* 圖片區塊 */}
            <div className="w-full md:w-1/2">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {post.coverImage ? (
                  <img
                    src={proxyR2Url(post.coverImage)!}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-gray-400">{t("alternatingNoImage")}</span>
                )}
              </div>
            </div>

            {/* 文字內容區塊 */}
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-blue-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-gray-600 mb-4 line-clamp-4">
                {post.excerpt}
              </p>
              
              <div className="flex mt-auto">
                <span className="text-sm text-gray-400">
                  {post.createdAt}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}