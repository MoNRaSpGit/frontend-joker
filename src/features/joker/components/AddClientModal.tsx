import { useState } from "react";

type AddClientModalProps = {
  onClose: () => void;
  onSave: (name: string, phone?: string, address?: string) => Promise<void>;
};

export function AddClientModal({ onClose, onSave }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmedName, phone, address);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo agregar el cliente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Agregar cliente">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Agregar cliente</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="joker-form-field">
            <span>Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Juan Perez"
              disabled={isSaving}
              autoFocus
            />
          </label>
          <label className="joker-form-field">
            <span>Telefono</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="099 000 000"
              disabled={isSaving}
            />
          </label>
          <label className="joker-form-field">
            <span>Direccion</span>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ej: Av. 18 de Julio 1234"
              disabled={isSaving}
            />
          </label>

          {error ? <p className="joker-order-item__excluded">{error}</p> : null}

          <div className="joker-modal-card__actions">
            <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="joker-button joker-button--primary" disabled={isSaving}>
              {isSaving ? "Agregando..." : "Agregar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
