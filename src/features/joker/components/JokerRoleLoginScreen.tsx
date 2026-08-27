import type { JokerRole } from "../joker.types";

type JokerRoleLoginScreenProps = {
  onSelectRole: (role: JokerRole) => void;
};

// Login "clasico" sin contraseña ni backend: solo separa visualmente que
// puede ver un Usuario (armar pedidos) de un Administrador (todo), para
// mostrarle al cliente la idea de roles sin meterse todavia con seguridad
// de verdad.
export function JokerRoleLoginScreen({ onSelectRole }: JokerRoleLoginScreenProps) {
  return (
    <div className="joker-app joker-login-screen">
      <div className="joker-login-card joker-panel">
        <img className="joker-brand__mark joker-login-card__logo" src={`${import.meta.env.BASE_URL}icons/logo-joker-mark.png`} alt="El Joker" />
        <h1>Ingresar</h1>
        <p className="joker-login-card__hint">Elegi con que rol queres entrar.</p>

        <div className="joker-login-card__actions">
          <button type="button" className="joker-button joker-button--primary" onClick={() => onSelectRole("administrador")}>
            Administrador
          </button>
          <button type="button" className="joker-button joker-button--ghost" onClick={() => onSelectRole("usuario")}>
            Usuario
          </button>
        </div>
      </div>
    </div>
  );
}
