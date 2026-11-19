import PublicCaseManager from "@/components/student-rights/PublicCaseManager";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canManageStudentRightsCaseTags, isPublicCaseTableMissing } from "@/lib/student-rights-cases";
import { redirect } from "next/navigation";

export default async function NewPublicCasePage() {
  const session = await getServerSession(authOptions);
  let tags: { id: string; name: string }[] = [];
  try {
    tags = await prisma.caseTag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  } catch (error) {
    if (!isPublicCaseTableMissing(error)) throw error;
    redirect("/student-rights/cases/manage");
  }
  return <PublicCaseManager tagOptions={tags} canCreateTags={canManageStudentRightsCaseTags(session)} />;
}
