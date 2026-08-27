type PendingOrderBadgeProps = {
  arrivalNumber: number;
  bottomOffset: number;
  onClick: () => void;
};

// Cartelito fijo (estilo toast, pero persistente) que avisa que hay un
// pedido de mostrador esperando aprobacion, sin interrumpir lo que este
// haciendo el Administrador. Recien al hacer click se abre el pop-up con
// el detalle y los botones de Aceptar/Cancelar. Cuando hay varios
// pedidos pendientes a la vez, se renderiza un cartelito por pedido
// (ver JokerHomePage) en vez de uno solo con contador, escalonados con
// bottomOffset: el primero (el mas viejo) queda mas arriba. arrivalNumber
// es el orden de llegada (1, 2, 3...), no el numero real de cocina --
// ese recien se asigna al aceptar (ver joker-orders.service.ts#acceptOrder).
export function PendingOrderBadge({ arrivalNumber, bottomOffset, onClick }: PendingOrderBadgeProps) {
  return (
    <button
      type="button"
      className="joker-pending-order-badge"
      style={{ bottom: bottomOffset }}
      onClick={onClick}
    >
      <span className="joker-pending-order-badge__dot" />
      Pedido pendiente #{arrivalNumber}
    </button>
  );
}
