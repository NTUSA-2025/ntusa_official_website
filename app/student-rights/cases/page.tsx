import { redirect } from "next/navigation";

// Keep the former public cases route working.
export default function PublicCasesPage() {
  redirect("/cases");
}
