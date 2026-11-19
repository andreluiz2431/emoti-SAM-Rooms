import React from 'react';
import type { AnchorLevel, DimensionKey, InstrumentType } from '../utils/emotiSam';
import { EmotiSamFace } from './EmotiSamFaces';
import { SamOriginalFace } from './SamOriginalFaces';

interface InstrumentFigureProps {
  instrument: InstrumentType;
  dimension: DimensionKey;
  anchorLevel: AnchorLevel;
  altText: string;
  customImage?: string;
  className?: string;
}

export const InstrumentFigure: React.FC<InstrumentFigureProps> = ({
  instrument,
  dimension,
  anchorLevel,
  altText,
  customImage,
  className = 'w-16 h-14',
}) => {
  if (customImage) {
    return (
      <img
        src={customImage}
        alt={altText}
        referrerPolicy="no-referrer"
        className={`${className} object-contain`}
      />
    );
  }

  if (instrument === 'sam') {
    return (
      <SamOriginalFace
        dimension={dimension}
        anchorLevel={anchorLevel}
        title={altText}
        className={className}
      />
    );
  }

  return (
    <EmotiSamFace
      dimension={dimension}
      anchorLevel={anchorLevel}
      title={altText}
      className={className}
    />
  );
};
