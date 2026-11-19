import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RoomResponse } from './emotiSam';
import {
  computeAffectiveGridPoints,
  computeBoxplotStats,
  computeDivergingRow,
  percentileSorted,
} from './statistics';

function makeResponse(id: string, v: number, a: number, d: number, userId = `USR-${id}`): RoomResponse {
  return {
    id,
    userId,
    participantName: '',
    valence: v,
    arousal: a,
    dominance: d,
    comment: '',
    submittedAt: '2026-01-10T12:00:00.000Z',
  };
}

describe('statistics utilities (Hayashi et al. charts)', () => {
  it('computes diverging stacked bar splits centered on neutral midpoint for 3, 5, and 9 scales', () => {
    const responses5 = [
      makeResponse('1', 1, 3, 5),
      makeResponse('2', 2, 3, 5),
      makeResponse('3', 3, 3, 5),
      makeResponse('4', 4, 3, 5),
      makeResponse('5', 5, 3, 5),
    ];
    const row5 = computeDivergingRow(responses5, 5, 'valence', 'Valência');
    assert.equal(row5.leftSegments.length, 2);
    assert.equal(row5.neutralSegment.score, 3);
    assert.equal(row5.neutralSegment.percent, 20);
    assert.equal(row5.rightSegments.length, 2);
    assert.equal(row5.leftTotalPercent, 50); // 20 + 20 + 20/2
    assert.equal(row5.rightTotalPercent, 50); // 20/2 + 20 + 20

    const responses3 = [makeResponse('a', 1, 2, 3), makeResponse('b', 3, 2, 3)];
    const row3 = computeDivergingRow(responses3, 3, 'valence', 'Valência');
    assert.equal(row3.neutralSegment.score, 2);
    assert.equal(row3.leftTotalPercent, 50);
    assert.equal(row3.rightTotalPercent, 50);
  });

  it('computes boxplot quartiles, Tukey whiskers, and outliers accurately', () => {
    assert.equal(percentileSorted([1, 2, 3, 4, 5], 0.5), 3);

    // 7 scores of 8-9 plus one extreme outlier of 1 on a 9-point scale
    const responses = [
      makeResponse('1', 1, 5, 5),
      makeResponse('2', 8, 5, 5),
      makeResponse('3', 8, 5, 5),
      makeResponse('4', 8, 5, 5),
      makeResponse('5', 9, 5, 5),
      makeResponse('6', 9, 5, 5),
      makeResponse('7', 9, 5, 5),
      makeResponse('8', 9, 5, 5),
    ];
    const bp = computeBoxplotStats(responses, 'valence', 'Valência');
    assert.equal(bp.min, 1);
    assert.equal(bp.max, 9);
    assert.equal(bp.q1, 8);
    assert.equal(bp.median, 8.5);
    assert.equal(bp.q3, 9);
    assert.deepEqual(bp.outliers, [1]);
    assert.equal(bp.whiskerLow, 8);
    assert.equal(bp.whiskerHigh, 9);
  });

  it('aggregates 2D Affective Grid points by (valence, arousal) coordinate', () => {
    const responses = [
      makeResponse('1', 5, 4, 5, 'USR-1'),
      makeResponse('2', 5, 4, 3, 'USR-2'),
      makeResponse('3', 2, 1, 2, 'USR-3'),
    ];
    const pts = computeAffectiveGridPoints(responses);
    assert.equal(pts.length, 2);
    const cluster = pts.find((p) => p.valence === 5 && p.arousal === 4);
    assert.ok(cluster);
    assert.equal(cluster.count, 2);
    assert.deepEqual(cluster.userIds, ['USR-1', 'USR-2']);
  });
});
