import React from 'react';
import { X } from 'lucide-react';
import { DIMENSIONS } from '../utils/emotiSam';
import { EmotiSamFace } from './EmotiSamFaces';

interface InstrumentInfoModalProps {
  open: boolean;
  onClose: () => void;
}

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
              Sobre o Instrumento Científico emoti-SAM
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Modelo PAD (Prazer, Excitação e Dominância) adaptado para emojis expressivos.
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

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            O <strong>Self-Assessment Manikin (SAM)</strong> (Bradley &amp; Lang, 1994) é um instrumento
            pictórico amplamente utilizado para mensurar respostas afetivas sem depender de leitura
            complexa ou idioma. Em 2016, <strong>Hayashi et al.</strong> apresentaram o{' '}
            <strong>emoti-SAM</strong> (IHC&apos;16), substituindo os manequins abstratos por expressões
            faciais coloridas intuitivas para crianças, jovens e público diverso em contextos educacionais
            e computacionais.
          </p>
          <p>
            O <strong>emoti-SAM Rooms</strong> suporta tanto a escala direta de <strong>5 pontos</strong>{' '}
            (ideal para ações de extensão e público infantil/geral) quanto a escala detalhada de{' '}
            <strong>9 pontos</strong> com valores intermediários (ideal para avaliação de sistemas
            computacionais).
          </p>
        </div>

        <div className="space-y-4">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{dim.title}</h3>
                <p className="text-xs text-slate-600">{dim.subtitle}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {([5, 4, 3, 2, 1] as const).map((level, idx) => (
                  <div key={level} className="flex flex-col items-center text-center">
                    <EmotiSamFace dimension={dim.key} anchorLevel={level} scaleVariant={9} className="w-12 h-10" />
                    <span className="mt-1 text-[11px] font-medium text-slate-700">
                      {dim.anchors5[idx].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Referência: Hayashi et al. (2016), IHC&apos;16 · Oliveira (2021), UNIPAMPA.
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
