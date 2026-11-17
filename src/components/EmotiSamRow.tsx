import React from 'react';
import type { DimensionMeta, ScaleType } from '../utils/emotiSam';
import { EmotiSamFace } from './EmotiSamFaces';

interface EmotiSamRowProps {
  dimension: DimensionMeta;
  scale: ScaleType;
  value: number | null;
  onChange: (score: number) => void;
  hasError?: boolean;
}

const ANCHORS_5: (5 | 4 | 3 | 2 | 1)[] = [5, 4, 3, 2, 1];
const ANCHOR_MAP_9: Record<5 | 4 | 3 | 2 | 1, number> = {
  5: 9,
  4: 7,
  3: 5,
  2: 3,
  1: 1,
};

export const EmotiSamRow: React.FC<EmotiSamRowProps> = ({
  dimension,
  scale,
  value,
  onChange,
  hasError = false,
}) => {
  const headingId = `dim-heading-${dimension.key}`;

  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl bg-white p-3.5 sm:p-6 transition-colors border ${
        hasError ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-5">
        <div>
          <h3 id={headingId} className="text-lg font-bold text-slate-900">
            {dimension.title}
          </h3>
          <p className="text-sm text-slate-600">{dimension.subtitle}</p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-500">
          {value !== null ? (
            <span className="font-semibold text-blue-700">Selecionado: {value} / {scale}</span>
          ) : (
            <span>Escolha 1 opção ({scale} pontos)</span>
          )}
        </div>
      </div>

      {scale === 5 ? (
        <div
          role="radiogroup"
          aria-labelledby={headingId}
          className="grid grid-cols-5 gap-1.5 sm:gap-4"
        >
          {ANCHORS_5.map((score, idx) => {
            const meta = dimension.anchors5[idx];
            const selected = value === score;
            return (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${dimension.title}: ${meta.label} (nota ${score} de 5)`}
                onClick={() => onChange(score)}
                className={`group flex flex-col items-center justify-between rounded-xl border px-1 py-2.5 sm:p-4 min-h-[112px] sm:min-h-[132px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer ${
                  selected
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/20 -translate-y-0.5'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <EmotiSamFace
                  dimension={dimension.key}
                  anchorLevel={score}
                  scaleVariant={5}
                  className="w-11 h-10 sm:w-20 sm:h-16 transition-transform duration-150 group-hover:scale-105"
                />
                <span className="mt-2 w-full text-center text-[10px] sm:text-xs font-medium text-slate-700 leading-tight tracking-tight sm:tracking-normal break-words">
                  {meta.label}
                </span>
                <span
                  className={`mt-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold tabular-nums transition-colors ${
                    selected
                      ? 'bg-blue-700 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 group-hover:border-slate-400'
                  }`}
                >
                  {score}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          {/* 9-point scale: 5 anchor faces aligned over columns 9, 7, 5, 3, 1 */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 items-end mb-3">
            {ANCHORS_5.map((anchorLevel, idx) => {
              const targetScore = ANCHOR_MAP_9[anchorLevel];
              const colStart = idx * 2 + 1; // 1, 3, 5, 7, 9
              const meta = dimension.anchors5[idx];
              const isFaceSelected = value === targetScore;
              return (
                <div
                  key={anchorLevel}
                  style={{ gridColumnStart: colStart }}
                  className="flex flex-col items-center"
                >
                  <button
                    type="button"
                    onClick={() => onChange(targetScore)}
                    title={`Selecionar ${meta.label} (nota ${targetScore})`}
                    aria-label={`Selecionar figura ${meta.label}, nota ${targetScore} de 9`}
                    className={`group flex flex-col items-center rounded-lg p-1 sm:p-2 transition-transform duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isFaceSelected ? 'scale-105 bg-blue-50/70' : 'hover:scale-105'
                    }`}
                  >
                    <EmotiSamFace
                      dimension={dimension.key}
                      anchorLevel={anchorLevel}
                      scaleVariant={9}
                      className="w-10 h-9 sm:w-16 sm:h-14 md:w-20 md:h-16"
                    />
                    <span className="hidden sm:block mt-1 text-[11px] font-medium text-slate-600 text-center leading-tight whitespace-nowrap">
                      {meta.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* 9 radio points directly underneath (9 down to 1) */}
          <div
            role="radiogroup"
            aria-labelledby={headingId}
            className="grid grid-cols-9 gap-1 sm:gap-2 pt-2 border-t border-slate-100"
          >
            {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
              const selected = value === score;
              const isIntermediate = score % 2 === 0;
              return (
                <button
                  key={score}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${dimension.title}: nota ${score} de 9${isIntermediate ? ' (ponto intermediário)' : ''}`}
                  onClick={() => onChange(score)}
                  className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 min-h-[46px] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    selected
                      ? 'bg-blue-700 text-white shadow-sm'
                      : isIntermediate
                      ? 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      : 'bg-slate-100/80 text-slate-800 hover:bg-slate-200/70'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mb-1 ${
                      selected ? 'border-white bg-white' : 'border-slate-400 bg-white'
                    }`}
                  >
                    {selected && <span className="w-2 h-2 rounded-full bg-blue-700" />}
                  </span>
                  <span className="text-xs font-mono font-semibold tabular-nums">{score}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span>{dimension.highLabel}</span>
            <span>{dimension.lowLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
};
