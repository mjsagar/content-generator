import { describe, it, expect } from 'vitest';
import { getTopicFallbackImage, CATEGORY_POOLS } from '../image';

describe('getTopicFallbackImage', () => {
  it('should return a dog image if topic includes dog-related keywords', () => {
    const topic = 'How to train your puppy';
    const result = getTopicFallbackImage(topic);

    // We expect the result to start with one of the dog images, before the optional random salt
    const isDogImage = CATEGORY_POOLS.dog.some(img => result.startsWith(img));
    expect(isDogImage).toBe(true);
  });

  it('should return a cat image if topic includes cat-related keywords', () => {
    const topic = 'The best food for a kitten';
    const result = getTopicFallbackImage(topic);

    const isCatImage = CATEGORY_POOLS.cat.some(img => result.startsWith(img));
    expect(isCatImage).toBe(true);
  });

  it('should return an animal image if topic includes animal-related keywords', () => {
    const topic = 'Fascinating wildlife photography';
    const result = getTopicFallbackImage(topic);

    const isAnimalImage = CATEGORY_POOLS.animal.some(img => result.startsWith(img));
    expect(isAnimalImage).toBe(true);
  });

  it('should return a sports image if topic includes sports-related keywords', () => {
    const topic = 'The history of baseball';
    const result = getTopicFallbackImage(topic);

    const isSportsImage = CATEGORY_POOLS.sports.some(img => result.startsWith(img));
    expect(isSportsImage).toBe(true);
  });

  it('should return a landmark image if topic includes landmark-related keywords', () => {
    const topic = 'Visiting the historic castle';
    const result = getTopicFallbackImage(topic);

    const isLandmarkImage = CATEGORY_POOLS.landmark.some(img => result.startsWith(img));
    expect(isLandmarkImage).toBe(true);
  });

  it('should return a tech image if topic includes tech-related keywords', () => {
    const topic = 'The future of AI and software';
    const result = getTopicFallbackImage(topic);

    const isTechImage = CATEGORY_POOLS.tech.some(img => result.startsWith(img));
    expect(isTechImage).toBe(true);
  });

  it('should return a finance image if topic includes finance-related keywords', () => {
    const topic = 'Understanding your tax and pension';
    const result = getTopicFallbackImage(topic);

    const isFinanceImage = CATEGORY_POOLS.finance.some(img => result.startsWith(img));
    expect(isFinanceImage).toBe(true);
  });

  it('should return a nature image if topic includes nature-related keywords', () => {
    const topic = 'A walk through the forest';
    const result = getTopicFallbackImage(topic);

    const isNatureImage = CATEGORY_POOLS.nature.some(img => result.startsWith(img));
    expect(isNatureImage).toBe(true);
  });

  it('should return a nature image if type is "niche"', () => {
    const topic = 'Something completely unrelated';
    const result = getTopicFallbackImage(topic, 'niche');

    const isNatureImage = CATEGORY_POOLS.nature.some(img => result.startsWith(img));
    expect(isNatureImage).toBe(true);
  });

  it('should return a general image if no keywords match', () => {
    const topic = 'Something completely generic';
    const result = getTopicFallbackImage(topic);

    const isGeneralImage = CATEGORY_POOLS.general.some(img => result.startsWith(img));
    expect(isGeneralImage).toBe(true);
  });

  it('should handle empty or null topics gracefully and return a general image', () => {
    // @ts-ignore - testing invalid input
    const resultNull = getTopicFallbackImage(null);
    const resultEmpty = getTopicFallbackImage('');

    const isGeneralImageNull = CATEGORY_POOLS.general.some(img => resultNull.startsWith(img));
    const isGeneralImageEmpty = CATEGORY_POOLS.general.some(img => resultEmpty.startsWith(img));

    expect(isGeneralImageNull).toBe(true);
    expect(isGeneralImageEmpty).toBe(true);
  });

  it('should avoid returning an image in the usedImages set if another is available', () => {
    const topic = 'dog training';

    // Create a set with all dog images EXCEPT the last one
    const usedImages = new Set<string>();
    for (let i = 0; i < CATEGORY_POOLS.dog.length - 1; i++) {
      usedImages.add(CATEGORY_POOLS.dog[i]);
    }

    const result = getTopicFallbackImage(topic, undefined, usedImages);

    // It should pick the last available image in the dog pool
    expect(result).toBe(CATEGORY_POOLS.dog[CATEGORY_POOLS.dog.length - 1]);
  });

  it('should fallback to general pool if all images in the category pool are used', () => {
    const topic = 'dog training';

    // Create a set with ALL dog images
    const usedImages = new Set<string>([...CATEGORY_POOLS.dog]);

    const result = getTopicFallbackImage(topic, undefined, usedImages);

    // It should pick an image from the general pool
    const isGeneralImage = CATEGORY_POOLS.general.some(img => result.startsWith(img));
    expect(isGeneralImage).toBe(true);
    // And it should not have picked a dog image, since they were all used (without salt fallback logic triggering)
    // Wait, the logic falls back to general pool. If general pool has an unused image, it returns it EXACTLY.
    expect(CATEGORY_POOLS.general.includes(result)).toBe(true);
  });

  it('should append a random uid salt if all images in the category and general pool are used', () => {
    const topic = 'dog training';

    // Create a set with ALL dog images and ALL general images
    const usedImages = new Set<string>([...CATEGORY_POOLS.dog, ...CATEGORY_POOLS.general]);

    const result = getTopicFallbackImage(topic, undefined, usedImages);

    // It should pick a random dog image and append a salt
    const isDogImage = CATEGORY_POOLS.dog.some(img => result.startsWith(img));
    expect(isDogImage).toBe(true);

    // It should have the salt appended
    expect(result).toMatch(/&uid=[a-z0-9]{6}$/);
  });
});
