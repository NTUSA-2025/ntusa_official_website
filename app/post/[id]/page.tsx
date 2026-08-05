import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import DeleteButton from "../../../components/DeleteButton"; // 引入刪除按鈕元件

export default async function PostPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. 取得網址上的文章 ID
  const { id } = await params;

  // 2. 向資料庫查詢該篇文章
  const post = await prisma.post.findUnique({
    where: { id },
  });

  // 如果文章不存在，直接回傳 404
  if (!post) {
    notFound();
  }

  // 取得目前登入者的 Session (用於判斷權限)
  const session = await getServerSession(authOptions);

  const t = await getTranslations("post");

  // 3. 安全性攔截邏輯：如果文章不是「已核准」狀態
  if (post.status !== "APPROVED") {
    // 沒登入直接擋掉
    if (!session || !session.user) {
      notFound();
    }

    const userEmail = session.user.email;
    const userRole = session.user.role;
    const userDepartment = session.user.department;

    const isAuthor = post.authorEmail === userEmail;
    const isDeptMember = post.department === userDepartment;
    const isReviewer = userRole === "admin" || userDepartment === "公關部";

    // 如果既不是作者，也不是同部門成員，也不是審核者，就回傳 404
    if (!isAuthor && !isDeptMember && !isReviewer) {
      notFound();
    }
  }

  // 4. 渲染文章頁面
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      
      {/* 提示區塊：如果這是一篇未公開的文章，顯示警告橫幅給內部人員看 */}
      {post.status !== "APPROVED" && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>{t("unpublishedNotice")}</strong> {t("unpublishedBody")} <span className="font-bold text-red-600 px-1 rounded">{t(`status.${post.status}`)}</span>{t("unpublishedBodyTail")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 封面圖片 */}
      {post.coverImage && (
        <img 
          src={post.coverImage} 
          alt={post.title} 
          crossOrigin="anonymous"
          className="w-full h-64 md:h-96 object-cover rounded-xl mb-8 shadow-sm"
        />
      )}
      
      {/* 文章標題 */}
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
      
      {/* 文章資訊 */}
      <div className="flex items-center text-gray-500 text-sm mb-8 border-b pb-8">
        <span className="mr-4">
          {t("authorLabel")}{post.authorName || post.authorEmail}
          {post.department && `（${post.department}）`}
        </span>
        <span>
          {t("publishedLabel")}{new Date(post.createdAt).toLocaleDateString(t("dateLocale"), { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Taipei' })}
        </span>
      </div>

      {/* 文章內容 (HTML 渲染) */}
      <div 
        className="tiptap prose prose-lg max-w-none prose-blue"
        dangerouslySetInnerHTML={{ __html: post.content }} 
      />

      {/* 底部操作區塊：包含「返回首頁」、「修改文章」與「刪除文章」 */}
      <div className="mt-12 pt-8 border-t flex flex-wrap justify-between items-center gap-4">
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center transition-colors">
          <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backToHome")}
        </Link>

        <div className="flex items-center gap-4">
          {/* 權限驗證：只有「原作者本人」、「同部門成員」或「具備管理權限 (admin/公關部)」可以修改文章 */}
          {session?.user && (
            (session.user.email === post.authorEmail) || 
            (session.user.department === post.department) || 
            (session.user.role === "admin" || session.user.department === "公關部")
          ) && (
            <Link 
              href={`/editor/${post.id}`}
              className="px-6 py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-200"
            >
              {t("editButton")}
            </Link>
          )}

          {/* 刪除權限：只有「原作者本人」或「具備管理權限 (admin/公關部)」可以刪除文章 */}
          {session?.user && (
            (session.user.email?.toLowerCase() === post.authorEmail?.toLowerCase()) || 
            (session.user.role === "admin" || session.user.department === "公關部")
          ) && (
            <DeleteButton postId={post.id} />
          )}
        </div>
      </div>
      
    </div>
  );
}