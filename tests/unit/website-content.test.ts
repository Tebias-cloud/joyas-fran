import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WEBSITE_CONTENT, parseWebsiteContent, selectFeaturedJewels, websiteContentSchema } from '../../lib/website-content';

test('website settings reject foreign images and invalid selections', () => {
  const base = structuredClone(DEFAULT_WEBSITE_CONTENT);
  assert.equal(websiteContentSchema.safeParse(base).success, true);
  for (const heroImage of ['https://other.example/photo.jpg', 'javascript:alert(1)', '/banner-home.webp']) {
    assert.equal(websiteContentSchema.safeParse({ ...base, heroImage }).success, false);
  }
  const id = '00000000-0000-4000-8000-000000000001';
  assert.equal(websiteContentSchema.safeParse({ ...base, featuredProductIds: [id, id] }).success, false);
  assert.equal(websiteContentSchema.safeParse({ ...base, heroPosition: 101 }).success, false);
  assert.equal(websiteContentSchema.safeParse({ ...base, story: '' }).success, false);
  assert.deepEqual(parseWebsiteContent(null), base);
});

test('featured jewels follow selection order and exclude exhausted or hidden items', () => {
  const jewel = { id: 'a', name: 'Joya', slug: 'joya', imageUrl: '', price: 100, stock: 1, isActive: true };
  const products = [jewel, { ...jewel, id: 'b', stock: 0 }, { ...jewel, id: 'c', isActive: false }, { ...jewel, id: 'd' }];
  assert.deepEqual(selectFeaturedJewels(products, ['d', 'b', 'a', 'c', 'missing']).map(item => item.id), ['d', 'a']);
});
