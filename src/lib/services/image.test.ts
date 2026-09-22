import { describe, it, expect } from 'vitest';
import { extractCoreSubject } from './image';

describe('extractCoreSubject', () => {
  it('should handle empty or undefined inputs gracefully', () => {
    expect(extractCoreSubject('')).toBe('');
    // The type signature requires a string, but since we test raw functionality,
    // let's cast if we want to ensure runtime safety:
    expect(extractCoreSubject(undefined as any)).toBe('');
  });

  describe('leading prefix removal', () => {
    it('should strip "the "', () => {
      expect(extractCoreSubject('The Detroit Tigers')).toBe('Detroit Tigers');
      expect(extractCoreSubject('the greatest story')).toBe('greatest story');
    });

    it('should strip "ultimate "', () => {
      expect(extractCoreSubject('Ultimate Guide to CSS')).toBe('CSS');
      expect(extractCoreSubject('ultimate frisbee')).toBe('frisbee');
    });

    it('should strip "inside "', () => {
      expect(extractCoreSubject('Inside the mind of a genius')).toBe('the mind of a genius');
    });

    it('should strip "how to "', () => {
      expect(extractCoreSubject('How to build a house')).toBe('build a house');
    });

    it('should strip "guide to "', () => {
      expect(extractCoreSubject('Guide to Paris')).toBe('Paris');
    });

    it('should handle sequential leading prefixes correctly', () => {
      // The function does regex replacements sequentially.
      // So "The Ultimate Guide to React" -> "Ultimate Guide to React" (strips "The ")
      // Since it's applied on the intermediate string, `^ultimate\s+` will match!
      expect(extractCoreSubject('The Ultimate Guide to Space')).toBe('Space');
      // Let's also check complex cases:
      expect(extractCoreSubject('The Ultimate Inside How to Guide to Success')).toBe('Success');
    });
  });

  describe('trailing suffix removal', () => {
    it('should strip "care guide" and everything after it', () => {
      expect(extractCoreSubject('Monstera Deliciosa care guide and tips')).toBe('Monstera Deliciosa');
      expect(extractCoreSubject('Pothos Care Guide')).toBe('Pothos');
    });

    it('should strip ":" and everything after it', () => {
      expect(extractCoreSubject('Comerica Park: The Heartbeat of Detroit Baseball')).toBe('Comerica Park');
      expect(extractCoreSubject('Star Wars: A New Hope')).toBe('Star Wars');
    });

    it('should strip "–" (en dash) and everything after it', () => {
      expect(extractCoreSubject('Latest News – BBC')).toBe('Latest News');
      expect(extractCoreSubject('React 18 – What is new?')).toBe('React 18');
    });

    it('should strip "-" (hyphen) and everything after it', () => {
      expect(extractCoreSubject('Breaking Bad - Review')).toBe('Breaking Bad');
      expect(extractCoreSubject('Postgres - The Ultimate Guide')).toBe('Postgres');
    });

    it('should strip "grooming" and everything after it', () => {
      expect(extractCoreSubject('Poodle grooming essentials')).toBe('Poodle');
    });

    it('should strip "history" and everything after it', () => {
      expect(extractCoreSubject('World War II history and facts')).toBe('World War II');
    });

    it('should strip "tips" and everything after it', () => {
      expect(extractCoreSubject('Gardening tips for beginners')).toBe('Gardening');
    });
  });

  describe('trimming behavior', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(extractCoreSubject('  Hello World  ')).toBe('Hello World');
      expect(extractCoreSubject('The   React ')).toBe('React');
    });
  });

  describe('combined behavior', () => {
    it('should handle complex combinations correctly', () => {
      // "The Ultimate Guide to React - History and Tips"
      // 1. "The " -> "Ultimate Guide to React - History and Tips"
      // 2. "Ultimate " -> "Guide to React - History and Tips"
      // 3. "Inside " -> no match
      // 4. "How to " -> no match
      // 5. "Guide to " -> "React - History and Tips"
      // 6. "care guide..." -> no match
      // 7. ":..." -> no match
      // 8. "–..." -> no match
      // 9. "-..." -> "React "
      // 10. "grooming..." -> no match
      // 11. "history..." -> no match
      // 12. "tips..." -> no match
      // 13. trim() -> "React"
      expect(extractCoreSubject('The Ultimate Guide to React - History and Tips')).toBe('React');
    });
  });
});

describe('stemWord', () => {
  it('should stem plurals correctly', async () => {
    const { stemWord } = await import('./image');
    expect(stemWord('beavers')).toBe('beaver');
    expect(stemWord('valleys')).toBe('valley');
    expect(stemWord('hedgehogs')).toBe('hedgehog');
    expect(stemWord('berries')).toBe('berry');
  });
});

