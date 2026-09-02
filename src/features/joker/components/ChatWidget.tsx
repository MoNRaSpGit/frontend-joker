import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { listChatMessages, sendChatMessage } from "../joker.api";
import type { JokerChatMessage, JokerRole } from "../joker.types";

type ChatWidgetProps = {
  role: JokerRole;
};

const OTHER_ROLE_LABEL: Record<JokerRole, string> = {
  administrador: "Usuario",
  usuario: "Administrador"
};

// Cuanto se leyo por ultima vez, por rol -- guardado en el navegador de
// cada uno (sessionStorage, no localStorage: si mañana el rol lo elige
// otra persona en el mismo dispositivo, no hereda "leido" de quien uso
// el rol antes). Con esto alcanza para el globito de "no leidos", sin
// necesitar una columna de lectura en el backend.
function readLastSeenId(role: JokerRole): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(`joker.chat.lastSeenId.${role}`);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeLastSeenId(role: JokerRole, id: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`joker.chat.lastSeenId.${role}`, String(id));
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
}

// Chat interno basico Administrador <-> Usuario -- un globito fijo abajo
// a la derecha (como cualquier chat de soporte web) que abre un panel
// chico con la conversacion. Un solo canal compartido: no hay que elegir
// destinatario, ya se sabe que del otro lado esta "el otro rol".
export function ChatWidget({ role }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<JokerChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastSeenId, setLastSeenId] = useState(() => readLastSeenId(role));
  const listRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Refresco cada 1s (mismo criterio que el resto de la app) -- asi un
  // mensaje del otro lado aparece practicamente al toque, este abierto o
  // cerrado el panel (cerrado, solo actualiza el globito de no leidos).
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await listChatMessages();
        if (cancelled) return;
        setMessages(result.items);
        if (isOpenRef.current && result.items.length) {
          const newestId = result.items[result.items.length - 1].id;
          writeLastSeenId(role, newestId);
          setLastSeenId(newestId);
        }
      } catch {
        // Un mensaje que no llega no es motivo para tapar la pantalla con
        // un error -- se reintenta solo en el proximo poll.
      }
    }

    void poll();
    const intervalId = window.setInterval(poll, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [role]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [isOpen, messages.length]);

  function handleOpen() {
    setIsOpen(true);
    if (messages.length) {
      const newestId = messages[messages.length - 1].id;
      writeLastSeenId(role, newestId);
      setLastSeenId(newestId);
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const result = await sendChatMessage(role, trimmed);
      setMessages((current) => [...current, result.item]);
      writeLastSeenId(role, result.item.id);
      setLastSeenId(result.item.id);
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo mandar el mensaje.");
    } finally {
      setIsSending(false);
    }
  }

  const unreadCount = messages.filter((m) => m.id > lastSeenId && m.senderRole !== role).length;

  return (
    <div className="joker-chat-widget">
      {isOpen ? (
        <div className="joker-chat-panel">
          <div className="joker-chat-panel__header">
            <span>💬 {OTHER_ROLE_LABEL[role]}</span>
            <button type="button" className="joker-chat-panel__close" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
              ✕
            </button>
          </div>

          <div className="joker-chat-panel__messages" ref={listRef}>
            {messages.length === 0 ? (
              <p className="joker-empty-state">Todavia no hay mensajes.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`joker-chat-bubble ${m.senderRole === role ? "joker-chat-bubble--own" : "joker-chat-bubble--other"}`}>
                  <p>{m.message}</p>
                  <span className="joker-chat-bubble__time">{formatTime(m.createdAt)}</span>
                </div>
              ))
            )}
          </div>

          <form className="joker-chat-panel__form" onSubmit={handleSend}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribi un mensaje..."
              maxLength={1000}
              disabled={isSending}
            />
            <button type="submit" disabled={isSending || !draft.trim()}>
              Enviar
            </button>
          </form>
        </div>
      ) : (
        <button type="button" className="joker-chat-fab" onClick={handleOpen}>
          💬
          {unreadCount > 0 ? <span className="joker-chat-fab__badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
        </button>
      )}
    </div>
  );
}
