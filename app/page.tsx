import HomePageClient from "@/components/public-pages/HomePageClient";
import LegacyHomeHashRedirect from "@/components/LegacyHomeHashRedirect";
import { getCachedHomePostPreviews } from "@/lib/get-cached-home-posts";

export default async function Home() {
  const posts = await getCachedHomePostPreviews();

  return (
    <>
      <LegacyHomeHashRedirect />
      <HomePageClient posts={posts} />
    </>
  );
}
