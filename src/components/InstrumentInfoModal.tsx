import React from 'react';
import { X } from 'lucide-react';
import { DIMENSION_KEYS, createDefaultInstrumentConfig } from '../utils/emotiSam';
import { EmotiSamFace } from './EmotiSamFaces';
import { SamOriginalFace } from './SamOriginalFaces';

interface InstrumentInfoModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_CFG = createDefaultInstrumentConfig('e-sam', 5);

export const InstrumentInfoModal: React.FC<InstrumentInfoModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instrument-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="instrument-modal-title" className="text-xl sm:text-2xl font-bold text-slate-900">
              Sobre o e-SAM (electronic SAM)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Modelo afetivo PAD (Prazer/Valência, Excitação e Dominância) em versões pictóricas e-SAM e SAM Original.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela informativa"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>
            O <strong>Self-Assessment Manikin (SAM)</strong> (Bradley &amp; Lang, 1994) é um instrumento
            pictórico amplamente utilizado para mensurar respostas afetivas sem depender de leitura
            complexa ou idioma. Em 2016, <strong>Hayashi et al.</strong> propuseram o{' '}
            <strong>emoti-SAM</strong> (IHC&apos;16), substituindo os manequins abstratos por expressões
            faciais coloridas intuitivas para crianças, jovens e público diverso.
          </p>
          <p>
            O <strong>e-SAM</strong> (<em>electronic SAM</em>) oferece ambos os instrumentos (<strong>e-SAM</strong> e{' '}
            <strong>SAM Original</strong>) em escalas padronizadas de <strong>3, 5 ou 9 pontos</strong> (1 = menor/mais negativo,
            valor máximo = maior/mais positivo), com visualização científica completa para análise em IHC e extensão.
          </p>
        </div>

        <div className="space-y-4">
          {DIMENSION_KEYS.map((dimKey) => {
            const dim = DEFAULT_CFG.dimensions[dimKey];
            return (
              <div key={dimKey} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{dim.title}</h3>
                  <p className="text-xs text-slate-600">{dim.subtitle}</p>
                </div>
                <div className="grid grid-cols-5 gap-2 items-center justify-items-center">
                  {([5, 4, 3, 2, 1] as const).map((level) => (
                    <div key={`esam-${level}`} className="flex flex-col items-center gap-1">
                      <EmotiSamFace dimension={dimKey} anchorLevel={level} className="w-11 h-9" />
                      <SamOriginalFace dimension={dimKey} anchorLevel={level} className="w-10 h-9" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Referências: Hayashi et al. (2016), IHC&apos;16 · Bradley &amp; Lang (1994) · Oliveira (2021), UNIPAMPA.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer self-end sm:self-auto"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
