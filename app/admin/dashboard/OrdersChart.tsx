type Datum = { date: string; value: number };

export default function OrdersChart({
  data,
  formatTooltip,
  formatBarLabel,
}: {
  data: Datum[];
  formatTooltip?: (d: Datum) => string;
  formatBarLabel?: (d: Datum) => string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-400 font-serif italic">Aucune donnée.</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600;
  const H = 160;
  const PAD_X = 28;
  const PAD_Y = 16;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const barW = innerW / data.length;
  const gap = barW * 0.2;

  // Étiquettes mois (premier jour de chaque mois) si série en jours, sinon premières dates espacées
  const isDaily = data.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date));
  const ticks = isDaily
    ? data.map((d, i) => ({ d, i })).filter(({ d }) => d.date.endsWith('-01'))
    : data.map((d, i) => ({ d, i })).filter((_, i, arr) => i === 0 || i === arr.length - 1);

  // Affichage label au-dessus de la barre uniquement si la série est courte (sinon ça empile illisible)
  const showBarLabels = data.length <= 31;

  function formatTick(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', { month: 'short' });
    }
    if (/^\d{4}-\d{2}$/.test(date)) {
      return new Date(date + '-01T00:00:00Z').toLocaleDateString('fr-FR', { month: 'short' });
    }
    return date;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Graphique sur la période">
        <line x1={PAD_X} x2={W - PAD_X} y1={H - PAD_Y} y2={H - PAD_Y} stroke="#e5e5e5" strokeWidth={1} />

        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = PAD_X + i * barW + gap / 2;
          const y = H - PAD_Y - h;
          const isLast = i === data.length - 1;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW - gap}
                height={h}
                fill={isLast ? '#2C5530' : d.value > 0 ? '#5a8a5e' : '#e5e5e5'}
              >
                <title>{formatTooltip ? formatTooltip(d) : `${d.date} — ${d.value}`}</title>
              </rect>
              {showBarLabels && d.value > 0 && (
                <text x={x + (barW - gap) / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="#525252">
                  {formatBarLabel ? formatBarLabel(d) : d.value}
                </text>
              )}
            </g>
          );
        })}

        {ticks.map(({ d, i }) => {
          const x = PAD_X + i * barW + barW / 2;
          return (
            <text key={`tick-${d.date}`} x={x} y={H - 2} textAnchor="middle" fontSize="9" fill="#737373">
              {formatTick(d.date)}
            </text>
          );
        })}

        <text x={PAD_X - 4} y={PAD_Y + 4} textAnchor="end" fontSize="9" fill="#737373">
          {formatBarLabel ? formatBarLabel({ date: '', value: max }) : max}
        </text>
      </svg>
    </div>
  );
}
