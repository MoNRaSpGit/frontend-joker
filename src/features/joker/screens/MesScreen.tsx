import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { EditarCierreDiaModal } from "../components/EditarCierreDiaModal";
import { GraficoVentasMensuales } from "../components/GraficoVentasMensuales";
import { editarCierreDia, getHistorialMeses, getResumenMes } from "../joker.api";
import type { JokerMonthDay, JokerMonthHistoryItem, JokerMonthSummary } from "../joker.types";

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const hoy = new Date();

export function MesScreen() {
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [resumen, setResumen] = useState<JokerMonthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [semanasAbiertas, setSemanasAbiertas] = useState<Set<number>>(new Set([1]));
  const [historial, setHistorial] = useState<JokerMonthHistoryItem[] | null>(null);
  const [diaEditando, setDiaEditando] = useState<JokerMonthDay | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setSemanasAbiertas(new Set([1]));
    getResumenMes(anio, mes)
      .then((data) => {
        setResumen(data);
        setLoadError(null);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "No se pudo cargar el resumen del mes."))
      .finally(() => setIsLoading(false));
  }, [anio, mes]);

  useEffect(() => {
    getHistorialMeses(6)
      .then((data) => setHistorial(data.items))
      .catch(() => setHistorial(null));
  }, []);

  function alternarSemana(numero: number) {
    setSemanasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(numero)) {
        next.delete(numero);
      } else {
        next.add(numero);
      }
      return next;
    });
  }

  function irMesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAnio((current) => current - 1);
    } else {
      setMes((current) => current - 1);
    }
  }

  function irMesSiguiente() {
    if (mes === 12) {
      setMes(1);
      setAnio((current) => current + 1);
    } else {
      setMes((current) => current + 1);
    }
  }

  async function handleGuardarCierre(total: number) {
    if (!diaEditando) return;

    try {
      await editarCierreDia(diaEditando.fecha, total);
      setResumen((prev) => {
        if (!prev) return prev;
        const semanas = prev.semanas.map((semana) => ({
          ...semana,
          dias: semana.dias.map((dia) => (dia.fecha === diaEditando.fecha ? { ...dia, total, cerrado: true } : dia))
        }));
        const semanasConTotales = semanas.map((semana) => ({
          ...semana,
          total: semana.dias.reduce((sum, dia) => sum + dia.total, 0)
        }));
        const totalMes = semanasConTotales.reduce((sum, semana) => sum + semana.total, 0);
        return { ...prev, semanas: semanasConTotales, total: totalMes };
      });
      toast.success("Cierre corregido.");
      setDiaEditando(null);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No se pudo corregir el cierre.");
      throw saveError;
    }
  }

  return (
    <div className="joker-mes-container">
      <div className="joker-mes-cabecera">
        <p className="joker-eyebrow">Mes</p>
        <div className="joker-mes-selector">
          <button type="button" className="joker-mes-btn-nav" onClick={irMesAnterior} aria-label="Mes anterior">
            ‹
          </button>
          <h2 className="joker-mes-titulo">
            {NOMBRES_MES[mes - 1]} {anio}
          </h2>
          <button type="button" className="joker-mes-btn-nav" onClick={irMesSiguiente} aria-label="Mes siguiente">
            ›
          </button>
        </div>
      </div>

      {loadError ? <p className="joker-order-item__excluded">{loadError}</p> : null}

      {isLoading ? (
        <p className="joker-empty-state">Cargando...</p>
      ) : resumen ? (
        <>
          <div className="joker-mes-total-box">
            <span className="joker-mes-total-label">Total del mes</span>
            <span className="joker-mes-total-valor">{formatPrice(resumen.total)}</span>
          </div>

          {resumen.semanas.map((semana) => {
            const abierta = semanasAbiertas.has(semana.numero);
            return (
              <div key={semana.numero} className="joker-mes-semana">
                <button
                  type="button"
                  className="joker-mes-semana-cabecera"
                  onClick={() => alternarSemana(semana.numero)}
                  aria-expanded={abierta}
                >
                  <span className="joker-mes-semana-flecha">{abierta ? "▾" : "▸"}</span>
                  <h6>Semana {semana.numero}</h6>
                  <span className="joker-mes-semana-total">{formatPrice(semana.total)}</span>
                </button>

                {abierta ? (
                  <table className="joker-mes-tabla">
                    <thead>
                      <tr>
                        <th>Dia</th>
                        <th>Fecha</th>
                        <th className="joker-mes-tabla__num">Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {semana.dias.map((dia) => (
                        <tr key={dia.fecha} className={dia.total === 0 ? "joker-mes-fila-sin-ventas" : ""}>
                          <td>{capitalizar(dia.diaSemana)}</td>
                          <td>{dia.fecha.split("-").reverse().join("/")}</td>
                          <td className="joker-mes-tabla__num">{formatPrice(dia.total)}</td>
                          <td className="joker-mes-fila-editar">
                            {dia.cerrado ? (
                              <button type="button" className="joker-mini-button" onClick={() => setDiaEditando(dia)}>
                                Editar
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            );
          })}
        </>
      ) : null}

      {historial && historial.some((item) => item.total > 0) ? <GraficoVentasMensuales meses={historial} /> : null}

      {diaEditando ? (
        <EditarCierreDiaModal
          fecha={diaEditando.fecha}
          totalActual={diaEditando.total}
          onCancelar={() => setDiaEditando(null)}
          onGuardar={handleGuardarCierre}
        />
      ) : null}
    </div>
  );
}
