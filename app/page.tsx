import HomeClient from "../components/HomeClient";
import { getCachedHomePostPreviews } from "../lib/get-cached-home-posts";
import { getCachedMeetingMinutes } from "../lib/get-cached-meeting-minutes";
import { getCachedPublicCases } from "../lib/get-cached-public-cases";

export default async function Home() {
  const [formattedPosts, minutes, publicCases] = await Promise.all([
    getCachedHomePostPreviews(),
    getCachedMeetingMinutes(),
    getCachedPublicCases(),
  ]);
  return <HomeClient posts={formattedPosts} initialMinutes={minutes} initialPublicCases={publicCases} />;
}
