import "server-only";
import { fetchAccessToken } from "hume";

export const getHumeAccessToken = async () => {
  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    secretKey: String(process.env.HUME_SECRET_KEY),
  });

  if (accessToken === "undefined") {
    return null;
  }

  return accessToken ?? null;
};

export const fetchChatEvents = async (chatId: string) => {
  const accessToken = await getHumeAccessToken();
  if (!accessToken) return null;

  const response = await fetch(`https://api.hume.ai/v0/evi/chats/${chatId}/events`, {
    headers: {
      "X-Hume-Api-Key": String(process.env.HUME_API_KEY),
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch chat events:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.events;
}; 