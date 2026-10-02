import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CATALOG, isSampleSku } from '../../lib/sample-catalog';

test('photographed sample has unique designs and no unverified material claims', () => {
  assert.equal(SAMPLE_CATALOG.length, 10);
  assert.equal(new Set(SAMPLE_CATALOG.map(item => item.slug)).size, 10);
  for (const item of SAMPLE_CATALOG) {
    assert.ok(item.price >= 1000 && Number.isInteger(item.stock) && item.stock > 0);
    assert.ok(item.bottom > item.top);
    assert.doesNotMatch(item.description, /925|oro|diamante|circonia|amatista/i);
  }
});
test('payment review marker does not block reviewed product codes', () => {
  assert.equal(isSampleSku('FRAN-MUESTRA-dije-cisnes'), true);
  assert.equal(isSampleSku('dije-cisnes'), false);
  assert.equal(isSampleSku(null), false);
});
