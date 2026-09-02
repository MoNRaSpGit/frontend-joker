import { API_BASE_URL, readJson } from "./shared";
import type { JokerChatMessage, JokerRole } from "../joker.types";

type ChatMessageListResponse = {
  items: JokerChatMessage[];
};

type ChatMessageResponse = {
  item: JokerChatMessage;
};

export async function listChatMessages(): Promise<ChatMessageListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/chat/messages`, { cache: "no-store" });
  return readJson<ChatMessageListResponse>(response);
}

export async function sendChatMessage(senderRole: JokerRole, message: string): Promise<ChatMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/chat/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderRole, message })
  });
  return readJson<ChatMessageResponse>(response);
}
