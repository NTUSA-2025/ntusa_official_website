import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "../../../lib/prisma";
import Editor from "../../../components/Editor";
import { getTranslations } from "next-intl/server";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  // 1. 取得原始文章資料
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) {
    notFound();
  }

  // 2. 權限驗證：只有「原作者本人」或「同部門成員」或「具備管理權限 (admin/公關部)」可以修改文章
  const userEmail = session.user.email;
  const userRole = session.user.role;
  const userDepartment = session.user.department;

  const isAuthor = post.authorEmail === userEmail;
  const isDeptMember = post.department === userDepartment;
  const isReviewer = userRole === "admin" || userRole === "reviewer" || userDepartment === "公關部";

  if (!isAuthor && !isDeptMember && !isReviewer) {
    redirect("/review"); // 權限不足則跳回儀表板
  }

  const t = await getTranslations("editor");

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-sm mt-8 rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">{t("pageTitle")}</h1>
      <Editor 
        authorEmail={session.user.email as string} 
        department={session.user.department as string}
        userRole={session.user.role as string}
        initialData={{
          id: post.id,
          title: post.title,
          content: post.content,
          coverImage: post.coverImage,
          status: post.status,
        }}
      />
    </div>
  );
}
