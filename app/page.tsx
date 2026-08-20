import { requireChatGPTUser } from "./chatgpt-auth";
import TripHub from "./trip-hub";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireChatGPTUser("/");
  return <TripHub />;
}
