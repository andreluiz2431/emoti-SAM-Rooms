import React from 'react';
import {
  getOrderedAnchors,
  getOrderedScaleScores,
  type DimensionCustomization,
  type DimensionKey,
  type InstrumentType,
  type ScaleType,
} from '../utils/emotiSam';
import { InstrumentFigure } from './InstrumentFigure';

interface EmotiSamRowProps {
  dimensionKey: DimensionKey;
  dimensionConfig: DimensionCustomization;
  instrument: InstrumentType;
  scale: ScaleType;
  showDimensionTexts: boolean;
  value: number | null;
  onChange: (score: number) => void;
  hasError?: boolean;
  compact?: boolean;
  idPrefix?: string;
}

export const EmotiSamRow: React.FC<EmotiSamRowProps> = ({
  dimensionKey,
  dimensionConfig,
  instrument,
  scale,
  showDimensionTexts,
  value,
  onChange,
  hasError = false,
  compact = false,
  idPrefix = 'dim',
}) => {
  const headingId = `${idPrefix}-heading-${dimensionKey}`;
  const orderedAnchors = getOrderedAnchors(scale, dimensionConfig.order);
  const orderedScores = getOrderedScaleScores(scale, dimensionConfig.order);

  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl bg-white ${compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-6'} transition-colors border ${
        hasError ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
      }`}
    >
      {showDimensionTexts ? (
        <div className={`flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 ${compact ? 'mb-3' : 'mb-5'}`}>
          <div>
            <h3 id={headingId} className={`${compact ? 'text-sm sm:text-base' : 'text-lg'} font-bold text-slate-900`}>
              {dimensionConfig.title}
            </h3>
            {dimensionConfig.subtitle && (
              <p className={`${compact ? 'text-xs' : 'text-sm'} text-slate-600`}>
                {dimensionConfig.subtitle}
              </p>
            )}
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            {value !== null ? (
              <span className="font-semibold text-blue-700">
                Selecionado: {value} / {scale}
              </span>
            ) : (
              <span>1 opção ({scale} pts)</span>
            )}
          </div>
        </div>
      ) : (
        <h3 id={headingId} className="sr-only">
          {dimensionConfig.title}
        </h3>
      )}

      {scale === 3 || scale === 5 ? (
        <div
          role="radiogroup"
          aria-labelledby={headingId}
          className={`grid ${scale === 3 ? 'grid-cols-3 gap-2.5 sm:gap-5 max-w-2xl mx-auto' : 'grid-cols-5 gap-1.5 sm:gap-4'}`}
        >
          {orderedAnchors.map(({ anchorLevel, score }) => {
            const selected = value === score;
            const altText = dimensionConfig.altTexts[anchorLevel];
            const customImg = dimensionConfig.customImages?.[anchorLevel];

            return (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${dimensionConfig.title} — ${altText} (nota ${score} de ${scale})`}
                onClick={() => onChange(score)}
                className={`group flex flex-col items-center justify-between rounded-xl border ${
                  compact ? 'px-1.5 py-2.5 min-h-[86px]' : 'px-1.5 py-3 sm:p-4 min-h-[104px] sm:min-h-[126px]'
                } transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer ${
                  selected
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/20 -translate-y-0.5'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <InstrumentFigure
                  instrument={instrument}
                  dimension={dimensionKey}
                  anchorLevel={anchorLevel}
                  altText={altText}
                  customImage={customImg}
                  className={
                    compact
                      ? 'w-11 h-10 sm:w-14 sm:h-12 transition-transform duration-150 group-hover:scale-105'
                      : 'w-12 h-11 sm:w-20 sm:h-16 transition-transform duration-150 group-hover:scale-105'
                  }
                />

                <span
                  aria-hidden="true"
                  className={`mt-2.5 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold tabular-nums transition-colors ${
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
          {/* 9-point scale: 5 purely pictorial anchor figures aligned over columns 1, 3, 5, 7, 9 */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 items-end mb-3">
            {orderedAnchors.map(({ anchorLevel, score }, idx) => {
              const colStart = idx * 2 + 1;
              const altText = dimensionConfig.altTexts[anchorLevel];
              const customImg = dimensionConfig.customImages?.[anchorLevel];
              const isFaceSelected = value === score;

              return (
                <div
                  key={anchorLevel}
                  style={{ gridColumnStart: colStart }}
                  className="flex flex-col items-center"
                >
                  <button
                    type="button"
                    onClick={() => onChange(score)}
                    aria-label={`${dimensionConfig.title} — ${altText} (nota ${score} de 9)`}
                    className={`group flex flex-col items-center rounded-lg p-1 sm:p-1.5 transition-transform duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isFaceSelected ? 'scale-105 bg-blue-50/70' : 'hover:scale-105'
                    }`}
                  >
                    <InstrumentFigure
                      instrument={instrument}
                      dimension={dimensionKey}
                      anchorLevel={anchorLevel}
                      altText={altText}
                      customImage={customImg}
                      className={
                        compact
                          ? 'w-9 h-8 sm:w-12 sm:h-11'
                          : 'w-10 h-9 sm:w-16 sm:h-14 md:w-20 md:h-16'
                      }
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 9 radio points directly underneath (standardized 1..9 in the configured direction) */}
          <div
            role="radiogroup"
            aria-labelledby={headingId}
            className="grid grid-cols-9 gap-1 sm:gap-2 pt-2 border-t border-slate-100"
          >
            {orderedScores.map((score) => {
              const selected = value === score;
              const isIntermediate = score % 2 === 0;
              const anchorMatch = orderedAnchors.find((a) => a.score === score);
              const desc = anchorMatch
                ? dimensionConfig.altTexts[anchorMatch.anchorLevel]
                : `Ponto intermediário, nota ${score} de 9`;

              return (
                <button
                  key={score}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${dimensionConfig.title} — ${desc} (nota ${score} de 9)`}
                  onClick={() => onChange(score)}
                  className={`flex flex-col items-center justify-center rounded-lg ${
                    compact ? 'py-1.5 min-h-[40px]' : 'py-2 min-h-[46px]'
                  } px-1 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    selected
                      ? 'bg-blue-700 text-white shadow-sm'
                      : isIntermediate
                      ? 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      : 'bg-slate-100/80 text-slate-800 hover:bg-slate-200/70'
                  }`}
                >
                  <span
                    aria-hidden="true"
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
        </div>
      )}
    </section>
  );
};
