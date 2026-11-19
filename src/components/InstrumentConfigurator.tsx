import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import {
  DIMENSION_KEYS,
  getActiveAnchorLevels,
  getDefaultDimensionOrders,
  resizeImageFileToDataUrl,
  type AnchorLevel,
  type DimensionKey,
  type DimensionOrder,
  type InstrumentConfig,
  type InstrumentType,
  type ScaleType,
} from '../utils/emotiSam';
import { EmotiSamRow } from './EmotiSamRow';
import { InstrumentFigure } from './InstrumentFigure';

interface InstrumentConfiguratorProps {
  config: InstrumentConfig;
  onChange: (next: InstrumentConfig) => void;
  disabled?: boolean;
  idPrefix?: string;
}

const DEFAULT_DIM_NAMES: Record<DimensionKey, string> = {
  valence: 'Valência / Prazer',
  arousal: 'Excitação / Alerta',
  dominance: 'Dominância / Controle',
};

export const InstrumentConfigurator: React.FC<InstrumentConfiguratorProps> = ({
  config,
  onChange,
  disabled = false,
  idPrefix = 'cfg',
}) => {
  const [textsExpanded, setTextsExpanded] = useState(false);
  const [imagesExpanded, setImagesExpanded] = useState(false);
  const [imageError, setImageError] = useState('');
  const [previewValues, setPreviewValues] = useState<Record<DimensionKey, number | null>>({
    valence: null,
    arousal: null,
    dominance: null,
  });

  const activeAnchors = getActiveAnchorLevels(config.scale);

  const handleInstrumentChange = (instrument: InstrumentType) => {
    if (disabled) return;
    const defaultOrders = getDefaultDimensionOrders(instrument);
    onChange({
      ...config,
      instrument,
      dimensions: {
        valence: { ...config.dimensions.valence, order: defaultOrders.valence },
        arousal: { ...config.dimensions.arousal, order: defaultOrders.arousal },
        dominance: { ...config.dimensions.dominance, order: defaultOrders.dominance },
      },
    });
  };

  const handleScaleChange = (scale: ScaleType) => {
    if (disabled) return;
    setPreviewValues({ valence: null, arousal: null, dominance: null });
    onChange({ ...config, scale });
  };

  const handleOrderChange = (dimKey: DimensionKey, order: DimensionOrder) => {
    if (disabled) return;
    onChange({
      ...config,
      dimensions: {
        ...config.dimensions,
        [dimKey]: { ...config.dimensions[dimKey], order },
      },
    });
  };

  const handleResetOrders = () => {
    if (disabled) return;
    const defaultOrders = getDefaultDimensionOrders(config.instrument);
    onChange({
      ...config,
      dimensions: {
        valence: { ...config.dimensions.valence, order: defaultOrders.valence },
        arousal: { ...config.dimensions.arousal, order: defaultOrders.arousal },
        dominance: { ...config.dimensions.dominance, order: defaultOrders.dominance },
      },
    });
  };

  const handleDimensionTextChange = (
    dimKey: DimensionKey,
    field: 'title' | 'subtitle',
    value: string
  ) => {
    if (disabled) return;
    onChange({
      ...config,
      dimensions: {
        ...config.dimensions,
        [dimKey]: { ...config.dimensions[dimKey], [field]: value },
      },
    });
  };

  const handleAltTextChange = (dimKey: DimensionKey, level: AnchorLevel, value: string) => {
    if (disabled) return;
    onChange({
      ...config,
      dimensions: {
        ...config.dimensions,
        [dimKey]: {
          ...config.dimensions[dimKey],
          altTexts: {
            ...config.dimensions[dimKey].altTexts,
            [level]: value,
          },
        },
      },
    });
  };

  const handleCustomImageUpload = async (
    dimKey: DimensionKey,
    level: AnchorLevel,
    file: File | undefined
  ) => {
    if (disabled || !file) return;
    setImageError('');
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 160);
      onChange({
        ...config,
        dimensions: {
          ...config.dimensions,
          [dimKey]: {
            ...config.dimensions[dimKey],
            customImages: {
              ...(config.dimensions[dimKey].customImages || {}),
              [level]: dataUrl,
            },
          },
        },
      });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Erro ao processar a imagem.');
    }
  };

  const handleClearCustomImage = (dimKey: DimensionKey, level: AnchorLevel) => {
    if (disabled) return;
    const nextImgs = { ...(config.dimensions[dimKey].customImages || {}) };
    delete nextImgs[level];
    onChange({
      ...config,
      dimensions: {
        ...config.dimensions,
        [dimKey]: {
          ...config.dimensions[dimKey],
          customImages: Object.keys(nextImgs).length > 0 ? nextImgs : undefined,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Instrument & Scale Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <span className="block text-sm font-semibold text-slate-900 mb-2">
            Instrumento Pictórico *
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Instrumento pictórico">
            <button
              type="button"
              role="radio"
              disabled={disabled}
              aria-checked={config.instrument === 'e-sam'}
              onClick={() => handleInstrumentChange('e-sam')}
              className={`rounded-lg border px-3.5 py-3 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                config.instrument === 'e-sam'
                  ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/15'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">e-SAM (emoti-SAM)</span>
              <span className="block text-xs text-slate-500 mt-0.5">Carinhas expressivas coloridas</span>
            </button>

            <button
              type="button"
              role="radio"
              disabled={disabled}
              aria-checked={config.instrument === 'sam'}
              onClick={() => handleInstrumentChange('sam')}
              className={`rounded-lg border px-3.5 py-3 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                config.instrument === 'sam'
                  ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/15'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">SAM Original</span>
              <span className="block text-xs text-slate-500 mt-0.5">Manequim clássico (Lang &amp; Bradley)</span>
            </button>
          </div>
        </div>

        <div>
          <span className="block text-sm font-semibold text-slate-900 mb-2">
            Escala de Pontuação (1 a N) *
          </span>
          <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Escala de pontuação">
            {([3, 5, 9] as ScaleType[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                disabled={disabled}
                aria-checked={config.scale === s}
                onClick={() => handleScaleChange(s)}
                className={`rounded-lg border px-3 py-3 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  config.scale === s
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/15'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900 whitespace-nowrap">
                  {s} pontos
                </span>
                <span className="block text-[11px] font-mono text-slate-500 mt-0.5">
                  Notas 1 a {s}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Show/Hide Dimension Texts + Per-Dimension Ordering */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className={`flex items-center gap-2.5 select-none ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={config.showDimensionTexts}
              onChange={(e) => onChange({ ...config, showDimensionTexts: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-sm font-medium text-slate-800">
              Exibir títulos e descrições das 3 dimensões para o respondente
            </span>
          </label>

          {!disabled && (
            <button
              type="button"
              onClick={handleResetOrders}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ordem padrão do {config.instrument === 'sam' ? 'SAM' : 'e-SAM'}</span>
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-slate-200/80 space-y-2">
          <span className="block text-xs font-semibold text-slate-700">
            Ordenação visual individual das dimensões (a pontuação salva é sempre 1 = menor, {config.scale} = maior)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {DIMENSION_KEYS.map((dimKey) => {
              const dimCfg = config.dimensions[dimKey];
              const isPosToNeg = dimCfg.order === 'pos-to-neg';
              return (
                <div
                  key={dimKey}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {DEFAULT_DIM_NAMES[dimKey].split(' / ')[0]}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      handleOrderChange(dimKey, isPosToNeg ? 'neg-to-pos' : 'pos-to-neg')
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono font-medium text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-blue-700" aria-hidden="true" />
                    <span>{isPosToNeg ? 'Pos → Neg' : 'Neg → Pos'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Collapsible: Customize Dimension Texts & Alt Texts */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setTextsExpanded((v) => !v)}
          aria-expanded={textsExpanded}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <SlidersHorizontal className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>Personalizar textos das dimensões e descrições de acessibilidade (alt)</span>
          </span>
          {textsExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          )}
        </button>

        {textsExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-5">
            <p className="text-xs text-slate-500">
              Na tela do participante as figuras permanecem puramente pictóricas; os textos abaixo alimentam os atributos <code className="font-mono">alt</code> e <code className="font-mono">aria-label</code> para leitores de tela.
            </p>
            {DIMENSION_KEYS.map((dimKey) => {
              const dimCfg = config.dimensions[dimKey];
              return (
                <div key={dimKey} className="space-y-3 pt-2 border-t border-slate-100 first:border-t-0 first:pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`${idPrefix}-${dimKey}-title`} className="block text-xs font-semibold text-slate-700 mb-1">
                        Título ({DEFAULT_DIM_NAMES[dimKey].split(' / ')[0]})
                      </label>
                      <input
                        id={`${idPrefix}-${dimKey}-title`}
                        type="text"
                        disabled={disabled}
                        maxLength={100}
                        value={dimCfg.title}
                        onChange={(e) => handleDimensionTextChange(dimKey, 'title', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${idPrefix}-${dimKey}-sub`} className="block text-xs font-semibold text-slate-700 mb-1">
                        Subtítulo / Orientação
                      </label>
                      <input
                        id={`${idPrefix}-${dimKey}-sub`}
                        type="text"
                        disabled={disabled}
                        maxLength={180}
                        value={dimCfg.subtitle}
                        onChange={(e) => handleDimensionTextChange(dimKey, 'subtitle', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {activeAnchors.map((lvl) => (
                      <div key={lvl}>
                        <label
                          htmlFor={`${idPrefix}-${dimKey}-alt-${lvl}`}
                          className="block text-[11px] font-mono text-slate-500 mb-0.5"
                        >
                          alt figura (nível {lvl})
                        </label>
                        <input
                          id={`${idPrefix}-${dimKey}-alt-${lvl}`}
                          type="text"
                          disabled={disabled}
                          maxLength={180}
                          value={dimCfg.altTexts[lvl]}
                          onChange={(e) => handleAltTextChange(dimKey, lvl, e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none disabled:opacity-60"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible: Advanced Custom Images */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setImagesExpanded((v) => !v)}
          aria-expanded={imagesExpanded}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ImageIcon className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>Avançado: Personalizar imagens da escala</span>
          </span>
          {imagesExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          )}
        </button>

        {imagesExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-4">
            <p className="text-xs text-slate-500">
              Substitua opcionalmente qualquer figura padrão por uma imagem própria (redimensionada automaticamente para até 160×160 px no navegador).
            </p>
            {imageError && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {imageError}
              </p>
            )}
            {DIMENSION_KEYS.map((dimKey) => {
              const dimCfg = config.dimensions[dimKey];
              return (
                <div key={dimKey} className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-800">{dimCfg.title}</span>
                  <div className={`grid ${activeAnchors.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'} gap-2`}>
                    {activeAnchors.map((lvl) => {
                      const customImg = dimCfg.customImages?.[lvl];
                      const inputId = `${idPrefix}-img-${dimKey}-${lvl}`;
                      return (
                        <div
                          key={lvl}
                          className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 flex flex-col items-center gap-1.5"
                        >
                          <InstrumentFigure
                            instrument={config.instrument}
                            dimension={dimKey}
                            anchorLevel={lvl}
                            altText={dimCfg.altTexts[lvl]}
                            customImage={customImg}
                            className="w-10 h-9"
                          />
                          <input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            disabled={disabled}
                            onChange={(e) => {
                              handleCustomImageUpload(dimKey, lvl, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-1">
                            <label
                              htmlFor={inputId}
                              className={`inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ${
                                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <Upload className="w-2.5 h-2.5" aria-hidden="true" />
                              <span>Trocar</span>
                            </label>
                            {customImg && !disabled && (
                              <button
                                type="button"
                                onClick={() => handleClearCustomImage(dimKey, lvl)}
                                className="text-[11px] text-red-700 hover:underline px-1 cursor-pointer"
                              >
                                Padrão
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Real-Time Preview of ALL 3 Dimensions */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            Pré-visualização em Tempo Real (Todas as 3 Dimensões)
          </span>
          <span className="font-mono">
            {config.instrument === 'sam' ? 'SAM Original' : 'e-SAM'} · Escala de {config.scale} pontos (1 a {config.scale})
          </span>
        </div>

        <div className="space-y-3">
          {DIMENSION_KEYS.map((dimKey) => (
            <EmotiSamRow
              key={dimKey}
              dimensionKey={dimKey}
              dimensionConfig={config.dimensions[dimKey]}
              instrument={config.instrument}
              scale={config.scale}
              showDimensionTexts={config.showDimensionTexts}
              value={previewValues[dimKey]}
              onChange={(score) =>
                setPreviewValues((prev) => ({ ...prev, [dimKey]: score }))
              }
              compact
              idPrefix={`${idPrefix}-preview`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
