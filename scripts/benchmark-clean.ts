import { db } from '../src/prisma/db';
import { sanitizeHtml } from '../src/lib/utils/content';

async function main() {
  console.log("Seeding database for benchmark...");
  // First, clear existing pages
  const allPages = await db.orm.public.Page.all();
  for (const p of allPages) {
    await db.orm.public.Page.where({ id: p.id }).delete();
  }

  // Seed 100 pages that need cleaning
  const pagesToCreate = [];
  for (let i = 0; i < 500; i++) {
    pagesToCreate.push({
      slug: `benchmark-page-${i}`,
      title: `Benchmark Page ${i}`,
      content: `Content with some unescaped \\n characters that need cleaning ${i}`,
      type: 'trend'
    });
  }

  await Promise.all(pagesToCreate.map(p => db.orm.public.Page.create(p)));

  console.log("Database seeded with 500 pages.");

  // Benchmark the sequential clean (original code behavior)
  const startTime = Date.now();

  const pages = await db.orm.public.Page.all();
  for (const p of pages) {
    const cleaned = sanitizeHtml(p.content, p.title, p.type);
    if (cleaned !== p.content) {
      await db.orm.public.Page.where({ id: p.id }).update({ content: cleaned });
    }
  }

  const endTime = Date.now();
  console.log(`Original sequential clean took: ${endTime - startTime} ms`);
}

main().catch(console.error);
