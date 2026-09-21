import 'dotenv/config';
import { db } from '../src/prisma/db';
import { sanitizeHtml } from '../src/lib/utils/content';

async function main() {
  console.log('🧹 Starting content sanitization script...');
  try {
    const pages = await db.orm.public.Page.all();
    console.log(`Found ${pages.length} total pages in database.`);

    let cleanedCount = 0;
    for (const page of pages) {
      const originalContent = page.content;
      const sanitized = sanitizeHtml(originalContent);

      if (sanitized !== originalContent) {
        console.log(`🧼 Cleaning page: "${page.title}" (${page.slug})`);
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