describe('isPageRelevant', () => {
  it('should accept relevant pages and reject irrelevant pages for beaver article', async () => {
    const { isPageRelevant } = await import('./image');
    const topic = 'Rewilding the UK’s Forgotten River Valleys: The Return of Beavers and Their Ecosystem Impact';

    // Must accept authentic beaver matches
    expect(isPageRelevant('Eurasian beaver', 'Eurasian beaver', topic)).toBe(true);
    expect(isPageRelevant('Beaver', 'Beaver', topic)).toBe(true);
    expect(isPageRelevant('Eurasian beaver reintroduction', 'Eurasian beaver', topic)).toBe(true);

    // Must reject unrelated matches
    expect(isPageRelevant('Henry David Thoreau', 'Rewilding the UK’s Forgotten River Valleys', topic)).toBe(false);
    expect(isPageRelevant('Ghost town', 'Rewilding the UK’s Forgotten River Valleys', topic)).toBe(false);
    expect(isPageRelevant('Abandoned village', 'Rewilding the UK’s Forgotten River Valleys', topic)).toBe(false);
    expect(isPageRelevant('Ecofascism', 'Rewilding the UK’s Forgotten River Valleys', topic)).toBe(false);
  });

  it('should reject Nikolai Yezhov for hedgehog article', async () => {
    const { isPageRelevant } = await import('./image');
    const topic = 'The secret life of hedgehog highways: mapping community corridors in urban Britain';

    expect(isPageRelevant('European hedgehog', 'European hedgehog', topic)).toBe(true);
    expect(isPageRelevant('Hedgehog', 'Hedgehog', topic)).toBe(true);
    expect(isPageRelevant('Nikolai Yezhov', 'hedgehog highways', topic)).toBe(false);
  });

  it('should accept relevant person pages for celebrity/people articles', async () => {
    const { isPageRelevant } = await import('./image');
    expect(isPageRelevant('Bruce Willis', 'Bruce Willis', 'Bruce Willis: Action Icon Who Rules UK')).toBe(true);
    expect(isPageRelevant('Alexis Bledel', 'Alexis Bledel', 'Alexis Bledel: From Gilmore Girls Icon to UK')).toBe(true);
  });

  it('should reject Donald Trump Jr. when article is about former US president Donald Trump', async () => {
    const { isPageRelevant } = await import('./image');
    const topic = 'Trump TV: How the Former US President’s Media Empire Is Shaping British Viewership';

    expect(isPageRelevant('Donald Trump', 'Donald Trump', topic)).toBe(true);
    expect(isPageRelevant('Donald Trump Jr.', 'Donald Trump', topic)).toBe(false);
  });
});

describe('extractCandidateSearchTerms', () => {
  it('should extract specific entity cues in priority order', async () => {
    const { extractCandidateSearchTerms } = await import('./image');
    const terms = extractCandidateSearchTerms('Rewilding the UK’s Forgotten River Valleys: The Return of Beavers and Their Ecosystem Impact');

    expect(terms).toContain('Eurasian beaver');
    expect(terms).toContain('Beaver');
    expect(terms[0]).toBe('Eurasian beaver');
  });

  it('should extract hedgehog cues', async () => {
    const { extractCandidateSearchTerms } = await import('./image');
    const terms = extractCandidateSearchTerms('The secret life of hedgehog highways: mapping community corridors in urban Britain');

    expect(terms).toContain('European hedgehog');
    expect(terms).toContain('Hedgehog');
  });

  it('should extract Donald Trump for Trump TV topic', async () => {
    const { extractCandidateSearchTerms } = await import('./image');
    const terms = extractCandidateSearchTerms('Trump TV: How the Former US President’s Media Empire Is Shaping British Viewership');

    expect(terms).toContain('Donald Trump');
    expect(terms[0]).toBe('Donald Trump');
  });
});

