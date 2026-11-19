import React, { useMemo } from 'react';
import {
  DIMENSION_KEYS,
  type InstrumentConfig,
  type RoomResponse,
  type ScaleType,
} from '../utils/emotiSam';
import {
  computeAffectiveGridPoints,
  computeBoxplotStats,
  computeDivergingRow,
  getScaleMidpoint,
} from '../utils/statistics';

interface ScientificChartsProps {
  responses: RoomResponse[];
  scale: ScaleType;
  instrumentConfig: InstrumentConfig;
}

export const ScientificCharts: React.FC<ScientificChartsProps> = ({
  responses,
  scale,
  instrumentConfig,
}) => {
  const mid = getScaleMidpoint(scale);

  const divergingRows = useMemo(
    () =>
      DIMENSION_KEYS.map((key) =>
        computeDivergingRow(responses, scale, key, instrumentConfig.dimensions[key].title)
      ),
    [responses, scale, instrumentConfig]
  );

  const boxplots = useMemo(
    () =>
      DIMENSION_KEYS.map((key) =>
        computeBoxplotStats(responses, key, instrumentConfig.dimensions[key].title)
      ),
    [responses, instrumentConfig]
  );

  const gridPoints = useMemo(() => computeAffectiveGridPoints(responses), [responses]);

  const meanValence = divergingRows[0]?.mean ?? mid;
  const meanArousal = divergingRows[1]?.mean ?? mid;

  if (responses.length === 0) {
    return null;
  }

  // Build scale ticks for Y/X axes
  const scaleTicks =
    scale === 3 ? [1, 2, 3] : scale === 5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // SVG coordinate helpers for Boxplot (Figure 8)
  const bpWidth = 540;
  const bpHeight = 270;
  const bpPadTop = 20;
  const bpPadBottom = 42;
  const bpPadLeft = 44;
  const bpPadRight = 24;
  const bpPlotH = bpHeight - bpPadTop - bpPadBottom;
  const bpY = (val: number) =>
    bpPadTop + bpPlotH - ((val - 1) / Math.max(1, scale - 1)) * bpPlotH;
  const bpColX = (idx: number) =>
    bpPadLeft + ((idx + 0.5) / 3) * (bpWidth - bpPadLeft - bpPadRight);

  // SVG coordinate helpers for 2D Affective Grid (Valence x Arousal)
  const gridSize = 360;
  const gPad = 48;
  const gPlot = gridSize - gPad * 2;
  const gX = (v: number) => gPad + ((v - 1) / Math.max(1, scale - 1)) * gPlot;
  const gY = (a: number) => gPad + gPlot - ((a - 1) / Math.max(1, scale - 1)) * gPlot;

  const boxColors = ['#2563EB', '#D97706', '#059669'];

  return (
    <div className="space-y-6">
      {/* 1. Diverging Stacked Bar Chart (Figura 9 — Hayashi et al., 2016) */}
      <section
        aria-labelledby="diverging-chart-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h2 id="diverging-chart-heading" className="text-lg font-bold text-slate-900">
              1. Barras Empilhadas Divergentes (Figura 9 — Hayashi et al., 2016)
            </h2>
            <p className="text-xs text-slate-500">
              Centralizadas no eixo neutro ({mid}): respostas negativas à esquerda (vermelho/laranja) e positivas à direita (verde).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" /> Negativo (1)
            </span>
            {scale > 3 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FB923C]" /> Neg. interm.
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#64748B]" /> Neutro ({mid})
            </span>
            {scale > 3 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#4ADE80]" /> Pos. interm.
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#15803D]" /> Positivo ({scale})
            </span>
          </div>
        </div>

        {/* Diverging axis header */}
        <div className="space-y-4">
          <div className="grid grid-cols-12 items-center text-[11px] font-mono tabular-nums text-slate-400">
            <div className="col-span-12 sm:col-span-3" />
            <div className="col-span-12 sm:col-span-9 flex justify-between px-0.5">
              <span>100% Neg</span>
              <span>50%</span>
              <span className="font-semibold text-slate-600">0% (Neutro)</span>
              <span>50%</span>
              <span>100% Pos</span>
            </div>
          </div>

          {divergingRows.map((row) => {
            // Left half represents 0%..100% negative + half neutral; right half represents half neutral + 0%..100% positive.
            const halfNeutral = row.neutralSegment.percent / 2;
            const leftNegTotal = row.leftSegments.reduce((acc, s) => acc + s.percent, 0);
            const rightPosTotal = row.rightSegments.reduce((acc, s) => acc + s.percent, 0);

            return (
              <div key={row.key} className="space-y-1.5">
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-12 sm:col-span-3 flex sm:flex-col justify-between">
                    <span className="text-sm font-semibold text-slate-900 truncate" title={row.title}>
                      {row.title.split(' / ')[0]}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      Média: <strong className="text-slate-900">{row.mean.toFixed(2)}</strong>/{scale}
                    </span>
                  </div>

                  {/* Diverging dual-half bar centered at 50% */}
                  <div
                    className="col-span-12 sm:col-span-9 relative h-10 rounded-lg bg-slate-100 border border-slate-200 flex overflow-hidden"
                    role="img"
                    aria-label={`Distribuição divergente de ${row.title}: média ${row.mean.toFixed(2)} de ${scale}`}
                  >
                    {/* Center neutral axis guideline */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 left-1/2 w-px bg-slate-400/80 z-10 pointer-events-none"
                    />

                    {/* Left half (aligned right toward center axis) */}
                    <div className="w-1/2 h-full flex justify-end items-center">
                      {row.leftSegments.map((seg) =>
                        seg.count > 0 ? (
                          <div
                            key={seg.score}
                            style={{
                              width: `${seg.percent}%`,
                              backgroundColor: seg.color,
                              color: seg.textColor,
                            }}
                            title={`Nota ${seg.score}: ${seg.count} resposta(s) (${seg.percent}%)`}
                            className="h-full flex items-center justify-center text-[11px] font-mono font-bold overflow-hidden px-0.5"
                          >
                            {seg.percent >= 12 ? `${Math.round(seg.percent)}%` : ''}
                          </div>
                        ) : null
                      )}
                      {row.neutralSegment.count > 0 && (
                        <div
                          style={{
                            width: `${halfNeutral}%`,
                            backgroundColor: row.neutralSegment.color,
                            color: row.neutralSegment.textColor,
                          }}
                          title={`Nota ${row.neutralSegment.score} (Neutro): ${row.neutralSegment.count} resposta(s) (${row.neutralSegment.percent}%)`}
                          className="h-full flex items-center justify-end pr-0.5 text-[10px] font-mono font-bold overflow-hidden"
                        />
                      )}
                    </div>

                    {/* Right half (aligned left away from center axis) */}
                    <div className="w-1/2 h-full flex justify-start items-center">
                      {row.neutralSegment.count > 0 && (
                        <div
                          style={{
                            width: `${halfNeutral}%`,
                            backgroundColor: row.neutralSegment.color,
                            color: row.neutralSegment.textColor,
                          }}
                          title={`Nota ${row.neutralSegment.score} (Neutro): ${row.neutralSegment.count} resposta(s) (${row.neutralSegment.percent}%)`}
                          className="h-full flex items-center justify-start pl-0.5 text-[10px] font-mono font-bold overflow-hidden"
                        />
                      )}
                      {row.rightSegments.map((seg) =>
                        seg.count > 0 ? (
                          <div
                            key={seg.score}
                            style={{
                              width: `${seg.percent}%`,
                              backgroundColor: seg.color,
                              color: seg.textColor,
                            }}
                            title={`Nota ${seg.score}: ${seg.count} resposta(s) (${seg.percent}%)`}
                            className="h-full flex items-center justify-center text-[11px] font-mono font-bold overflow-hidden px-0.5"
                          >
                            {seg.percent >= 12 ? `${Math.round(seg.percent)}%` : ''}
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact tabular breakdown */}
                <div className="grid grid-cols-12">
                  <div className="hidden sm:block sm:col-span-3" />
                  <div className="col-span-12 sm:col-span-9 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-600">
                    <span>
                      Negativo: <strong className="text-red-700">{leftNegTotal.toFixed(1)}%</strong> · Neutro:{' '}
                      <strong>{row.neutralSegment.percent.toFixed(1)}%</strong> · Positivo:{' '}
                      <strong className="text-emerald-700">{rightPosTotal.toFixed(1)}%</strong>
                    </span>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                      {[...row.leftSegments, row.neutralSegment, ...row.rightSegments].map((b) => (
                        <span key={b.score} className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-xs inline-block" style={{ backgroundColor: b.color }} />
                          <span>
                            {b.score}:<strong>{b.count}</strong>
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Boxplots (Figura 8) & 3. Mapa Afetivo 2D side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Boxplots by Dimension (Figura 8 — Hayashi et al., 2016) */}
        <section
          aria-labelledby="boxplot-chart-heading"
          className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4"
        >
          <div>
            <h2 id="boxplot-chart-heading" className="text-lg font-bold text-slate-900">
              2. Boxplots por Dimensão (Figura 8 — Hayashi et al., 2016)
            </h2>
            <p className="text-xs text-slate-500">
              Mediana, intervalo interquartil (Q1–Q3), limites de Tukey (mín/máx), média (losango) e outliers.
            </p>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${bpWidth} ${bpHeight}`}
              className="w-full h-auto max-h-[290px]"
              role="img"
              aria-label="Gráfico boxplot comparando Valência, Excitação e Dominância"
            >
              {/* Horizontal gridlines and Y-axis scale ticks */}
              {scaleTicks.map((tick) => {
                const y = bpY(tick);
                const isMid = tick === mid;
                return (
                  <g key={tick}>
                    <line
                      x1={bpPadLeft}
                      y1={y}
                      x2={bpWidth - bpPadRight}
                      y2={y}
                      stroke={isMid ? '#94A3B8' : '#E2E8F0'}
                      strokeWidth={isMid ? 1.4 : 1}
                      strokeDasharray={isMid ? '4 3' : undefined}
                    />
                    <text
                      x={bpPadLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[11px] font-mono"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Y axis line */}
              <line
                x1={bpPadLeft}
                y1={bpPadTop}
                x2={bpPadLeft}
                y2={bpHeight - bpPadBottom}
                stroke="#CBD5E1"
                strokeWidth="1.2"
              />

              {/* Boxplots */}
              {boxplots.map((bp, idx) => {
                const cx = bpColX(idx);
                const boxW = 54;
                const yQ3 = bpY(bp.q3);
                const yQ1 = bpY(bp.q1);
                const yMed = bpY(bp.median);
                const yMean = bpY(bp.mean);
                const yLow = bpY(bp.whiskerLow);
                const yHigh = bpY(bp.whiskerHigh);
                const boxHeight = Math.max(4, yQ1 - yQ3);
                const color = boxColors[idx];

                return (
                  <g key={bp.key}>
                    {/* Vertical whisker line */}
                    <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth="2" />
                    {/* Whisker caps */}
                    <line x1={cx - 14} y1={yHigh} x2={cx + 14} y2={yHigh} stroke={color} strokeWidth="2" />
                    <line x1={cx - 14} y1={yLow} x2={cx + 14} y2={yLow} stroke={color} strokeWidth="2" />

                    {/* IQR Box (Q1 to Q3) */}
                    <rect
                      x={cx - boxW / 2}
                      y={yQ3}
                      width={boxW}
                      height={boxHeight}
                      rx="4"
                      fill={color}
                      fillOpacity="0.18"
                      stroke={color}
                      strokeWidth="2.2"
                    >
                      <title>
                        {`${bp.title}: Min=${bp.min}, Q1=${bp.q1}, Mediana=${bp.median}, Q3=${bp.q3}, Máx=${bp.max}, Média=${bp.mean}`}
                      </title>
                    </rect>

                    {/* Median line */}
                    <line
                      x1={cx - boxW / 2}
                      y1={yMed}
                      x2={cx + boxW / 2}
                      y2={yMed}
                      stroke={color}
                      strokeWidth="3.2"
                    />

                    {/* Mean diamond marker */}
                    <polygon
                      points={`${cx},${yMean - 5} ${cx + 5},${yMean} ${cx},${yMean + 5} ${cx - 5},${yMean}`}
                      fill="#0F172A"
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                    >
                      <title>{`Média ${bp.title}: ${bp.mean.toFixed(2)}`}</title>
                    </polygon>

                    {/* Outliers */}
                    {bp.outliers.map((outVal, oIdx) => (
                      <circle
                        key={`${outVal}-${oIdx}`}
                        cx={cx + ((oIdx % 3) - 1) * 7}
                        cy={bpY(outVal)}
                        r="4.2"
                        fill="#FFFFFF"
                        stroke="#DC2626"
                        strokeWidth="2.2"
                      >
                        <title>{`Outlier em ${bp.title}: nota ${outVal}`}</title>
                      </circle>
                    ))}

                    {/* X Axis dimension label */}
                    <text
                      x={cx}
                      y={bpHeight - 16}
                      textAnchor="middle"
                      className="fill-slate-800 text-[12px] font-semibold"
                    >
                      {bp.title.split(' / ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Summary Table for Boxplot Quartiles */}
          <div className="overflow-x-auto pt-2 border-t border-slate-100">
            <table className="w-full text-xs font-mono tabular-nums text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="py-1.5 pr-2 font-sans font-semibold">Dimensão</th>
                  <th className="py-1.5 px-2 text-right">Mín</th>
                  <th className="py-1.5 px-2 text-right">Q1</th>
                  <th className="py-1.5 px-2 text-right">Med</th>
                  <th className="py-1.5 px-2 text-right">Q3</th>
                  <th className="py-1.5 px-2 text-right">Máx</th>
                  <th className="py-1.5 pl-2 text-right">Outliers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {boxplots.map((bp) => (
                  <tr key={bp.key}>
                    <td className="py-1.5 pr-2 font-sans font-medium text-slate-900">
                      {bp.title.split(' / ')[0]}
                    </td>
                    <td className="py-1.5 px-2 text-right">{bp.min}</td>
                    <td className="py-1.5 px-2 text-right">{bp.q1.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right font-bold">{bp.median.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right">{bp.q3.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right">{bp.max}</td>
                    <td className="py-1.5 pl-2 text-right">
                      {bp.outliers.length > 0 ? (
                        <span className="text-red-700 font-semibold">{bp.outliers.length}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Mapa Afetivo 2D (Affective Grid — Valência x Excitação) */}
        <section
          aria-labelledby="affective-grid-heading"
          className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4"
        >
          <div>
            <h2 id="affective-grid-heading" className="text-lg font-bold text-slate-900">
              3. Mapa Afetivo 2D (Affective Grid)
            </h2>
            <p className="text-xs text-slate-500">
              Dispersão Valência (eixo X) × Excitação (eixo Y) nos 4 quadrantes emocionais.
            </p>
          </div>

          <div className="flex justify-center">
            <svg
              viewBox={`0 0 ${gridSize} ${gridSize}`}
              className="w-full max-w-[340px] h-auto"
              role="img"
              aria-label="Mapa Afetivo 2D cruzando Valência no eixo X e Excitação no eixo Y"
            >
              {/* 4 subtle quadrant tints */}
              <rect
                x={gPad}
                y={gPad}
                width={gPlot / 2}
                height={gPlot / 2}
                fill="#FEF2F2"
                fillOpacity="0.65"
              />
              <rect
                x={gPad + gPlot / 2}
                y={gPad}
                width={gPlot / 2}
                height={gPlot / 2}
                fill="#F0FDF4"
                fillOpacity="0.75"
              />
              <rect
                x={gPad}
                y={gPad + gPlot / 2}
                width={gPlot / 2}
                height={gPlot / 2}
                fill="#F8FAFC"
              />
              <rect
                x={gPad + gPlot / 2}
                y={gPad + gPlot / 2}
                width={gPlot / 2}
                height={gPlot / 2}
                fill="#EFF6FF"
                fillOpacity="0.65"
              />

              {/* Border & mid axes */}
              <rect
                x={gPad}
                y={gPad}
                width={gPlot}
                height={gPlot}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />
              <line
                x1={gX(mid)}
                y1={gPad}
                x2={gX(mid)}
                y2={gPad + gPlot}
                stroke="#94A3B8"
                strokeWidth="1.3"
                strokeDasharray="4 3"
              />
              <line
                x1={gPad}
                y1={gY(mid)}
                x2={gPad + gPlot}
                y2={gY(mid)}
                stroke="#94A3B8"
                strokeWidth="1.3"
                strokeDasharray="4 3"
              />

              {/* Quadrant names */}
              <text x={gPad + 6} y={gPad + 14} className="fill-red-700/70 text-[9.5px] font-semibold">
                Tenso / Irritado
              </text>
              <text
                x={gPad + gPlot - 6}
                y={gPad + 14}
                textAnchor="end"
                className="fill-emerald-700/80 text-[9.5px] font-semibold"
              >
                Alegre / Empolgado
              </text>
              <text x={gPad + 6} y={gPad + gPlot - 6} className="fill-slate-500 text-[9.5px] font-semibold">
                Triste / Entediado
              </text>
              <text
                x={gPad + gPlot - 6}
                y={gPad + gPlot - 6}
                textAnchor="end"
                className="fill-blue-700/80 text-[9.5px] font-semibold"
              >
                Calmo / Satisfeito
              </text>

              {/* Axis numeric ticks (min, mid, max) */}
              {[1, mid, scale].map((tick) => (
                <g key={tick}>
                  <text
                    x={gX(tick)}
                    y={gPad + gPlot + 15}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {tick}
                  </text>
                  <text
                    x={gPad - 10}
                    y={gY(tick) + 3.5}
                    textAnchor="end"
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {tick}
                  </text>
                </g>
              ))}

              {/* Axis labels */}
              <text
                x={gridSize / 2}
                y={gridSize - 10}
                textAnchor="middle"
                className="fill-slate-700 text-[11px] font-semibold"
              >
                Valência (1 a {scale}) →
              </text>
              <text
                x={14}
                y={gridSize / 2}
                textAnchor="middle"
                transform={`rotate(-90 14 ${gridSize / 2})`}
                className="fill-slate-700 text-[11px] font-semibold"
              >
                Excitação (1 a {scale}) →
              </text>

              {/* Plotted response points (sized by cluster frequency) */}
              {gridPoints.map((pt) => {
                const cx = gX(pt.valence);
                const cy = gY(pt.arousal);
                const r = Math.min(18, 6 + Math.sqrt(pt.count) * 3.5);
                return (
                  <g key={`${pt.valence}-${pt.arousal}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="#1D4ED8"
                      fillOpacity="0.72"
                      stroke="#FFFFFF"
                      strokeWidth="1.8"
                    >
                      <title>
                        {`Valência ${pt.valence}, Excitação ${pt.arousal}: ${pt.count} avaliação(ões)`}
                      </title>
                    </circle>
                    {pt.count > 1 && (
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        className="fill-white text-[10px] font-mono font-bold pointer-events-none"
                      >
                        {pt.count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Centroid marker (mean Valence x mean Arousal) */}
              <g>
                <circle
                  cx={gX(meanValence)}
                  cy={gY(meanArousal)}
                  r="5.5"
                  fill="#F59E0B"
                  stroke="#0F172A"
                  strokeWidth="1.8"
                >
                  <title>{`Centroide médio: Valência ${meanValence.toFixed(2)}, Excitação ${meanArousal.toFixed(2)}`}</title>
                </circle>
              </g>
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-700/80" /> Avaliações
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900" />
              Centroide ({meanValence.toFixed(1)}, {meanArousal.toFixed(1)})
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
