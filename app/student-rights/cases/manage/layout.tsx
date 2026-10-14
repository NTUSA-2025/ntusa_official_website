import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isStudentRightsCaseManager } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

export default async function PublicCaseManageLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/student-rights/cases/manage");
  }
  if (!isStudentRightsCaseManager(session)) redirect("/");

  return children;
}
