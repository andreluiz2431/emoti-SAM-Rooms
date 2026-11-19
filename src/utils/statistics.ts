import type { DimensionKey, RoomResponse, ScaleType } from './emotiSam';

export interface DivergingSegment {
  score: number;
  count: number;
  percent: number;
  color: string;
  textColor: string;
  polarity: 'negative' | 'neutral' | 'positive';
}

export interface DivergingRowData {
  key: DimensionKey;
  title: string;
  count: number;
  mean: number;
  leftSegments: DivergingSegment[]; // negative ordered from most negative (far left) -> mild negative (near neutral)
  neutralSegment: DivergingSegment; // straddles center axis (half left, half right)
  rightSegments: DivergingSegment[]; // positive ordered from mild positive (near neutral) -> most positive (far right)
  leftTotalPercent: number; // sum(negative) + neutral/2
  rightTotalPercent: number; // neutral/2 + sum(positive)
}

export interface BoxplotStats {
  key: DimensionKey;
  title: string;
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  iqr: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
}

export interface AffectiveGridPoint {
  valence: number;
  arousal: number;
  count: number;
  userIds: string[];
  participants: string[];
}

export function getScaleMidpoint(scale: ScaleType): number {
  if (scale === 3) return 2;
  if (scale === 9) return 5;
  return 3;
}

export function getDivergingColor(score: number, scale: ScaleType): { color: string; textColor: string } {
  if (scale === 3) {
    if (score === 3) return { color: '#15803D', textColor: '#FFFFFF' };
    if (score === 2) return { color: '#64748B', textColor: '#FFFFFF' };
    return { color: '#DC2626', textColor: '#FFFFFF' };
  }
  if (scale === 5) {
    switch (score) {
      case 5: return { color: '#15803D', textColor: '#FFFFFF' };
      case 4: return { color: '#4ADE80', textColor: '#0F172A' };
      case 3: return { color: '#64748B', textColor: '#FFFFFF' };
      case 2: return { color: '#FB923C', textColor: '#0F172A' };
      default: return { color: '#DC2626', textColor: '#FFFFFF' };
    }
  }
  const map9: Record<number, { color: string; textColor: string }> = {
    9: { color: '#15803D', textColor: '#FFFFFF' },
    8: { color: '#16A34A', textColor: '#FFFFFF' },
    7: { color: '#4ADE80', textColor: '#0F172A' },
    6: { color: '#86EFAC', textColor: '#0F172A' },
    5: { color: '#64748B', textColor: '#FFFFFF' },
    4: { color: '#FDBA74', textColor: '#0F172A' },
    3: { color: '#FB923C', textColor: '#0F172A' },
    2: { color: '#EF4444', textColor: '#FFFFFF' },
    1: { color: '#B91C1C', textColor: '#FFFFFF' },
  };
  return map9[score] || { color: '#64748B', textColor: '#FFFFFF' };
}

/**
 * Computes diverging stacked bar distribution centered on the neutral midpoint
 * (Figure 9 of Hayashi et al., 2016).
 */
export function computeDivergingRow(
  responses: RoomResponse[],
  scale: ScaleType,
  key: DimensionKey,
  title: string
): DivergingRowData {
  const mid = getScaleMidpoint(scale);
  const count = responses.length;
  const sum = responses.reduce((acc, r) => acc + r[key], 0);
  const mean = count > 0 ? Number((sum / count).toFixed(2)) : 0;

  const makeSegment = (score: number): DivergingSegment => {
    const c = responses.filter((r) => r[key] === score).length;
    const pct = count > 0 ? Number(((c / count) * 100).toFixed(1)) : 0;
    const { color, textColor } = getDivergingColor(score, scale);
    const polarity = score < mid ? 'negative' : score > mid ? 'positive' : 'neutral';
    return { score, count: c, percent: pct, color, textColor, polarity };
  };

  const leftSegments: DivergingSegment[] = [];
  for (let s = 1; s < mid; s++) {
    leftSegments.push(makeSegment(s));
  }
  const neutralSegment = makeSegment(mid);
  const rightSegments: DivergingSegment[] = [];
  for (let s = mid + 1; s <= scale; s++) {
    rightSegments.push(makeSegment(s));
  }

  const negSum = leftSegments.reduce((acc, seg) => acc + seg.percent, 0);
  const posSum = rightSegments.reduce((acc, seg) => acc + seg.percent, 0);

  return {
    key,
    title,
    count,
    mean,
    leftSegments,
    neutralSegment,
    rightSegments,
    leftTotalPercent: Number((negSum + neutralSegment.percent / 2).toFixed(1)),
    rightTotalPercent: Number((posSum + neutralSegment.percent / 2).toFixed(1)),
  };
}

/**
 * Computes linear-interpolated percentile (R-7 / Excel INC method) on a sorted numeric array.
 */
export function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return Number((sorted[lower] * (1 - weight) + sorted[upper] * weight).toFixed(2));
}

/**
 * Computes Tukey boxplot summary statistics (Q1, median, Q3, whiskers, and outliers)
 * inspired by Figure 8 of Hayashi et al. (2016).
 */
export function computeBoxplotStats(
  responses: RoomResponse[],
  key: DimensionKey,
  title: string
): BoxplotStats {
  const values = responses.map((r) => r[key]).sort((a, b) => a - b);
  const count = values.length;
  if (count === 0) {
    return {
      key,
      title,
      count: 0,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      mean: 0,
      iqr: 0,
      whiskerLow: 0,
      whiskerHigh: 0,
      outliers: [],
    };
  }

  const min = values[0];
  const max = values[count - 1];
  const q1 = percentileSorted(values, 0.25);
  const median = percentileSorted(values, 0.5);
  const q3 = percentileSorted(values, 0.75);
  const iqr = Number((q3 - q1).toFixed(2));
  const mean = Number((values.reduce((a, b) => a + b, 0) / count).toFixed(2));

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const inliers = values.filter((v) => v >= lowerFence && v <= upperFence);
  const outliers = values.filter((v) => v < lowerFence || v > upperFence);
  const whiskerLow = inliers.length > 0 ? inliers[0] : min;
  const whiskerHigh = inliers.length > 0 ? inliers[inliers.length - 1] : max;

  return {
    key,
    title,
    count,
    min,
    q1,
    median,
    q3,
    max,
    mean,
    iqr,
    whiskerLow,
    whiskerHigh,
    outliers,
  };
}

/**
 * Aggregates responses onto the 2D Affective Grid (Valence x Arousal).
 */
export function computeAffectiveGridPoints(responses: RoomResponse[]): AffectiveGridPoint[] {
  const map = new Map<string, AffectiveGridPoint>();
  for (const r of responses) {
    const key = `${r.valence},${r.arousal}`;
    const existing = map.get(key);
    const label = r.participantName || r.userId || 'Anônimo';
    if (existing) {
      existing.count += 1;
      if (r.userId) existing.userIds.push(r.userId);
      existing.participants.push(label);
    } else {
      map.set(key, {
        valence: r.valence,
        arousal: r.arousal,
        count: 1,
        userIds: r.userId ? [r.userId] : [],
        participants: [label],
      });
    }
  }
  return Array.from(map.values());
}
