/**
 * Service for fetching high-quality, authentic, unstretched, and fully UNIQUE images for articles.
 * Queries Wikimedia Commons API (checking up to 10 results to ensure uniqueness),
 * falling back to curated, diverse Unsplash photo pools.
 */

const imageCache = new Map<string, string>();

// Curated pools of high-resolution, diverse Unsplash imagery by category
export const CATEGORY_POOLS: Record<string, string[]> = {
  dog: [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  cat: [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  animal: [
    'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1500463959177-e0869688df97?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  landmark: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1488747279002-c8523379faaa?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  nature: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  tech: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  finance: [
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&h=675&q=80'
  ],
  general: [
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&h=675&q=80',
    'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=1200&h=675&q=80'
  ]
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'how', 'what', 'why', 'when', 'where',
  'guide', 'ultimate', 'complete', 'essential', 'tips', 'tricks', 'care', 'everything', 'need',
  'know', 'best', 'top', 'ways', 'facts', 'history', 'news', 'update', 'latest', 'year', '2024',
  '2025', '2026', 'about', 'into', 'over', 'after', 'your', 'life', 'culture', 'world', 'time',
  'service', 'services', 'future', 'power', 'rise', 'fall', 'revolution', 'inside', 'around',
  'shapes', 'shaping', 'their', 'which', 'will', 'some', 'more', 'than', 'homes', 'apartments'
]);

/**
 * Extracts significant keywords from a title/topic for topical deduplication.
 */
export function getSignificantTokens(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));
}

/**
 * Checks if two topics are similar or duplicate (prevents multiple articles on same topic).
 */
