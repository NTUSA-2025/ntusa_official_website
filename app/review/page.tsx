import prisma from "../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ReviewButtons from "../../components/ReviewButtons";
import Link from "next/link";

type StatusLabels = { approved: string; rejected: string; pending: string };

// 輔助元件：狀態標籤
const StatusBadge = ({ status, labels }: { status: string; labels: StatusLabels }) => {
  switch (status) {
    case "APPROVED":
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">{labels.approved}</span>;
    case "REJECTED":
      return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{labels.rejected}</span>;
    case "PENDING":
    default:
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">{labels.pending}</span>;
  }
};

export default async function ReviewDashboard() {
  // 1. 權限驗證
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  const userRole = session.user.role;
  const userDepartment = session.user.department;
  const userEmail = session.user.email || "";
  // Admins and PR department members (role=reviewer) can audit articles.
  const isPR = userRole === "admin" || userRole === "reviewer";

  const t = await getTranslations("review");
  const statusLabels: StatusLabels = {
    approved: t("status.approved"),
    rejected: t("status.rejected"),
    pending: t("status.pending"),
  };

  // 2. 根據身分撈取文章
  // - 公關部 (isPR): 撈取所有「待審核 (PENDING)」的文章
  // - 一般部門: 撈取「自己部門 (department)」的所有文章
  const targetPosts = isPR
    ? await prisma.post.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } })
    : await prisma.post.findMany({ 
        where: { department: userDepartment || "一般部門" }, 
        orderBy: { createdAt: "desc" } 
      });

  return (
    <div className="max-w-5xl mx-auto p-8 pt-24">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">
          {isPR ? t("prDashboardTitle") : t("deptDashboardTitle")}
        </h1>
        <p className="text-gray-500 mt-2">
          {isPR
            ? t("prDashboardSub")
            : t("deptDashboardSub", { email: userEmail })}
        </p>
      </div>

      {targetPosts.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-lg border border-dashed">
          <p className="text-gray-500 text-lg">
            {isPR ? t("emptyPR") : t("emptyDept")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {targetPosts.map((post) => (
            <div
              key={post.id}
              className="border border-gray-200 p-6 rounded-lg shadow-sm bg-white flex flex-col"
            >
              {/* 上半部：標題、資訊與按鈕 */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
                    {/* 一般部門顯示狀態 Badge，公關部如果是看 PENDING 也可以顯示 */}
                    {!isPR && <StatusBadge status={post.status} labels={statusLabels} />}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {isPR && (
                      <p>
                        <span className="font-medium">{t("submitterLabel")}</span> {post.authorName || post.authorEmail}
                        {post.department && ` (${post.department})`}
                      </p>
                    )}
                    <p><span className="font-medium">{t("submittedAtLabel")}</span> {new Date(post.createdAt).toLocaleString(t("dateLocale"), { timeZone: "Asia/Taipei" })}</p>
                    {post.status === "REJECTED" && post.rejectReason && (
                      <p className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-700">
                        <span className="font-bold">{t("rejectReasonLabel")}</span> {post.rejectReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* 只有公關部能看到審核按鈕 (Approve / Reject) */}
                {isPR && <ReviewButtons postId={post.id} />}

                {/* 作者或同部門成員可以看到「修改」按鈕 */}
                {!isPR && (
                  <Link
                    href={`/editor/${post.id}`}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    {t("actions.editButton")}
                  </Link>
                )}
              </div>

              {/* 下半部：文章內容預覽 (手風琴折疊) */}
              <details className="mt-4 border-t pt-4 group">
                <summary className="cursor-pointer text-[var(--color-brand-dark)] font-medium hover:opacity-80 outline-none list-none flex items-center gap-2">
                  <svg className="w-5 h-5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {t("viewContent")}
                </summary>

                <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-100">
                  {post.coverImage && (
                    <div className="mb-6">
                      <span className="text-sm text-gray-500 font-medium block mb-2">{t("coverPreviewLabel")}</span>
                      <img
                        src={post.coverImage}
                        alt={t("coverPreviewAlt")}
                        className="max-w-md w-full h-auto object-cover rounded-md shadow-sm"
                      />
                    </div>
                  )}

                  <span className="text-sm text-gray-500 font-medium block mb-2">{t("contentLabel")}</span>
                  <div
                    className="tiptap prose max-w-none bg-white p-4 border rounded-md"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />

                  <div className="mt-4 text-right">
                    <Link
                      href={`/post/${post.id}`}
                      target="_blank"
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      {t("previewInNewTab")}
                    </Link>
                  </div>
                </div>
              </details>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
