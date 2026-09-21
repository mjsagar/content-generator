export interface AffiliateProduct {
  title: string;
  badge: string;
  description: string;
  ctaText: string;
  searchQuery: string;
  category: string;
}

export function getContextualProduct(topic: string = '', position: 'top' | 'bottom' = 'top'): AffiliateProduct {
  const lower = topic.toLowerCase();

  // 1. Pets / Dogs / Animals
  if (lower.includes('dog') || lower.includes('cat') || lower.includes('breed') || lower.includes('pet') || lower.includes('puppy') || lower.includes('animal')) {
    if (position === 'top') {
      return {
        title: `Premium Nutrition & Health Essentials for ${cleanTopic(topic)}`,
        badge: "Sponsored • Pet Care",
        description: "Veterinarian-recommended formulas, natural supplements, and tasty treats crafted for optimal health and vitality.",
        ctaText: "Check Best Price on Amazon",
        searchQuery: `${topic} premium food supplements`,
        category: "pet"
      };
    } else {
      return {
        title: `Top-Rated Grooming, Training & Care Gear`,
        badge: "Sponsored • Pet Accessories",
        description: "Keep your companion happy, well-groomed, and active with top-rated toys, durable harnesses, and grooming kits.",
        ctaText: "Explore Top Rated Deals",
        searchQuery: `${topic} grooming training gear`,
        category: "pet"
      };
    }
  }

  // 2. Sports / Athletes / Fitness
  if (lower.includes('messi') || lower.includes('football') || lower.includes('soccer') || lower.includes('nba') || lower.includes('fitness') || lower.includes('workout') || lower.includes('gym') || lower.includes('player')) {
    if (position === 'top') {
      return {
        title: `Official Matchday Apparel & Collector Kits`,
        badge: "Sponsored • Sports Fan Gear",
        description: "Official jerseys, collector memorabilia, and premium athletic apparel for passionate fans and athletes.",
        ctaText: "Shop Official Gear on Amazon",
        searchQuery: `${topic} official jersey gear`,
        category: "sports"
      };
    } else {
      return {
        title: `Pro Training Gear & Performance Equipment`,
        badge: "Sponsored • Athletic Equipment",
        description: "Level up your training routine with premium boots, resistance gear, and professional performance trackers.",
        ctaText: "View Training Equipment",
        searchQuery: `${topic} training equipment workout`,
        category: "sports"
      };
    }
  }

  // 3. Tech / Software / Gaming / Gadgets
  if (lower.includes('tech') || lower.includes('phone') || lower.includes('apple') || lower.includes('ai') || lower.includes('software') || lower.includes('gadget') || lower.includes('laptop') || lower.includes('pc')) {
    if (position === 'top') {
      return {
        title: `Top Tech Accessories & Workstation Upgrades`,
        badge: "Sponsored • Tech Deals",
        description: "Ergonomic peripherals, ultra-fast charging docks, and smart accessories to supercharge your daily workflow.",
        ctaText: "Browse Tech Deals on Amazon",
        searchQuery: `${topic} accessories tech`,
        category: "tech"
      };
    } else {
      return {
        title: `Bestselling Smart Devices & High-Performance Gear`,
        badge: "Sponsored • Gadget Showcase",
        description: "Explore the latest noise-cancelling audio, smart home devices, and portable power solutions.",
        ctaText: "See Today's Deals",
        searchQuery: `${topic} electronics smart devices`,
        category: "tech"
      };
    }
  }

  // 4. Gardening / Plants / Nature
  if (lower.includes('plant') || lower.includes('garden') || lower.includes('flower') || lower.includes('tree') || lower.includes('nature') || lower.includes('bonsai')) {
    if (position === 'top') {
      return {
        title: `Organic Plant Care, Nutrients & Soil Essentials`,
        badge: "Sponsored • Garden & Greenery",
        description: "Specialized potting mixes, slow-release organic fertilizers, and moisture meters for thriving growth.",
        ctaText: "Find Plant Care on Amazon",
        searchQuery: `${topic} plant soil fertilizer care`,
        category: "garden"
      };
    } else {
      return {
        title: `Precision Pruning Tools & Full-Spectrum Grow Lights`,
        badge: "Sponsored • Gardening Tools",
        description: "Durable stainless steel shears, self-watering planters, and indoor grow lights designed for healthy greenery.",
        ctaText: "Shop Gardening Deals",
        searchQuery: `${topic} gardening tools planters`,
        category: "garden"
      };
    }
  }

  // 5. Default / General Trending Topic
  if (position === 'top') {
    return {
      title: `Bestselling Books & Audio Guides on ${cleanTopic(topic)}`,
      badge: "Sponsored • Featured Selection",
      description: `In-depth books, audiobooks, and top-rated guides covering the latest trends, insights, and expert analysis on ${cleanTopic(topic)}.`,
      ctaText: "View on Amazon",
      searchQuery: `${topic} bestselling book guide`,
      category: "general"
    };
  } else {
    return {
      title: `Trending Deals & Top Recommendations Related to ${cleanTopic(topic)}`,
      badge: "Sponsored • Limited Time Offers",
      description: "Discover curated products, popular accessories, and verified top-rated deals with fast delivery options.",
      ctaText: "Check Today's Deals on Amazon",
      searchQuery: `${topic} top rated deals`,
      category: "general"
    };
  }
}

function cleanTopic(topic: string): string {
  if (!topic) return "Trending Topics";
  // Remove trailing guide keywords if too verbose
  return topic.replace(/Care Guide.*$/i, '').replace(/:\s*The Legend.*$/i, '').trim() || topic;
}
