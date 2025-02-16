import { getHumeAccessToken } from "@/lib/hume";
import { ChatWrapper } from "@/components/hume/chat-wrapper";

export default async function ChatPage() {
  const accessToken = await getHumeAccessToken();

  if (!accessToken) {
    throw new Error("Failed to get Hume access token");
  }

  return <ChatWrapper accessToken={accessToken} />;
} 