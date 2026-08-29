import { API_BASE_URL, readJson } from "./shared";
import type { JokerClient } from "../joker.types";

type ClientListResponse = {
  items: JokerClient[];
};

type ClientResponse = {
  item: JokerClient;
};

export type JokerClientInput = {
  name: string;
  phone?: string;
  address?: string;
};

export async function listClients(): Promise<ClientListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/clients`, { cache: "no-store" });
  return readJson<ClientListResponse>(response);
}

export async function createClient(input: JokerClientInput): Promise<ClientResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<ClientResponse>(response);
}

export async function deleteClient(clientId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/clients/${clientId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}