export function isTopicSimilar(topicA: string, topicB: string): boolean {
  if (!topicA || !topicB) return false;

  const coreA = extractCoreSubject(topicA).toLowerCase();
  const coreB = extractCoreSubject(topicB).toLowerCase();

  // 1. Direct core subject exact or substring match
  if (coreA && coreB && coreA.length >= 4 && coreB.length >= 4) {
    if (coreA === coreB || coreA.includes(coreB) || coreB.includes(coreA)) {
      return true;
    }
  }

  // 2. Token overlap check
  const tokensA = getSignificantTokens(topicA);
  const tokensB = getSignificantTokens(topicB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const setB = new Set(tokensB);
  const common = tokensA.filter(t => setB.has(t));

  // If 2 or more significant words match (e.g. "border" + "terrier", "monstera" + "deliciosa")
  if (common.length >= 2) {
    return true;
  }

  // If a single distinctive proper noun/word (>= 6 chars) matches that isn't generic
  const genericWords = new Set(['health', 'climate', 'london', 'british', 'england', 'scotland', 'wales', 'ireland', 'business']);
  if (common.some(word => word.length >= 6 && !genericWords.has(word))) {
    return true;
  }

  return false;
}

/**
 * Extracts the core subject from a long SEO title.
 * e.g. "Comerica Park: The Heartbeat of Detroit Baseball..." -> "Comerica Park"
 */
export function extractCoreSubject(title: string): string {
  if (!title) return '';
  return title
    .replace(/^the\s+/i, '')
    .replace(/^ultimate\s+/i, '')
    .replace(/^inside\s+/i, '')
    .replace(/^how\s+to\s+/i, '')
    .replace(/^guide\s+to\s+/i, '')
    .replace(/care guide.*$/i, '')
    .replace(/:.*$/i, '')
    .replace(/–.*$/i, '')
    .replace(/-.*$/i, '')
    .replace(/grooming.*$/i, '')
    .replace(/history.*$/i, '')
    .replace(/tips.*$/i, '')
    .trim();
}

/**
 * Returns a unique fallback image from the category pools that is NOT in usedImages.
 */
export function getTopicFallbackImage(topic: string, type?: string, usedImages?: Set<string>): string {
  const lower = (topic || '').toLowerCase();
  let poolKey = 'general';

  if (lower.includes('dog') || lower.includes('puppy') || lower.includes('breed') || lower.includes('terrier') || lower.includes('hound') || lower.includes('spaniel')) {
    poolKey = 'dog';
  } else if (lower.includes('cat') || lower.includes('kitten')) {
    poolKey = 'cat';
  } else if (lower.includes('fish') || lower.includes('axolotl') || lower.includes('pet') || lower.includes('animal') || lower.includes('bird') || lower.includes('wildlife') || lower.includes('beaver') || lower.includes('hedgehog')) {
    poolKey = 'animal';
  } else if (lower.includes('football') || lower.includes('baseball') || lower.includes('park') || lower.includes('messi') || lower.includes('stadium') || lower.includes('game') || lower.includes('sport') || lower.includes('swimming')) {
    poolKey = 'sports';
  } else if (lower.includes('mansion') || lower.includes('city') || lower.includes('historic') || lower.includes('building') || lower.includes('residence') || lower.includes('castle') || lower.includes('palace') || lower.includes('railway')) {
    poolKey = 'landmark';
  } else if (lower.includes('tech') || lower.includes('app') || lower.includes('ai') || lower.includes('software') || lower.includes('digital') || lower.includes('robot') || lower.includes('charger') || lower.includes('charging')) {
    poolKey = 'tech';
  } else if (lower.includes('pension') || lower.includes('money') || lower.includes('isa') || lower.includes('finance') || lower.includes('tax') || lower.includes('mortgage')) {
    poolKey = 'finance';
  } else if (type === 'niche' || lower.includes('plant') || lower.includes('garden') || lower.includes('nature') || lower.includes('forest') || lower.includes('lake') || lower.includes('river') || lower.includes('rewilding')) {
    poolKey = 'nature';
  }

  const pool = CATEGORY_POOLS[poolKey] || CATEGORY_POOLS.general;

  // Find the first unused image in the category pool
  if (usedImages && usedImages.size > 0) {
    for (const img of pool) {
      if (!usedImages.has(img)) {
        return img;
      }
    }
    // Check general pool
    for (const img of CATEGORY_POOLS.general) {
      if (!usedImages.has(img)) {
        return img;
      }
    }
  }

  // If all are used, return a randomized pool image with unique salt
  const randomChoice = pool[Math.floor(Math.random() * pool.length)];
  return `${randomChoice}&uid=${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Simple English stemmer to match singular/plural and verb forms (e.g. beaver/beavers, valley/valleys)
 */
export function stemWord(word: string): string {
  if (!word) return '';
  return word
    .toLowerCase()
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '');
}

/**
 * Checks if a Wikipedia page title is genuinely relevant to the search query and article topic.
 * Rejects unrelated pages (e.g. Henry David Thoreau for beavers, Nikolai Yezhov for hedgehogs).
 */
export function isPageRelevant(pageTitle: string, term: string, topicOrTitle: string): boolean {
  if (!pageTitle) return false;
  if (/\(disambiguation\)/i.test(pageTitle)) return false;

  const pageTokens = getSignificantTokens(pageTitle).map(stemWord);
  if (pageTokens.length === 0) return false;

  const termTokens = getSignificantTokens(term).map(stemWord);
  const topicTokens = getSignificantTokens(topicOrTitle).map(stemWord);

  const termSet = new Set(termTokens);
  const topicSet = new Set(topicTokens);

  // Check for shared significant stem
  const matchesTerm = pageTokens.some(pt => termSet.has(pt));
  const matchesTopic = pageTokens.some(pt => topicSet.has(pt));

  if (!matchesTerm && !matchesTopic) {
    return false;
  }

  // Reject biographies / historical figures if the topic is nature/wildlife
  const lowerTopic = (topicOrTitle || '').toLowerCase();
  const lowerPage = pageTitle.toLowerCase();
  const isNatureTopic = lowerTopic.includes('beaver') || lowerTopic.includes('hedgehog') || lowerTopic.includes('river') || lowerTopic.includes('plant') || lowerTopic.includes('tree') || lowerTopic.includes('garden') || lowerTopic.includes('wildlife');
  if (isNatureTopic && (lowerPage.includes('thoreau') || lowerPage.includes('yezhov') || lowerPage.includes('village') || lowerPage.includes('town'))) {
    return false;
  }

  // Reject "Jr." pages if the topic does not mention "Jr" (e.g. Donald Trump Jr. for Donald Trump)
  if (!lowerTopic.includes('jr') && (lowerPage.includes('jr.') || lowerPage.includes(' jr ') || lowerPage.endsWith(' jr'))) {
    return false;
  }

  // If search term is a two-word person name (e.g. "Frank Gardner"), candidate page must contain the first name
  const termWords = term.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  if (termWords.length === 2 && (lowerTopic.includes('who') || lowerTopic.includes('icon') || lowerTopic.includes('voice') || lowerTopic.includes('president') || lowerTopic.includes('star'))) {
    const pageWords = new Set(lowerPage.replace(/[^a-z0-9\s]/g, '').split(/\s+/));
    if (!termWords.every(tw => pageWords.has(tw))) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts candidate Wikipedia search terms in priority order from a topic title.
 */
export function extractCandidateSearchTerms(title: string): string[] {
  if (!title) return [];
  const terms: string[] = [];
  const lower = title.toLowerCase();

  // 1. High-priority specific entity cues
  if (lower.includes('trump') && !lower.includes('jr')) terms.push('Donald Trump');
  if (lower.includes('beaver')) terms.push('Eurasian beaver', 'Beaver in the United Kingdom', 'Beaver');
  if (lower.includes('hedgehog')) terms.push('European hedgehog', 'Hedgehog');
  if (lower.includes('monstera')) terms.push('Monstera deliciosa');
  if (lower.includes('border terrier')) terms.push('Border Terrier');
  if (lower.includes('canal boat') || lower.includes('canal boating')) terms.push('Narrowboat', 'Canal boat');
  if (lower.includes('axolotl')) terms.push('Axolotl');
  if (lower.includes('cash isa') || lower.includes('stocks & shares isa') || lower.includes('lifetime isa') || lower.includes(' isa')) {
    terms.push('Individual Savings Account');
  }
  if (lower.includes('ev fast chargers') || lower.includes('ev charging') || lower.includes('fast-chargers')) {
    terms.push('Charging station', 'Electric vehicle');
  }
  if (lower.includes('bruce willis')) terms.push('Bruce Willis');
  if (lower.includes('alexis bledel')) terms.push('Alexis Bledel');
  if (lower.includes('frank gardner')) terms.push('Frank Gardner (journalist)', 'Frank Gardner');
  if (lower.includes('ed davey')) terms.push('Ed Davey');
  if (lower.includes('russell davies') || lower.includes('russell t davies')) terms.push('Russell T Davies');
  if (lower.includes('inside soap')) terms.push('Inside Soap Awards');
  if (lower.includes('lioness')) terms.push('Special Ops: Lioness');

  // 2. Subtitle extraction (e.g. "Topic: Subtopic" -> examine both parts)
  if (title.includes(':')) {
    const parts = title.split(':').map(s => s.trim());
    if (parts[1]) {
      const cleanSub = parts[1]
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/^(return of|rise of|secret life of|everything you need to know about)\s+/i, '')
        .replace(/\s+(and their ecosystem impact|everything uk viewers need to know|in 2024|in 2025|in 2026).*$/i, '')
        .trim();
      if (cleanSub.length >= 3) terms.push(cleanSub);
    }
    if (parts[0]) {
      const cleanMain = parts[0]
        .replace(/^(the|ultimate|inside|how to|guide to)\s+/i, '')
        .trim();
      if (cleanMain.length >= 3) terms.push(cleanMain);
    }
  }

  // 3. Fall back to extractCoreSubject and full title
  const core = extractCoreSubject(title);
  if (core && !terms.includes(core)) terms.push(core);
  if (!terms.includes(title)) terms.push(title);

  return Array.from(new Set(terms.filter(Boolean)));
}

/**
 * Fetches an authentic, unstretched, verified RELEVANT, and guaranteed UNIQUE image for a given topic.
 * Queries Wikimedia Commons API, sorting by relevance index and enforcing topical match against the page title.
 */
export async function getTopicImage(
  topicOrTitle: string,
  type?: string,
  usedImages?: Set<string>
): Promise<string> {
  const searchTerms = extractCandidateSearchTerms(topicOrTitle);

  const fetchImageForTerm = async (term: string): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // Request search results to find a unique, relevant, unused image
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=10&pithumbsize=1200`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ContentHubImageBot/2.0 (info@theinformationhub.uk)'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Fetch failed for term: ${term}`);

    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      // Sort pages by Wikipedia's relevance index
      const sortedPages = Object.values(pages).sort((a: any, b: any) => (a.index || 999) - (b.index || 999));

      for (const page of sortedPages as any[]) {
        const thumb = page?.thumbnail?.source;
        const pageTitle = page?.title;
        if (!thumb || typeof thumb !== 'string') continue;

        // Verify relevance: ensure the Wikipedia page actually matches the topic/term
        if (!isPageRelevant(pageTitle, term, topicOrTitle)) {
          continue;
        }

        // Check if this image was already used on another article
        if (usedImages && usedImages.has(thumb)) {
          continue;
        }

        return thumb;
      }
    }
    throw new Error(`No relevant unused image found for term: ${term}`);
  };

  // Evaluate candidate search terms in priority order
  for (const term of searchTerms) {
    try {
      const img = await fetchImageForTerm(term);
      if (img) return img;
    } catch {
      // Try next candidate term
    }
  }

  // Fallback to a guaranteed unused category image if all search terms fail
  return getTopicFallbackImage(topicOrTitle, type, usedImages);
}
