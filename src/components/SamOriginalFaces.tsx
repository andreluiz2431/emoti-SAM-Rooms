import React from 'react';
import type { AnchorLevel, DimensionKey } from '../utils/emotiSam';

interface SamOriginalFaceProps {
  dimension: DimensionKey;
  /** 5 = max pleasure / max arousal / max dominance (huge figure); 1 = min pleasure / min arousal (sleepy) / min dominance (tiny figure) */
  anchorLevel: AnchorLevel;
  className?: string;
  title?: string;
}

const STROKE = '#0F172A';
const FILL = '#F8FAFC';

/**
 * Classic Self-Assessment Manikin (SAM) SVG illustrations faithful to Bradley & Lang (1994).
 */
export const SamOriginalFace: React.FC<SamOriginalFaceProps> = ({
  dimension,
  anchorLevel,
  className = 'w-16 h-14',
  title,
}) => {
  // 1. VALENCE / PLEASURE: Manikin head & torso with facial expression from big happy smile (5) to deep distressed frown (1)
  if (dimension === 'valence') {
    return (
      <svg
        viewBox="0 0 100 96"
        className={className}
        role="img"
        aria-label={title || `SAM Valência nível ${anchorLevel}`}
      >
        <g stroke={STROKE} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill={FILL}>
          {/* Classic boxy manikin head */}
          <rect x="26" y="8" width="48" height="38" rx="6" />
          {/* Neck */}
          <rect x="44" y="46" width="12" height="5" />
          {/* Torso & arms */}
          <path d="M22 51 L78 51 L78 76 L67 76 L67 60 L65 60 L65 89 L35 89 L35 60 L33 60 L33 76 L22 76 Z" />

          {/* Eyebrows & Eyes */}
          {anchorLevel === 5 && (
            <>
              <path d="M34 19 Q39 14 44 19" fill="none" strokeWidth="2.4" />
              <path d="M56 19 Q61 14 66 19" fill="none" strokeWidth="2.4" />
              <circle cx="39" cy="23" r="2.2" fill={STROKE} />
              <circle cx="61" cy="23" r="2.2" fill={STROKE} />
              {/* Wide beaming smile */}
              <path d="M34 31 Q50 45 66 31 Z" fill="#FFFFFF" />
            </>
          )}
          {anchorLevel === 4 && (
            <>
              <path d="M35 19 Q39 16 43 19" fill="none" strokeWidth="2.2" />
              <path d="M57 19 Q61 16 65 19" fill="none" strokeWidth="2.2" />
              <circle cx="39" cy="23" r="2.2" fill={STROKE} />
              <circle cx="61" cy="23" r="2.2" fill={STROKE} />
              {/* Gentle smile */}
              <path d="M37 33 Q50 41 63 33" fill="none" />
            </>
          )}
          {anchorLevel === 3 && (
            <>
              <line x1="35" y1="19" x2="43" y2="19" strokeWidth="2.2" />
              <line x1="57" y1="19" x2="65" y2="19" strokeWidth="2.2" />
              <circle cx="39" cy="24" r="2.2" fill={STROKE} />
              <circle cx="61" cy="24" r="2.2" fill={STROKE} />
              {/* Flat neutral mouth */}
              <line x1="39" y1="35" x2="61" y2="35" />
            </>
          )}
          {anchorLevel === 2 && (
            <>
              <path d="M35 20 Q39 18 43 17" fill="none" strokeWidth="2.2" />
              <path d="M65 20 Q61 18 57 17" fill="none" strokeWidth="2.2" />
              <circle cx="39" cy="24" r="2.2" fill={STROKE} />
              <circle cx="61" cy="24" r="2.2" fill={STROKE} />
              {/* Frown */}
              <path d="M38 38 Q50 30 62 38" fill="none" />
            </>
          )}
          {anchorLevel === 1 && (
            <>
              {/* Deep furrowed brows & distressed frown */}
              <path d="M34 16 L44 21" fill="none" strokeWidth="2.6" />
              <path d="M66 16 L56 21" fill="none" strokeWidth="2.6" />
              <circle cx="39" cy="25" r="2.2" fill={STROKE} />
              <circle cx="61" cy="25" r="2.2" fill={STROKE} />
              <path d="M35 39 Q50 26 65 39" fill="none" strokeWidth="3" />
              {/* Teardrop / distress lines */}
              <path d="M33 27 L31 30" fill="none" strokeWidth="1.8" />
              <path d="M67 27 L69 30" fill="none" strokeWidth="1.8" />
            </>
          )}
        </g>
      </svg>
    );
  }

  // 2. AROUSAL: Manikin with abdominal burst/agitation from intense explosion (5) down to sleepy calm (1)
  if (dimension === 'arousal') {
    return (
      <svg
        viewBox="0 0 100 96"
        className={className}
        role="img"
        aria-label={title || `SAM Excitação nível ${anchorLevel}`}
      >
        <g stroke={STROKE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill={FILL}>
          {/* Head */}
          <rect x="29" y="8" width="42" height="34" rx="6" />
          {/* Neck */}
          <rect x="44" y="42" width="12" height="5" />
          {/* Body */}
          <path d="M22 47 L78 47 L78 74 L67 74 L67 57 L65 57 L65 89 L35 89 L35 57 L33 57 L33 74 L22 74 Z" />

          {/* Eyes based on arousal level */}
          {anchorLevel >= 4 ? (
            <>
              <circle cx="41" cy="22" r="4.2" fill="#FFFFFF" />
              <circle cx="59" cy="22" r="4.2" fill="#FFFFFF" />
              <circle cx="41" cy="22" r="1.5" fill={STROKE} />
              <circle cx="59" cy="22" r="1.5" fill={STROKE} />
              <line x1="43" y1="33" x2="57" y2="33" />
            </>
          ) : anchorLevel === 3 ? (
            <>
              <circle cx="41" cy="22" r="2.4" fill={STROKE} />
              <circle cx="59" cy="22" r="2.4" fill={STROKE} />
              <line x1="43" y1="33" x2="57" y2="33" />
            </>
          ) : anchorLevel === 2 ? (
            <>
              <path d="M36 22 Q41 25 46 22" fill="none" />
              <path d="M54 22 Q59 25 64 22" fill="none" />
              <line x1="44" y1="33" x2="56" y2="33" />
            </>
          ) : (
            <>
              {/* Sleeping closed eyes */}
              <path d="M36 23 Q41 27 46 23" fill="none" />
              <path d="M54 23 Q59 27 64 23" fill="none" />
              <line x1="45" y1="33" x2="55" y2="33" />
            </>
          )}

          {/* Abdominal burst/explosion symbolizing physiological arousal */}
          {anchorLevel === 5 && (
            <g fill="#FEF08A" stroke={STROKE} strokeWidth="2.2">
              {/* Outer jagged burst extending beyond torso */}
              <path d="M50 48 L56 59 L70 50 L62 64 L78 68 L63 73 L72 86 L56 78 L50 92 L44 78 L28 86 L37 73 L22 68 L38 64 L30 50 L44 59 Z" />
              <path d="M50 58 L54 65 L62 63 L56 70 L61 77 L53 74 L50 81 L47 74 L39 77 L44 70 L38 63 L46 65 Z" fill="#F97316" strokeWidth="1.6" />
            </g>
          )}
          {anchorLevel === 4 && (
            <path
              d="M50 54 L54 63 L65 57 L59 67 L70 71 L58 74 L63 83 L53 77 L50 86 L47 77 L37 83 L42 74 L30 71 L41 67 L35 57 L46 63 Z"
              fill="#FEF08A"
              strokeWidth="2"
            />
          )}
          {anchorLevel === 3 && (
            <path
              d="M50 59 L53 66 L61 63 L56 70 L62 76 L53 74 L50 81 L47 74 L38 76 L44 70 L39 63 L47 66 Z"
              fill="#E2E8F0"
              strokeWidth="1.8"
            />
          )}
          {anchorLevel === 2 && (
            <path
              d="M50 64 L52 69 L57 68 L53 72 L56 76 L50 74 L44 76 L47 72 L43 68 L48 69 Z"
              fill="#CBD5E1"
              strokeWidth="1.6"
            />
          )}
          {anchorLevel === 1 && (
            <circle cx="50" cy="70" r="2.2" fill={STROKE} stroke="none" />
          )}
        </g>
      </svg>
    );
  }

  // 3. DOMINANCE: Classic SAM figure scaling in size inside a fixed frame from tiny (1) to giant overflowing (5)
  const scaleMap: Record<AnchorLevel, number> = {
    1: 0.34,
    2: 0.5,
    3: 0.68,
    4: 0.86,
    5: 1.06,
  };
  const s = scaleMap[anchorLevel];

  return (
    <svg
      viewBox="0 0 100 96"
      className={className}
      role="img"
      aria-label={title || `SAM Dominância nível ${anchorLevel}`}
    >
      {/* Subtle reference boundary frame so size progression is unmistakably clear */}
      <rect
        x="10"
        y="8"
        width="80"
        height="80"
        rx="6"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="1.8"
        strokeDasharray="4 3"
      />
      <g transform={`translate(50 50) scale(${s}) translate(-50 -48)`}>
        <g stroke={STROKE} strokeWidth={Math.max(2.2, 2.6 / Math.sqrt(s))} strokeLinecap="round" strokeLinejoin="round" fill={FILL}>
          <rect x="29" y="8" width="42" height="34" rx="6" />
          <rect x="44" y="42" width="12" height="5" />
          <path d="M22 47 L78 47 L78 74 L67 74 L67 57 L65 57 L65 88 L35 88 L35 57 L33 57 L33 74 L22 74 Z" />
          <circle cx="41" cy="22" r="2.3" fill={STROKE} />
          <circle cx="59" cy="22" r="2.3" fill={STROKE} />
          <line x1="42" y1="33" x2="58" y2="33" />
        </g>
      </g>
    </svg>
  );
};
