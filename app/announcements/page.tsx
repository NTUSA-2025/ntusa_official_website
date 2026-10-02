import AnnouncementsPageClient from "@/components/public-pages/AnnouncementsPageClient";
import { getCachedHomePostPreviews } from "@/lib/get-cached-home-posts";

export default async function AnnouncementsPage() {
  const posts = await getCachedHomePostPreviews();
  return <AnnouncementsPageClient posts={posts} />;
}
