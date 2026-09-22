import { describe, it, expect } from 'vitest';
import { getContextualProduct } from './affiliate';

describe('getContextualProduct', () => {
  it('returns pet category for dog and puppy topics', () => {
    const topResult = getContextualProduct('dog', 'top');
    expect(topResult.category).toBe('pet');
    expect(topResult.title).toContain('Nutrition & Health Essentials');

    const bottomResult = getContextualProduct('puppy', 'bottom');
    expect(bottomResult.category).toBe('pet');
    expect(bottomResult.title).toContain('Grooming, Training & Care Gear');
  });

  it('returns sports category for football and nba topics', () => {
    const topResult = getContextualProduct('football', 'top');
    expect(topResult.category).toBe('sports');
    expect(topResult.title).toContain('Matchday Apparel & Collector Kits');

    const bottomResult = getContextualProduct('nba', 'bottom');
    expect(bottomResult.category).toBe('sports');
    expect(bottomResult.title).toContain('Training Gear & Performance Equipment');
  });

  it('returns tech category for laptop and ai topics', () => {
    const topResult = getContextualProduct('laptop', 'top');
    expect(topResult.category).toBe('tech');
    expect(topResult.title).toContain('Tech Accessories & Workstation Upgrades');

    const bottomResult = getContextualProduct('ai', 'bottom');
    expect(bottomResult.category).toBe('tech');
    expect(bottomResult.title).toContain('Smart Devices & High-Performance Gear');
  });

  it('returns garden category for flower and tree topics', () => {
    const topResult = getContextualProduct('flower', 'top');
    expect(topResult.category).toBe('garden');
    expect(topResult.title).toContain('Organic Plant Care');

    const bottomResult = getContextualProduct('tree', 'bottom');
    expect(bottomResult.category).toBe('garden');
    expect(bottomResult.title).toContain('Pruning Tools');
  });

  it('returns general category for unknown topics', () => {
    const topResult = getContextualProduct('unknown topic', 'top');
    expect(topResult.category).toBe('general');
    expect(topResult.title).toContain('Bestselling Books & Audio Guides on unknown topic');

    const bottomResult = getContextualProduct('something else', 'bottom');
    expect(bottomResult.category).toBe('general');
    expect(bottomResult.title).toContain('Trending Deals & Top Recommendations Related to something else');
  });

  it('trims Care Guide and The Legend suffixes from topics', () => {
    const topResult1 = getContextualProduct('My Dog Care Guide', 'top');
    expect(topResult1.title).toContain('Premium Nutrition & Health Essentials for My Dog');

    const topResult2 = getContextualProduct('Game: The Legend of Zelda', 'top');
    expect(topResult2.title).toContain('Bestselling Books & Audio Guides on Game');
  });

  it('handles empty string properly', () => {
    const result = getContextualProduct('', 'top');
    expect(result.category).toBe('general');
    expect(result.title).toContain('Trending Topics');
  });
});
