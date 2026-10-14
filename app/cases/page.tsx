import CasesPageClient from "@/components/public-pages/CasesPageClient";
import { getCachedPublicCases } from "@/lib/get-cached-public-cases";

export default async function CasesPage() {
  const publicCases = await getCachedPublicCases();
  return <CasesPageClient publicCases={publicCases} />;
}
