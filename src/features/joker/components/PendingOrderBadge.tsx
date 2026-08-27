type PendingOrderBadgeProps = {
  count: number;
  onClick: () => void;
};

// Cartelito fijo (estilo toast, pero persistente) que avisa que hay
// pedidos de mostrador esperando aprobacion, sin interrumpir lo que este
// haciendo el Administrador. Recien al hacer click se abre el pop-up con
// el detalle y los botones de Aceptar/Cancelar.
export function PendingOrderBadge({ count, onClick }: PendingOrderBadgeProps) {
  return (
    <button type="button" className="joker-pending-order-badge" onClick={onClick}>
      <span className="joker-pending-order-badge__dot" />
      Pedido pendiente{count > 1 ? ` (${count})` : ""}
    </button>
  );
}
