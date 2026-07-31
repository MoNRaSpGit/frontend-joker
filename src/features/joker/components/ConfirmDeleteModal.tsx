type ConfirmDeleteModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmLabelBusy?: string;
  variant?: "danger" | "primary";
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  title,
  message,
  confirmLabel = "Eliminar",
  confirmLabelBusy = "Eliminando...",
  variant = "danger",
  isDeleting = false,
  onCancel,
  onConfirm
}: ConfirmDeleteModalProps) {
  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{title}</h2>
          <button type="button" className="joker-modal-close" onClick={onCancel} disabled={isDeleting}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">{message}</p>

        <div className="joker-modal-card__actions">
          <button type="button" className="joker-button joker-button--ghost" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </button>
          <button
            type="button"
            className={`joker-button joker-button--${variant}`}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? confirmLabelBusy : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
