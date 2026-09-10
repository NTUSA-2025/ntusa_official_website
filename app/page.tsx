import HomeClient from "../components/HomeClient";
import { getCachedHomePostPreviews } from "../lib/get-cached-home-posts";
import { getCachedMeetingMinutes } from "../lib/get-cached-meeting-minutes";

export default async function Home() {
  const [formattedPosts, minutes] = await Promise.all([
    getCachedHomePostPreviews(),
    getCachedMeetingMinutes(),
  ]);
  return <HomeClient posts={formattedPosts} initialMinutes={minutes} />;
}

