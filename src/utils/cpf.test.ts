import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCpfMask, onlyDigits, validateCpf } from './cpf';

test('onlyDigits strips formatting characters', () => {
  assert.equal(onlyDigits('529.982.247-25'), '52998224725');
});

test('formatCpfMask applies progressive 000.000.000-00 mask', () => {
  assert.equal(formatCpfMask('529'), '529');
  assert.equal(formatCpfMask('529982'), '529.982');
  assert.equal(formatCpfMask('529982247'), '529.982.247');
  assert.equal(formatCpfMask('52998224725'), '529.982.247-25');
  assert.equal(formatCpfMask('52998224725999'), '529.982.247-25');
});

test('validateCpf accepts valid CPFs and rejects invalid/repeated ones', () => {
  assert.equal(validateCpf('529.982.247-25'), true);
  assert.equal(validateCpf('111.444.777-35'), true);
  assert.equal(validateCpf('111.111.111-11'), false);
  assert.equal(validateCpf('000.000.000-00'), false);
  assert.equal(validateCpf('529.982.247-26'), false);
  assert.equal(validateCpf('12345'), false);
});
