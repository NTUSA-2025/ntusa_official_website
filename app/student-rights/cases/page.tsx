import { redirect } from "next/navigation";

// Keep old links working while the public experience lives alongside #about on the home page.
export default function PublicCasesPage() {
  redirect("/#cases");
}
