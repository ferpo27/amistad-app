import { BotResponse } from "../types/bot";

export async function getBotResponse(message: string): Promise<string> {
  const apiUrl = process.env.BOT_API_URL;
  if (!apiUrl) {
    throw new Error("BOT_API_URL is not defined in environment variables.");
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Bot API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

   const data = await res.json() as any;

    if (!data || typeof (data as any).reply !== "string") {
      throw new Error("Invalid response format from bot API.");
    }

    return (data as any).reply;
  } catch (error) {
    console.error("Error fetching bot response:", error);
    throw error;
  }
}