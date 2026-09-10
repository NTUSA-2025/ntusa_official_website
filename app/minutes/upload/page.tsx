import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import prisma from "../../../lib/prisma";
import { getTranslations } from "next-intl/server";
import MinutesUploadManager from "../../../components/MinutesUploadManager";

export default async function MinutesUploadPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect("/api/auth/signin?callbackUrl=/minutes/upload");
  }

  const t = await getTranslations("minutesUpload");

  const minutes = await prisma.meetingMinute.findMany({
    orderBy: { date: "desc" },
  });

  const formattedMinutes = minutes.map((m) => ({
    id: m.id,
    title: m.title,
    date: m.date,
    url: m.url,
    authorEmail: m.authorEmail,
    authorName: m.authorName,
    department: m.department,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pt-28">
      <div className="mb-8 border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-800">
          {t("pageTitle")}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t("pageDescription")}
        </p>
      </div>

      <MinutesUploadManager
        initialMinutes={formattedMinutes}
        currentUserEmail={session.user.email}
        currentUserRole={session.user.role}
        currentUserDepartment={session.user.department}
      />
    </div>
  );
}
