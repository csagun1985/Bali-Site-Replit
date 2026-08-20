import { isReplitRuntime, requireChatGPTUser } from "./chatgpt-auth";
import TripHub from "./trip-hub";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isReplitRuntime()) await requireChatGPTUser("/");
  return <TripHub />;
}
