import { useEffect, useState } from "react";
import { clearPreferredPrinterName, listQzPrinters, setPreferredPrinterName } from "../services/joker.qzPrint";

type PrinterSettingsModalProps = {
  currentPrinterName: string | null;
  onClose: () => void;
  onPrinterChange: (name: string | null) => void;
};

export function PrinterSettingsModal({ currentPrinterName, onClose, onPrinterChange }: PrinterSettingsModalProps) {
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPrinters() {
      setIsLoading(true);
      setError("");
      try {
        const found = await listQzPrinters();
        if (active) setPrinters(found);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? `No se pudo conectar a QZ Tray: ${loadError.message}`
              : "No se pudo conectar a QZ Tray."
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadPrinters();
    return () => {
      active = false;
    };
  }, []);

  function handleSelect(name: string) {
    setPreferredPrinterName(name);
    onPrinterChange(name);
    onClose();
  }

  function handleForget() {
    clearPreferredPrinterName();
    onPrinterChange(null);
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Elegir impresora">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Impresora</h2>
          <button type="button" className="joker-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">
          {currentPrinterName ? (
            <>
              Usando ahora: <strong>{currentPrinterName}</strong>
            </>
          ) : (
            "Todavia no elegiste ninguna impresora."
          )}
        </p>

        {isLoading ? <p className="joker-empty-state">Buscando impresoras (QZ Tray)...</p> : null}
        {error ? <p className="joker-order-item__excluded">{error}</p> : null}

        {!isLoading && !error ? (
          printers.length ? (
            <ul className="joker-printer-list">
              {printers.map((printer) => (
                <li key={printer}>
                  <button
                    type="button"
                    className={`joker-printer-option ${printer === currentPrinterName ? "is-active" : ""}`}
                    onClick={() => handleSelect(printer)}
                  >
                    {printer}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="joker-empty-state">QZ Tray no detecto ninguna impresora instalada.</p>
          )
        ) : null}

        {currentPrinterName ? (
          <button type="button" className="joker-button joker-button--ghost" onClick={handleForget}>
            Olvidar impresora guardada
          </button>
        ) : null}
      </div>
    </div>
  );
}
