/**
 * Service for fetching high-quality, authentic, unstretched images for articles and cards.
 * Uses Wikimedia Commons API for instant, real photos, with curated Unsplash CDNs as fallbacks.
 */

const imageCache = new Map<string, string>();

// High quality, direct, fast Unsplash CDN fallbacks by topic category
const CATEGORY_FALLBACKS: Record<string, string> = {
  dog: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&h=675&q=80',
  cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&h=675&q=80',
  animal: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=1200&h=675&q=80',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&h=675&q=80',
  landmark: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=675&q=80',
  nature: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&h=675&q=80',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=675&q=80',
  general: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&h=675&q=80'
};

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
 * Returns a fast, reliable category fallback image based on keywords in title.
 */
export function getTopicFallbackImage(topic: string, type?: string): string {
  const lower = (topic || '').toLowerCase();
  if (lower.includes('dog') || lower.includes('puppy') || lower.includes('breed') || lower.includes('hound') || lower.includes('spaniel')) {
    return CATEGORY_FALLBACKS.dog;
  }
  if (lower.includes('cat') || lower.includes('kitten')) {
    return CATEGORY_FALLBACKS.cat;
  }
  if (lower.includes('fish') || lower.includes('axolotl') || lower.includes('pet') || lower.includes('animal') || lower.includes('bird')) {
    return CATEGORY_FALLBACKS.animal;
  }
  if (lower.includes('football') || lower.includes('baseball') || lower.includes('park') || lower.includes('messi') || lower.includes('stadium') || lower.includes('game') || lower.includes('sport')) {
    return CATEGORY_FALLBACKS.sports;
  }
  if (lower.includes('mansion') || lower.includes('city') || lower.includes('historic') || lower.includes('building') || lower.includes('residence') || lower.includes('nyc')) {
    return CATEGORY_FALLBACKS.landmark;
  }
  if (lower.includes('tech') || lower.includes('app') || lower.includes('ai') || lower.includes('software')) {
    return CATEGORY_FALLBACKS.tech;
  }
  if (type === 'niche') {
    return CATEGORY_FALLBACKS.nature;
  }
  return CATEGORY_FALLBACKS.general;
}

/**
 * Fetches an authentic, unstretched image for a given topic or article title.
 * Queries Wikimedia Commons API, falling back to curated category imagery.
 */
export async function getTopicImage(topicOrTitle: string, type?: string): Promise<string> {
  const cacheKey = `${topicOrTitle.toLowerCase().trim()}:${type || ''}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  const subject = extractCoreSubject(topicOrTitle);
  const searchTerms = [subject, topicOrTitle].filter(Boolean);

  for (const term of searchTerms) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=1&pithumbsize=1200`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ContentHubImageBot/1.0 (info@theinformationhub.uk)'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const thumb = pages[pageId]?.thumbnail?.source;
        if (thumb && typeof thumb === 'string') {
          imageCache.set(cacheKey, thumb);
          return thumb;
        }
      }
    } catch {
      // Continue to next term or fallback
    }
  }

  const fallback = getTopicFallbackImage(topicOrTitle, type);
  imageCache.set(cacheKey, fallback);
  return fallback;
}
