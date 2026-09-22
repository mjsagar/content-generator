/**
 * Editorial category definitions, metadata, and automated classification engine.
 */

export interface CategoryMeta {
  id: string;
  name: string;
  slug: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  description: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'wildlife-nature',
    name: 'Wildlife & Nature',
    slug: 'wildlife-nature',
    icon: '🌿',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    description: 'British wildlife conservation, native flora and fauna, rewilding, and natural habitats.'
  },
  {
    id: 'personal-finance',
    name: 'Personal Finance',
    slug: 'personal-finance',
    icon: '💷',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    description: 'ISAs, pensions, tax relief, savings strategies, and UK economic analysis.'
  },
  {
    id: 'heritage-travel',
    name: 'Heritage & Travel',
    slug: 'heritage-travel',
    icon: '🏛️',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
    badgeText: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    description: 'Historic landmarks, scenic routes, British architecture, canals, and heritage.'
  },
  {
    id: 'home-garden',
    name: 'Home & Garden',
    slug: 'home-garden',
    icon: '🏡',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeText: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    description: 'Allotments, gardening, indoor horticulture, energy grants, and home living.'
  },
  {
    id: 'tech-innovation',
    name: 'Tech & Innovation',
    slug: 'tech-innovation',
    icon: '⚡',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/40',
    badgeText: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    description: 'UK technology, clean energy, EV charging infrastructure, AI, and transport.'
  },
  {
    id: 'sports-culture',
    name: 'Sports & Culture',
    slug: 'sports-culture',
    icon: '⚽',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    description: 'British sports, iconic figures, performing arts, and entertainment.'
  },
  {
    id: 'news-society',
    name: 'News & Society',
    slug: 'news-society',
    icon: '📰',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    description: 'Current affairs, government policy, media analysis, and cultural conversations.'
  },
  {
    id: 'general',
    name: 'General',
    slug: 'general',
    icon: '✨',
    badgeBg: 'bg-slate-50 dark:bg-slate-900/40',
    badgeText: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
    description: 'Insightful guides and editorial features on British lifestyle and trends.'
  }
];

export const CATEGORY_NAMES = CATEGORIES.map(c => c.name);

/**
 * Returns metadata for a category name, falling back to General.
 */
export function getCategoryMeta(name?: string | null): CategoryMeta {
  if (!name) return CATEGORIES[CATEGORIES.length - 1]; // General
  const lower = name.toLowerCase().trim();
  const matched = CATEGORIES.find(
    c => c.name.toLowerCase() === lower || c.slug === lower || c.id === lower
  );
  return matched || CATEGORIES[CATEGORIES.length - 1];
}

/**
 * Infers an accurate editorial category for an article based on title and content keywords.
 */
export function inferArticleCategory(title: string, content: string = ''): string {
  const text = `${title} ${content.slice(0, 1500)}`.toLowerCase();

  // 1. Wildlife & Nature
  if (
    text.includes('beaver') ||
    text.includes('hedgehog') ||
    text.includes('axolotl') ||
    text.includes('wildlife') ||
    text.includes('rewilding') ||
    text.includes('biodiversity') ||
    text.includes('conservation') ||
    text.includes('ecosystem') ||
    text.includes('corridor') ||
    text.includes('river valley') ||
    text.includes('species') ||
    text.includes('hound') ||
    text.includes('terrier') ||
    text.includes('spaniel') ||
    text.includes('puppy') ||
    text.includes('kitten') ||
    text.includes('poodle') ||
    text.includes('dog breed') ||
    text.includes('cat breed')
  ) {
    return 'Wildlife & Nature';
  }

  // 2. Personal Finance
  if (
    text.includes('isa') ||
    text.includes('pension') ||
    text.includes('mortgage') ||
    text.includes('savings') ||
    text.includes('tax relief') ||
    text.includes('hmrc') ||
    text.includes('premium bonds') ||
    text.includes('interest rate') ||
    text.includes('bank of england') ||
    text.includes('cost of living') ||
    text.includes('financial planning')
  ) {
    return 'Personal Finance';
  }

  // 3. Home & Garden
  if (
    text.includes('monstera') ||
    text.includes('allotment') ||
    text.includes('gardening') ||
    text.includes('houseplant') ||
    text.includes('indoor plant') ||
    text.includes('soil') ||
    text.includes('pruning') ||
    text.includes('compost') ||
    text.includes('heat pump') ||
    text.includes('insulation') ||
    text.includes('damp proofing') ||
    text.includes('victorian house')
  ) {
    return 'Home & Garden';
  }

  // 4. Sports & Culture (specific sports, stadiums, clubs, matches)
  if (
    text.includes('baseball') ||
    text.includes('football') ||
    text.includes('premier league') ||
    text.includes('ballpark') ||
    text.includes('stadium') ||
    text.includes('messi') ||
    text.includes('bruce willis') ||
    text.includes('alexis bledel') ||
    text.includes('russell t davies') ||
    text.includes('inside soap') ||
    text.includes('lioness') ||
    text.includes('theatre') ||
    text.includes('music festival') ||
    text.includes('concert tour')
  ) {
    return 'Sports & Culture';
  }

  // 5. Heritage & Travel
  if (
    text.includes('canal boat') ||
    text.includes('narrowboat') ||
    text.includes('mansion') ||
    text.includes('castle') ||
    text.includes('palace') ||
    text.includes('scenic') ||
    text.includes('coastal walk') ||
    text.includes('jurassic coast') ||
    text.includes('snowdonia') ||
    text.includes('historic estate') ||
    text.includes('heritage railway') ||
    text.includes('gracie mansion') ||
    text.includes('architecture')
  ) {
    return 'Heritage & Travel';
  }

  // 6. Tech & Innovation
  if (
    text.includes('ev charger') ||
    text.includes('ev charging') ||
    text.includes('electric vehicle') ||
    text.includes('quantum computing') ||
    text.includes('offshore wind') ||
    text.includes('green energy') ||
    text.includes('battery storage') ||
    text.includes('artificial intelligence') ||
    text.includes('software') ||
    text.includes('digital infrastructure')
  ) {
    return 'Tech & Innovation';
  }

  // 7. News & Society / Politics
  if (
    text.includes('trump') ||
    text.includes('presidency') ||
    text.includes('starmer') ||
    text.includes('ed davey') ||
    text.includes('parliament') ||
    text.includes('westminster') ||
    text.includes('election') ||
    text.includes('viewership') ||
    text.includes('broadcasting') ||
    text.includes('media empire') ||
    text.includes('frank gardner') ||
    text.includes('bbc')
  ) {
    return 'News & Society';
  }

  return 'General';
}
