import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

type ServiceNoticeProps = {
  // Modulo del backend que responde /<appPath>/notice (distribuidora, eme, gaby).
  appPath: string;
  // Apps con login mandan su token; las que no tienen login (eme, gaby) no.
  token?: string;
};

// Aviso de demora (16/11/2026): se activa desde Scrum (Clientes) para esta
// app. Franja amarilla arriba, chica; al tocarla se expande con el mensaje
// completo y la cruz la cierra (vuelve en la proxima visita mientras siga
// activo en Scrum). Si el servidor no responde, no pasa nada.
export function ServiceNotice({ appPath, token }: ServiceNoticeProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const shownKey = `service-notice.${appPath}.${token ? token.slice(-12) : "app"}`;
    try {
      if (sessionStorage.getItem(shownKey) === "1") return;
    } catch {
      // sin sessionStorage: se muestra igual.
    }
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/v1/${appPath}/notice`, { headers })
      .then((response) => (response.ok ? (response.json() as Promise<{ active?: boolean }>) : null))
      .then((data) => {
        if (cancelled || !data?.active) return;
        setVisible(true);
        void fetch(`${API_BASE_URL}/api/v1/${appPath}/notice/seen`, { method: "POST", headers }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [appPath, token]);

  function close() {
    try {
      sessionStorage.setItem(`service-notice.${appPath}.${token ? token.slice(-12) : "app"}`, "1");
    } catch {
      // ignorar
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "#fde68a",
        color: "#78350f",
        borderBottom: "2px solid #f59e0b",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: 14,
        lineHeight: 1.35
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        style={{ flex: 1, display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: "transparent", border: "none", color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
      >
        <span aria-hidden="true">⚠</span>
        {expanded ? (
          <span style={{ display: "grid", gap: 2 }}>
            <strong>Estimado cliente</strong>
            <span>Le recordamos que su servicio se encuentra vencido. Por favor, comuníquese con su proveedor.</span>
          </span>
        ) : (
          <strong>Aviso sobre su servicio · tocá para ver más</strong>
        )}
      </button>
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar aviso"
        style={{ padding: "0 16px", background: "transparent", border: "none", color: "inherit", font: "inherit", fontSize: 16, cursor: "pointer" }}
      >
        ✕
      </button>
    </div>
  );
}
