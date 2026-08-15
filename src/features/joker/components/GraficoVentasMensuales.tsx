import type { JokerMonthHistoryItem } from "../joker.types";

const NOMBRES_MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ANCHO = 640;
const ALTO = 220;
const PADDING_X = 24;
const PADDING_SUPERIOR = 34;
const PADDING_INFERIOR = 34;

function armarPathSuave(puntos: Array<{ x: number; y: number }>): string {
  if (puntos.length === 1) return `M ${puntos[0].x} ${puntos[0].y}`;

  let path = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const actual = puntos[i];
    const siguiente = puntos[i + 1];
    const mitadX = (actual.x + siguiente.x) / 2;
    path += ` C ${mitadX} ${actual.y}, ${mitadX} ${siguiente.y}, ${siguiente.x} ${siguiente.y}`;
  }
  return path;
}

function formatearPesos(valor: number) {
  return valor.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

type GraficoVentasMensualesProps = {
  meses: JokerMonthHistoryItem[];
};

export function GraficoVentasMensuales({ meses }: GraficoVentasMensualesProps) {
  const maximo = Math.max(...meses.map((m) => m.total), 1);
  const anchoUtil = ANCHO - PADDING_X * 2;
  const altoUtil = ALTO - PADDING_SUPERIOR - PADDING_INFERIOR;

  const puntos = meses.map((m, i) => {
    const x = meses.length === 1 ? PADDING_X + anchoUtil / 2 : PADDING_X + (i / (meses.length - 1)) * anchoUtil;
    const y = PADDING_SUPERIOR + altoUtil - (m.total / maximo) * altoUtil;
    return { x, y, ...m };
  });

  const pathLinea = armarPathSuave(puntos);
  const pathArea = `${pathLinea} L ${puntos[puntos.length - 1].x} ${PADDING_SUPERIOR + altoUtil} L ${puntos[0].x} ${PADDING_SUPERIOR + altoUtil} Z`;

  const lineasGrilla = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="joker-panel joker-mes-grafico">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Historico</p>
        <h2>Ventas por mes</h2>
      </div>
      <div className="joker-mes-grafico-card">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="joker-mes-grafico-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label="Ventas en pesos por mes"
        >
          <defs>
            <linearGradient id="joker-mes-relleno" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b1b23" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6b1b23" stopOpacity="0" />
            </linearGradient>
          </defs>

          {lineasGrilla.map((fraccion) => {
            const y = PADDING_SUPERIOR + altoUtil * fraccion;
            return <line key={fraccion} x1={PADDING_X} y1={y} x2={ANCHO - PADDING_X} y2={y} className="joker-mes-grafico-grilla" />;
          })}

          <path d={pathArea} fill="url(#joker-mes-relleno)" stroke="none" />
          <path d={pathLinea} fill="none" stroke="#6b1b23" strokeWidth="2.5" strokeLinecap="round" />

          {puntos.map((p) => (
            <g key={`${p.anio}-${p.mes}`}>
              {p.total > 0 ? (
                <text x={p.x} y={p.y - 12} textAnchor="middle" className="joker-mes-grafico-valor">
                  {formatearPesos(p.total)}
                </text>
              ) : null}
              <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#6b1b23" strokeWidth="2.5" />
              <title>
                {NOMBRES_MES_CORTO[p.mes - 1]} {p.anio}: {formatearPesos(p.total)}
              </title>
              <text x={p.x} y={ALTO - 10} textAnchor="middle" className="joker-mes-grafico-etiqueta">
                {NOMBRES_MES_CORTO[p.mes - 1]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
