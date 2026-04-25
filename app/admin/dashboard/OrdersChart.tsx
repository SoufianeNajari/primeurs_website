type Datum = { date: string; count: number };

export default function OrdersChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-400 font-serif italic">Aucune donnée.</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 600;
  const H = 160;
  const PAD_X = 24;
  const PAD_Y = 16;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const barW = innerW / data.length;
  const gap = barW * 0.2;

  // Étiquettes mois (premier jour de chaque mois)
  const monthTicks = data
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.date.endsWith('-01'));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Commandes par jour sur 30 jours">
        {/* axe horizontal */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={H - PAD_Y}
          y2={H - PAD_Y}
          stroke="#e5e5e5"
          strokeWidth={1}
        />

        {/* barres */}
        {data.map((d, i) => {
          const h = (d.count / max) * innerH;
          const x = PAD_X + i * barW + gap / 2;
          const y = H - PAD_Y - h;
          const isToday = i === data.length - 1;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW - gap}
                height={h}
                fill={isToday ? '#2C5530' : d.count > 0 ? '#5a8a5e' : '#e5e5e5'}
              >
                <title>{`${d.date} — ${d.count} commande${d.count > 1 ? 's' : ''}`}</title>
              </rect>
              {d.count > 0 && (
                <text
                  x={x + (barW - gap) / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#525252"
                >
                  {d.count}
                </text>
              )}
            </g>
          );
        })}

        {/* étiquettes mois */}
        {monthTicks.map(({ d, i }) => {
          const x = PAD_X + i * barW + barW / 2;
          const monthLabel = new Date(d.date + 'T00:00:00Z').toLocaleDateString('fr-FR', {
            month: 'short',
          });
          return (
            <text
              key={`tick-${d.date}`}
              x={x}
              y={H - 2}
              textAnchor="middle"
              fontSize="9"
              fill="#737373"
            >
              {monthLabel}
            </text>
          );
        })}

        {/* repère max */}
        <text x={PAD_X - 4} y={PAD_Y + 4} textAnchor="end" fontSize="9" fill="#737373">
          {max}
        </text>
      </svg>
    </div>
  );
}
