import React from 'react';
import type { DimensionKey, ScaleType } from '../utils/emotiSam';

interface EmotiSamFaceProps {
  dimension: DimensionKey;
  /** 5 = most positive/high control, 4 = pos intermediate, 3 = neutral, 2 = neg intermediate, 1 = most negative/low control */
  anchorLevel: 1 | 2 | 3 | 4 | 5;
  scaleVariant?: ScaleType;
  className?: string;
  title?: string;
}

const INK = '#111827';
const YELLOW = '#FFE11A';
const YELLOW_SHADE = '#F5C400';
const BURST_ORANGE = '#FB7A1E';
const BURST_GOLD = '#F59E0B';
const HEART_RED = '#E11D48';

export const EmotiSamFace: React.FC<EmotiSamFaceProps> = ({
  dimension,
  anchorLevel,
  scaleVariant = 5,
  className = 'w-16 h-14',
  title,
}) => {
  // VALENCE / PLEASURE
  if (dimension === 'valence') {
    if (anchorLevel === 5) {
      // Very happy smiling face with thumbs up (👍)
      return (
        <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Valência muito positiva: sorrindo com polegar para cima'}>
          <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Face */}
            <circle cx="44" cy="46" r="30" fill={YELLOW} />
            <path d="M22 61 C30 72, 56 72, 65 60" fill="none" stroke={YELLOW_SHADE} strokeWidth="4" opacity="0.7" />
            {/* Eyes */}
            <ellipse cx="35" cy="36" rx="2.6" ry="5" fill={INK} />
            <ellipse cx="52" cy="36" rx="2.6" ry="5" fill={INK} />
            {/* Happy open mouth with teeth and tongue */}
            <path d="M25 48 Q44 52 62 47 C60 66, 28 67, 25 48 Z" fill="#FFFFFF" />
            <path d="M35 60 Q44 55 53 60 C49 64, 39 64, 35 60 Z" fill="#F43F5E" stroke="none" />
            <path d="M25 48 Q44 52 62 47 C60 66, 28 67, 25 48 Z" fill="none" />
            {/* Thumbs up hand on the right */}
            <path
              d="M78 48 C78 36, 82 24, 88 24 C92 24, 92 34, 90 42 L99 42 C104 42, 105 49, 100 50 C105 51, 105 57, 99 58 C104 59, 103 65, 98 66 C101 67, 100 73, 94 73 L79 73 C75 73, 73 68, 73 62 L73 53 C73 49, 75 48, 78 48 Z"
              fill={YELLOW}
            />
            <path d="M90 50 L99 50 M90 58 L98 58 M90 66 L97 66" fill="none" strokeWidth="2.4" />
          </g>
        </svg>
      );
    }

    if (anchorLevel === 4) {
      // Gentle warm smile
      return (
        <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Valência positiva: sorridente'}>
          <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="58" cy="46" r="30" fill={YELLOW} />
            <ellipse cx="48" cy="36" rx="2.5" ry="4.8" fill={INK} />
            <ellipse cx="67" cy="36" rx="2.5" ry="4.8" fill={INK} />
            <path d="M39 50 C45 64, 71 64, 77 50" fill="none" />
          </g>
        </svg>
      );
    }

    if (anchorLevel === 3) {
      // Neutral face
      return (
        <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Valência neutra'}>
          <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="58" cy="46" r="30" fill={YELLOW} />
            <ellipse cx="48" cy="36" rx="2.4" ry="4.8" fill={INK} />
            <ellipse cx="67" cy="36" rx="2.4" ry="4.8" fill={INK} />
            <path d="M47 56 L69 55" fill="none" />
          </g>
        </svg>
      );
    }

    if (anchorLevel === 2) {
      // Sad downturned mouth
      return (
        <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Valência negativa: triste'}>
          <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="58" cy="46" r="30" fill={YELLOW} />
            <ellipse cx="48" cy="37" rx="2.4" ry="4.6" fill={INK} />
            <ellipse cx="67" cy="37" rx="2.4" ry="4.6" fill={INK} />
            <path d="M43 59 C49 50, 67 50, 73 59" fill="none" />
          </g>
        </svg>
      );
    }

    // anchorLevel === 1: Angry face with thumbs down (👎)
    return (
      <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Valência muito negativa: irritado com polegar para baixo'}>
        <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="44" cy="44" r="30" fill={YELLOW} />
          {/* Angry eyebrows & scowling eyes */}
          <path d="M27 29 L41 37" fill="none" strokeWidth="3.6" />
          <path d="M61 29 L47 37" fill="none" strokeWidth="3.6" />
          <path d="M30 37 C34 33, 39 34, 41 38 C37 40, 32 40, 30 37 Z" fill="#FFFFFF" />
          <path d="M47 38 C49 34, 54 33, 58 37 C56 40, 51 40, 47 38 Z" fill="#FFFFFF" />
          <circle cx="36" cy="37" r="1.5" fill={INK} />
          <circle cx="52" cy="37" r="1.5" fill={INK} />
          {/* Angry downturned mouth */}
          <path d="M33 57 C39 50, 49 50, 55 56" fill="none" />
          {/* Thumbs down hand on the right */}
          <path
            d="M78 44 L94 44 C100 44, 102 49, 98 51 C104 52, 104 58, 99 59 C104 60, 103 66, 98 67 C101 69, 99 74, 92 74 L92 84 C92 89, 86 90, 84 84 C82 78, 80 73, 76 70 C73 67, 72 62, 72 56 L72 49 C72 46, 75 44, 78 44 Z"
            fill={YELLOW}
          />
          <path d="M88 51 L97 51 M88 59 L97 59 M88 67 L96 67" fill="none" strokeWidth="2.4" />
        </g>
      </svg>
    );
  }

  // AROUSAL / EXCITEMENT
  if (dimension === 'arousal') {
    if (anchorLevel === 5) {
      // Excited radiant face surrounded by orange burst rays, light bulb 💡, and red hearts ❤️
      return (
        <svg viewBox="0 0 120 96" className={className} role="img" aria-label={title || 'Excitação máxima: radiante com ideias e entusiasmo'}>
          <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Fiery orange burst petals around the face (faithful to FormularioPapel_v2) */}
            <path
              d="M60 8 L69 24 L89 10 L96 34 L112 38 L94 53 L106 72 L83 70 L78 88 L62 74 L44 88 L40 68 L14 73 L28 54 L10 40 L32 34 L28 12 L50 24 Z"
              fill={BURST_ORANGE}
            />
            {/* Yellow radiant face */}
            <circle cx="58" cy="49" r="21" fill={YELLOW} strokeWidth="3.2" />
            {/* Wide ecstatic eyes */}
            <ellipse cx="51" cy="43" rx="3.4" ry="4.4" fill="#FFFFFF" strokeWidth="2.6" />
            <ellipse cx="64" cy="43" rx="3.4" ry="4.4" fill="#FFFFFF" strokeWidth="2.6" />
            <circle cx="51" cy="43" r="1.2" fill={INK} stroke="none" />
            <circle cx="64" cy="43" r="1.2" fill={INK} stroke="none" />
            {/* Big joyful mouth */}
            <path d="M47 54 Q58 57 69 54 C67 65, 49 65, 47 54 Z" fill="#FFFFFF" strokeWidth="2.6" />
            {/* Light bulb 💡 in upper-right burst */}
            <g transform="translate(77, 13)">
              <circle cx="10" cy="10" r="7.5" fill="#FEF08A" stroke={INK} strokeWidth="2.2" />
              <path d="M7 16 L13 16 L12 20 L8 20 Z" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
              <path d="M10 10 L10 14 M8 8 L12 8" fill="none" stroke={INK} strokeWidth="1.6" />
            </g>
            {/* Red hearts ❤️ in lower-left burst */}
            <path
              d="M29 66 C26 62, 20 65, 22 70 C24 74, 29 77, 29 77 C29 77, 34 74, 36 70 C38 65, 32 62, 29 66 Z"
              fill={HEART_RED}
              stroke={INK}
              strokeWidth="1.8"
            />
            <path
              d="M40 73 C38 70, 34 72, 35 75 C36 78, 40 80, 40 80 C40 80, 44 78, 45 75 C46 72, 42 70, 40 73 Z"
              fill={HEART_RED}
              stroke={INK}
              strokeWidth="1.8"
            />
          </g>
        </svg>
      );
    }

    if (anchorLevel === 4) {
      // Smiling face illuminated like a sun with rays
      return (
        <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Excitação positiva: iluminado como um sol'}>
          <g stroke={BURST_GOLD} strokeWidth="3.2" strokeLinecap="round">
            <line x1="58" y1="6" x2="58" y2="14" />
            <line x1="58" y1="78" x2="58" y2="86" />
            <line x1="18" y1="46" x2="26" y2="46" />
            <line x1="90" y1="46" x2="98" y2="46" />
            <line x1="29" y1="18" x2="35" y2="24" />
            <line x1="87" y1="18" x2="81" y2="24" />
            <line x1="29" y1="74" x2="35" y2="68" />
            <line x1="87" y1="74" x2="81" y2="68" />
          </g>
          <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="58" cy="46" r="26" fill={YELLOW} />
            <ellipse cx="49" cy="38" rx="2.4" ry="4.5" fill={INK} />
            <ellipse cx="67" cy="38" rx="2.4" ry="4.5" fill={INK} />
            <path d="M43 50 C48 61, 68 61, 73 50" fill="none" />
          </g>
        </svg>
      );
    }

    if (anchorLevel === 3) {
      // Neutral face
      return (
        <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Excitação neutra'}>
          <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="58" cy="46" r="28" fill={YELLOW} />
            <ellipse cx="49" cy="38" rx="2.4" ry="4.5" fill={INK} />
            <ellipse cx="67" cy="38" rx="2.4" ry="4.5" fill={INK} />
            <path d="M47 55 L69 54" fill="none" />
          </g>
        </svg>
      );
    }

    if (anchorLevel === 2) {
      // Bored face resting on hand, looking sideways
      return (
        <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Excitação negativa: entediado apoiado na mão'}>
          <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="62" cy="43" r="27" fill={YELLOW} />
            {/* Half-lidded bored eyes looking sideways */}
            <path d="M44 37 Q51 34 57 37 C56 43, 45 43, 44 37 Z" fill="#FFFFFF" />
            <path d="M64 37 Q71 34 77 37 C76 43, 65 43, 64 37 Z" fill="#FFFFFF" />
            <circle cx="53" cy="38" r="1.6" fill={INK} stroke="none" />
            <circle cx="73" cy="38" r="1.6" fill={INK} stroke="none" />
            <path d="M46 28 Q52 25 56 28" fill="none" strokeWidth="2.4" />
            <path d="M66 28 Q72 25 76 28" fill="none" strokeWidth="2.4" />
            <path d="M56 54 L68 54" fill="none" />
            {/* Hand resting against cheek/chin on left */}
            <path
              d="M25 65 C22 65, 22 72, 26 72 L36 72 C41 72, 43 68, 42 62 L40 53 C39 49, 34 50, 34 55 L34 62 L26 62 Z"
              fill={YELLOW}
            />
            <path d="M27 65 L32 65 M27 69 L32 69" fill="none" strokeWidth="2" />
          </g>
        </svg>
      );
    }

    // anchorLevel === 1: Sleeping face with closed eyes and "Z z z"
    return (
      <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Excitação mínima: dormindo Zzz'}>
        <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <g transform="rotate(-14 48 54)">
            <circle cx="48" cy="54" r="27" fill={YELLOW} />
            {/* Closed sleeping eyes */}
            <path d="M33 49 Q39 53 45 49" fill="none" />
            <path d="M52 49 Q58 53 64 49" fill="none" />
            {/* Tiny round mouth */}
            <path d="M44 64 Q49 62 54 64" fill="none" />
          </g>
          {/* Bold black Z z z */}
          <path d="M74 34 L85 34 L74 47 L85 47" fill="none" strokeWidth="3.4" />
          <path d="M88 22 L96 22 L88 31 L96 31" fill="none" strokeWidth="2.8" />
          <path d="M98 12 L104 12 L98 19 L104 19" fill="none" strokeWidth="2.2" />
        </g>
      </svg>
    );
  }

  // DOMINANCE / CONTROL
  if (anchorLevel === 5) {
    // Confident/intelligent face wearing glasses and graduation cap (🎓)
    return (
      <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Dominância máxima: confiante com óculos e capelo de formatura'}>
        <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          {/* Yellow face */}
          <circle cx="58" cy="53" r="27" fill={YELLOW} />
          {/* Graduation cap */}
          <polygon points="58,10 92,23 58,34 24,23" fill="#1F2937" />
          <path d="M37 28 L37 37 C46 42, 70 42, 79 37 L79 28" fill="#1F2937" />
          {/* Tassel */}
          <path d="M29 25 L26 39" fill="none" stroke="#F59E0B" strokeWidth="2.8" />
          <circle cx="26" cy="40" r="2.6" fill="#F59E0B" stroke={INK} strokeWidth="1.8" />
          {/* Glasses */}
          <circle cx="48" cy="48" r="8" fill="#FFFFFF" fillOpacity="0.45" strokeWidth="2.8" />
          <circle cx="68" cy="48" r="8" fill="#FFFFFF" fillOpacity="0.45" strokeWidth="2.8" />
          <line x1="56" y1="48" x2="60" y2="48" strokeWidth="2.6" />
          <circle cx="48" cy="48" r="2.2" fill={INK} stroke="none" />
          <circle cx="68" cy="48" r="2.2" fill={INK} stroke="none" />
          {/* Confident wide smile */}
          <path d="M42 61 Q58 64 74 61 C71 73, 45 73, 42 61 Z" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  if (anchorLevel === 4) {
    // Calm smiling face
    return (
      <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Dominância positiva: tranquilo e confiante'}>
        <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="58" cy="48" r="28" fill={YELLOW} />
          <ellipse cx="48" cy="39" rx="2.4" ry="4.5" fill={INK} />
          <ellipse cx="68" cy="39" rx="2.4" ry="4.5" fill={INK} />
          <path d="M42 52 C48 64, 68 64, 74 52" fill="none" />
        </g>
      </svg>
    );
  }

  if (anchorLevel === 3) {
    // Neutral face
    return (
      <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Dominância neutra'}>
        <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="58" cy="48" r="28" fill={YELLOW} />
          <ellipse cx="48" cy="39" rx="2.4" ry="4.5" fill={INK} />
          <ellipse cx="68" cy="39" rx="2.4" ry="4.5" fill={INK} />
          <path d="M47 57 L69 56" fill="none" />
        </g>
      </svg>
    );
  }

  if (anchorLevel === 2) {
    // Pensive/confused face with "???" above head and finger on chin
    return (
      <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Dominância baixa: confuso com pontos de interrogação'}>
        <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="55" cy="54" r="26" fill={YELLOW} />
          {/* Eyes looking up */}
          <ellipse cx="47" cy="47" rx="2.2" ry="4" fill={INK} />
          <ellipse cx="63" cy="47" rx="2.2" ry="4" fill={INK} />
          {/* Small uncertain mouth */}
          <path d="M48 63 Q54 61 59 64" fill="none" />
          {/* Thinking finger at chin */}
          <path
            d="M49 74 C49 69, 55 68, 56 74 L56 85 C56 88, 49 88, 49 85 Z"
            fill={YELLOW}
          />
          <path d="M56 78 C62 78, 63 85, 56 86" fill={YELLOW} />
          {/* Question marks ??? */}
          <text x="58" y="29" fill={INK} stroke="none" fontSize="26" fontWeight="800" fontFamily="serif">?</text>
          <text x="41" y="25" fill={INK} stroke="none" fontSize="18" fontWeight="800" fontFamily="serif">?</text>
          <text x="77" y="42" fill={INK} stroke="none" fontSize="20" fontWeight="800" fontFamily="serif">?</text>
        </g>
      </svg>
    );
  }

  // anchorLevel === 1: Disappointed / frustrated face (consistent across 3, 5, and 9-point scales — no hat)
  return (
    <svg viewBox="0 0 116 92" className={className} role="img" aria-label={title || 'Dominância mínima: sem controle ou frustrado'}>
      <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="58" cy="50" r="28" fill={YELLOW} />
        {/* Worried drooping eyebrows */}
        <path d="M40 40 Q46 38 51 34" fill="none" strokeWidth="2.8" />
        <path d="M76 40 Q70 38 65 34" fill="none" strokeWidth="2.8" />
        {/* Sad eyes */}
        <path d="M40 46 Q46 50 52 46" fill="none" strokeWidth="2.8" />
        <path d="M64 46 Q70 50 76 46" fill="none" strokeWidth="2.8" />
        <circle cx="46" cy="44" r="1.8" fill={INK} stroke="none" />
        <circle cx="70" cy="44" r="1.8" fill={INK} stroke="none" />
        {/* Disappointed downturned mouth */}
        <path d="M45 64 C51 56, 65 56, 71 64" fill="none" />
      </g>
    </svg>
  );
};
