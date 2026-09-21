import 'dotenv/config';
import { db } from '../src/prisma/db';
import { sanitizeHtml } from '../src/lib/utils/content';
import { getTopicImage } from '../src/lib/services/image';

async function main() {
  console.log('🧹 Starting content sanitization script...');
  try {
    const pages = await db.orm.public.Page.all();
    console.log(`Found ${pages.length} total pages in database.`);

    let cleanedCount = 0;
    for (const page of pages) {
      let content = page.content;

      // If the content has a pollinations.ai or source.unsplash.com image or no image, upgrade it with authentic getTopicImage
      const hasPollinations = content.includes('image.pollinations.ai');
      const hasUnsplash = content.includes('source.unsplash.com');
      const hasImg = /<img[^>]+src="([^">]+)"/.test(content);

      if (hasPollinations || hasUnsplash || !hasImg) {
        console.log(`🖼️ Resolving authentic image for: "${page.title}"`);
        const realImg = await getTopicImage(page.title, page.type);
        if (hasImg) {
          content = content.replace(
            /<img[^>]+src="([^">]+)"[^>]*>/,
            `<img src="${realImg}" alt="${page.title}" class="w-full aspect-[16/9] object-cover rounded-2xl shadow-lg mb-8" />`
          );
        } else {
          content = `<img src="${realImg}" alt="${page.title}" class="w-full aspect-[16/9] object-cover rounded-2xl shadow-lg mb-8" />\n` + content;
        }
      }

      const sanitized = sanitizeHtml(content, page.title, page.type);

      if (sanitized !== page.content) {
        console.log(`🧼 Cleaning & updating page: "${page.title}" (${page.slug})`);
        await db.orm.public.Page.where({ id: page.id }).update({
          content: sanitized
        });
        cleanedCount++;
      } else {
        console.log(`✅ Already clean: "${page.title}" (${page.slug})`);
      }
    }

    console.log(`\n🎉 Sanitization complete! ${cleanedCount} pages updated, ${pages.length - cleanedCount} were already clean.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during sanitization:', error);
    process.exit(1);
  }
}

main();
