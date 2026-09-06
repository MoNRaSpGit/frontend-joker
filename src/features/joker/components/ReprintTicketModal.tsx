type ReprintTicketModalProps = {
  orderNumber: number;
  isPrinting: boolean;
  onSelect: (copies: 0 | 1 | 3) => void;
  onClose: () => void;
};

// Elegir cuantas copias reimprimir de un pedido ya confirmado -- mismo
// criterio (0/1/3 tick) que ya se usa al cargar un pedido nuevo o al
// aceptar uno pendiente (ver PendingOrderModal), asi queda todo con el
// mismo lenguaje en toda la app. Tocar una opcion imprime al toque, no
// hace falta un boton de confirmar aparte.
export function ReprintTicketModal({ orderNumber, isPrinting, onSelect, onClose }: ReprintTicketModalProps) {
  return (
    <div
      className="joker-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Reimprimir pedido"
      onClick={() => {
        if (!isPrinting) onClose();
      }}
    >
      <div className="joker-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="joker-modal-card__header">
          <h2>Reimprimir pedido #{orderNumber}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isPrinting}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">Sale tal cual esta guardado ahora (con cualquier edicion ya hecha).</p>

        <div className="joker-category-chips">
          <button type="button" className="joker-category-chip" disabled={isPrinting} onClick={() => onSelect(1)}>
            1 tick
          </button>
          <button type="button" className="joker-category-chip" disabled={isPrinting} onClick={() => onSelect(3)}>
            3 tick
          </button>
          <button
            type="button"
            className="joker-category-chip"
            disabled={isPrinting}
            onClick={() => onSelect(0)}
            style={{ marginLeft: 8 }}
            title="Cerrar sin imprimir nada"
          >
            0 tick
          </button>
        </div>

        {isPrinting ? <p className="joker-empty-state">Imprimiendo...</p> : null}
      </div>
    </div>
  );
}
