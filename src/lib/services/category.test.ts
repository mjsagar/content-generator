import { describe, it, expect } from 'vitest';
import { inferArticleCategory, getCategoryMeta, CATEGORIES } from './category';

describe('inferArticleCategory', () => {
  it('should categorize wildlife and nature topics correctly', () => {
    expect(
      inferArticleCategory(
        'Rewilding the UK’s Forgotten River Valleys: The Return of Beavers and Their Ecosystem Impact'
      )
    ).toBe('Wildlife & Nature');

    expect(
      inferArticleCategory(
        'The secret life of hedgehog highways: mapping community corridors in urban Britain'
      )
    ).toBe('Wildlife & Nature');

    expect(
      inferArticleCategory('Border Terrier Grooming and Care Guide')
    ).toBe('Wildlife & Nature');
  });

  it('should categorize personal finance topics correctly', () => {
    expect(
      inferArticleCategory('Cash ISA vs Stocks & Shares ISA: A Comprehensive Guide for British Savers')
    ).toBe('Personal Finance');

    expect(
      inferArticleCategory('Maximizing Your Pension Tax Relief Before the Tax Year Ends')
    ).toBe('Personal Finance');
  });

  it('should categorize home and garden topics correctly', () => {
    expect(
      inferArticleCategory('Monstera Deliciosa Care Guide: Growing Vibrant Foliage Indoors')
    ).toBe('Home & Garden');

    expect(
      inferArticleCategory('Allotment Planning for British Soil and Weather')
    ).toBe('Home & Garden');
  });

  it('should categorize heritage and travel topics correctly', () => {
    expect(
      inferArticleCategory('Why narrowboat living on British canals is booming in 2026')
    ).toBe('Heritage & Travel');

    expect(
      inferArticleCategory('Inside Gracie Mansion: NYC’s Historic Architectural Treasure')
    ).toBe('Heritage & Travel');
  });

  it('should categorize tech and innovation topics correctly', () => {
    expect(
      inferArticleCategory('The Rollout of Ultra-Fast EV Chargers Across the UK Highway Network')
    ).toBe('Tech & Innovation');

    expect(
      inferArticleCategory('Quantum Computing Breakthroughs at British Universities')
    ).toBe('Tech & Innovation');
  });

  it('should categorize news and society topics correctly', () => {
    expect(
      inferArticleCategory('Trump TV: How the Former US President’s Media Empire Is Shaping British Viewership')
    ).toBe('News & Society');
  });

  it('should categorize sports and culture topics correctly', () => {
    expect(
      inferArticleCategory('Comerica Park: The Heartbeat of Detroit Baseball and Modern Ballpark Architecture')
    ).toBe('Sports & Culture');

    expect(
      inferArticleCategory('Bruce Willis: The Action Legend and His British Cult Following')
    ).toBe('Sports & Culture');
  });

  it('should default to General for unrecognized generic topics', () => {
    expect(inferArticleCategory('Miscellaneous Reflections on Daily Routine')).toBe('General');
  });
});

describe('getCategoryMeta', () => {
  it('should return correct metadata for exact and case-insensitive names', () => {
    const meta = getCategoryMeta('Wildlife & Nature');
    expect(meta.name).toBe('Wildlife & Nature');
    expect(meta.icon).toBe('🌿');
    expect(meta.id).toBe('wildlife-nature');

    const metaLower = getCategoryMeta('personal finance');
    expect(metaLower.name).toBe('Personal Finance');
    expect(metaLower.icon).toBe('💷');
  });

  it('should fall back to General for undefined or unknown category', () => {
    const meta = getCategoryMeta(undefined);
    expect(meta.name).toBe('General');
    expect(meta.icon).toBe('✨');
  });
});
