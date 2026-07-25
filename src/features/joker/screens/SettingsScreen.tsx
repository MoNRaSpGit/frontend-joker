import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getSettings, updateSettings } from "../joker.api";
import type { JokerSettings } from "../joker.types";

type SettingsScreenProps = {
  onSettingsSaved: (settings: JokerSettings) => void;
};

export function SettingsScreen({ onSettingsSaved }: SettingsScreenProps) {
  const [settings, setSettings] = useState<JokerSettings | null>(null);
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getSettings();
      setSettings(result.item);
      setStoreName(result.item.storeName);
      setAddress(result.item.address);
      setPhone(result.item.phone);
    } catch (fetchError) {
      setLoadError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la configuracion.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    try {
      const result = await updateSettings({ storeName: storeName.trim(), address: address.trim(), phone: phone.trim() });
      setSettings(result.item);
      onSettingsSaved(result.item);
      toast.success("Datos del local actualizados.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="joker-panel">
        <p className="joker-empty-state">Cargando configuracion...</p>
      </section>
    );
  }

  if (loadError || !settings) {
    return (
      <section className="joker-panel">
        <p className="joker-order-item__excluded">No se pudo cargar la configuracion: {loadError}</p>
        <button type="button" className="joker-button joker-button--ghost" onClick={loadSettings}>
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Local</p>
        <h2>Datos del ticket</h2>
      </div>

      <p className="joker-modal-card__hint">
        Este nombre, direccion y telefono son los que se imprimen en el encabezado de cada ticket.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="joker-form-field">
          <span>Nombre del local</span>
          <input type="text" value={storeName} onChange={(event) => setStoreName(event.target.value)} disabled={isSaving} />
        </label>

        <label className="joker-form-field">
          <span>Direccion</span>
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            disabled={isSaving}
            placeholder="Ej: Av. 18 de Julio 1234"
          />
        </label>

        <label className="joker-form-field">
          <span>Telefono</span>
          <input
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isSaving}
            placeholder="Ej: 099 123 456"
          />
        </label>

        <button type="submit" className="joker-button joker-button--primary" disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </section>
  );
}