describe('isImageFreeToUse', () => {
  it('should accept valid Wikimedia Commons photograph URLs', async () => {
    const { isImageFreeToUse } = await import('./image');
    const commonsUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Eurasian_beaver.jpg/1280px-Eurasian_beaver.jpg';
    expect(isImageFreeToUse(commonsUrl)).toBe(true);
  });

  it('should accept Unsplash photo URLs', async () => {
    const { isImageFreeToUse } = await import('./image');
    const unsplashUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&h=675&q=80';
    expect(isImageFreeToUse(unsplashUrl)).toBe(true);
  });

  it('should reject local English Wikipedia non-free/fair-use uploads', async () => {
    const { isImageFreeToUse } = await import('./image');
    const fairUseUrl = 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Promotional_poster.jpg/800px-Promotional_poster.jpg';
    expect(isImageFreeToUse(fairUseUrl)).toBe(false);
  });

  it('should reject vector, diagram, or document formats like .svg and .pdf', async () => {
    const { isImageFreeToUse } = await import('./image');
    const svgUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Diagram_icon.svg/500px-Diagram_icon.svg.png';
    const rawSvg = 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag.svg';
    const pdfUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Document.pdf';
    expect(isImageFreeToUse(svgUrl)).toBe(false);
    expect(isImageFreeToUse(rawSvg)).toBe(false);
    expect(isImageFreeToUse(pdfUrl)).toBe(false);
  });

  it('should reject images with explicit non-free or fair-use metadata', async () => {
    const { isImageFreeToUse } = await import('./image');
    const commonsUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Book_cover.jpg/1280px-Book_cover.jpg';
    expect(isImageFreeToUse(commonsUrl, { nonFree: true })).toBe(false);
    expect(isImageFreeToUse(commonsUrl, { license: 'Fair use' })).toBe(false);
  });
});

describe('scoreImageCandidate', () => {
  const topic = 'Rewilding the UK’s Forgotten River Valleys: The Return of Beavers and Their Ecosystem Impact';

  it('should award a high score (>= 60) to a landscape, high-res authentic beaver image', async () => {
    const { scoreImageCandidate, HIGH_RELEVANCE_THRESHOLD } = await import('./image');
    const candidate = {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Eurasian_beaver.jpg/1280px-Eurasian_beaver.jpg',
      title: 'Eurasian beaver',
      term: 'Eurasian beaver',
      source: 'commons' as const,
      width: 1200,
      height: 800,
      assessment: 'quality'
    };

    const score = scoreImageCandidate(candidate, topic);
    expect(score).toBeGreaterThanOrEqual(HIGH_RELEVANCE_THRESHOLD);
  });

  it('should return 0 for an image that is already in usedImages', async () => {
    const { scoreImageCandidate } = await import('./image');
    const used = new Set(['https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Eurasian_beaver.jpg/1280px-Eurasian_beaver.jpg']);
    const candidate = {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Eurasian_beaver.jpg/1280px-Eurasian_beaver.jpg',
      title: 'Eurasian beaver',
      term: 'Eurasian beaver',
      source: 'commons' as const,
      width: 1200,
      height: 800
    };

    const score = scoreImageCandidate(candidate, topic, used);
    expect(score).toBe(0);
  });

  it('should return 0 for an unfree image', async () => {
    const { scoreImageCandidate } = await import('./image');
    const candidate = {
      url: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/65/Fair_use_beaver.jpg/800px-Fair_use_beaver.jpg',
      title: 'Eurasian beaver',
      term: 'Eurasian beaver',
      source: 'wikipedia' as const,
      width: 1200,
      height: 800
    };

    const score = scoreImageCandidate(candidate, topic);
    expect(score).toBe(0);
  });

  it('should penalize or reject unwanted modifiers like statues or monuments', async () => {
    const { scoreImageCandidate } = await import('./image');
    const normalCandidate = {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Donald_Trump.jpg/1200px-Donald_Trump.jpg',
      title: 'Donald Trump',
      term: 'Donald Trump',
      source: 'wikipedia' as const,
      width: 1200,
      height: 800
    };

    const statueCandidate = {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Donald_Trump_wax_statue.jpg/1200px-Donald_Trump_wax_statue.jpg',
      title: 'Donald Trump wax statue',
      term: 'Donald Trump',
      source: 'commons' as const,
      width: 1200,
      height: 800
    };

    const trumpTopic = 'Trump TV: How the Former US President’s Media Empire Is Shaping British Viewership';
    const normalScore = scoreImageCandidate(normalCandidate, trumpTopic);
    const statueScore = scoreImageCandidate(statueCandidate, trumpTopic);

    expect(normalScore).toBeGreaterThan(statueScore);
    expect(statueScore).toBe(0);
  });

  it('should disqualify impersonators and lookalikes', async () => {
    const { scoreImageCandidate } = await import('./image');
    const candidate = {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Kim_Jong-un_and_Donald_Trump_impersonators.jpg',
      title: 'Kim Jong-un and Donald Trump impersonators',
      term: 'Donald Trump',
      source: 'commons' as const,
      width: 1200,
      height: 800
    };

    const score = scoreImageCandidate(candidate, 'Trump TV: How the Former US President’s Media Empire Is Shaping British Viewership');
    expect(score).toBe(0);
  });
});
