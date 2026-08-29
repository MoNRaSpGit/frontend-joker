import { useState } from "react";
import { loginJoker } from "../joker.api";
import type { JokerRole } from "../joker.types";

type JokerRoleLoginScreenProps = {
  onSelectRole: (role: JokerRole) => void;
};

// Login simple: elegis el rol y despues pide la contrasena de ese rol
// (fija por rol, no por persona -- ver JokerAuthService en el backend).
// No hay sesion ni token, solo valida contra el backend antes de dejar
// pasar; el rol elegido se guarda igual que antes en sessionStorage.
export function JokerRoleLoginScreen({ onSelectRole }: JokerRoleLoginScreenProps) {
  const [pickedRole, setPickedRole] = useState<JokerRole | null>(null);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handlePickRole(role: JokerRole) {
    setPickedRole(role);
    setPassword("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pickedRole || !password) return;

    setIsSubmitting(true);
    setError("");
    try {
      await loginJoker(pickedRole, password);
      onSelectRole(pickedRole);
    } catch {
      setError("Contrasena incorrecta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="joker-app joker-login-screen">
      <div className="joker-login-card joker-panel">
        <img className="joker-brand__mark joker-login-card__logo" src={`${import.meta.env.BASE_URL}icons/logo-joker-mark.png`} alt="El Joker" />
        <h1>Ingresar</h1>

        {!pickedRole ? (
          <>
            <p className="joker-login-card__hint">Elegi con que rol queres entrar.</p>
            <div className="joker-login-card__actions">
              <button type="button" className="joker-button joker-button--primary" onClick={() => handlePickRole("administrador")}>
                Administrador
              </button>
              <button type="button" className="joker-button joker-button--ghost" onClick={() => handlePickRole("usuario")}>
                Usuario
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <p className="joker-login-card__hint">
              Contrasena de {pickedRole === "administrador" ? "Administrador" : "Usuario"}
            </p>
            <label className="joker-form-field">
              <span>Contrasena</span>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
              />
            </label>
            {error && <p className="joker-order-item__excluded">{error}</p>}
            <div className="joker-login-card__actions">
              <button type="submit" className="joker-button joker-button--primary" disabled={isSubmitting || !password}>
                {isSubmitting ? "Entrando..." : "Entrar"}
              </button>
              <button
                type="button"
                className="joker-button joker-button--ghost"
                disabled={isSubmitting}
                onClick={() => setPickedRole(null)}
              >
                Volver
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
