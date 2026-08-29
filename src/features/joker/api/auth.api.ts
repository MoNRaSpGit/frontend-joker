import { API_BASE_URL, readJson } from "./shared";

// Login simple por rol (Administrador/Usuario): valida la contrasena
// contra el hash guardado en la base. Tira error (readJson) si no
// coincide -- readJson ya arma un mensaje legible a partir del 401.
export async function loginJoker(role: "administrador" | "usuario", password: string): Promise<{ ok: true }> {
  const response = await fetch(`${API_BASE_URL}/joker/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, password })
  });
  return readJson<{ ok: true }>(response);
}
